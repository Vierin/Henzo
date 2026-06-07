import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../models/training_location_item.dart';
import '../../services/auth_service.dart';
import '../../services/cache/bookings_cache.dart';
import '../../services/cache/owner_sessions_cache.dart';
import '../../services/cache/studio_cache.dart';
import '../../services/dashboard_api_service.dart'
    show DashboardApiService, OwnerTrainingSession;
import '../../utils/owner_session_card_subtitle.dart';
import '../../utils/show_api_error.dart';
import '../../utils/synthetic_guest.dart';
import '../common/henzo_modal.dart';
import '../dashboard/owner_daily_schedule_session_card.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class ClientBookTarget {
  const ClientBookTarget({
    required this.displayName,
    this.userId,
    this.email,
    this.phone,
    this.isBlocked = false,
  });

  final String displayName;
  final String? userId;
  final String? email;
  final String? phone;
  final bool isBlocked;

  bool get canBook {
    if (isBlocked) return false;
    if (isSyntheticGuestEmail(email) ||
        isAnonymousRosterClient(email: email, name: displayName)) {
      return false;
    }
    final uid = userId?.trim();
    if (uid != null && uid.isNotEmpty) return true;
    final mail = email?.trim() ?? '';
    final name = displayName.trim();
    return name.isNotEmpty &&
        mail.isNotEmpty &&
        RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(mail);
  }
}

String _emailLocale(LocaleProvider loc) {
  final c = loc.localeCode;
  if (c == 'vi' || c == 'en' || c == 'ru') return c;
  return 'en';
}

bool _isBookableSession(OwnerTrainingSession session, DateTime now) {
  if (session.status == 'CANCELLED' || session.status == 'COMPLETED') {
    return false;
  }
  if (!session.endsAt.isAfter(now)) return false;
  if (session.capacity > 0 && session.enrolledCount >= session.capacity) {
    return false;
  }
  return true;
}

Future<bool?> showBookClientSessionSheet(
  BuildContext context, {
  required ClientBookTarget client,
}) async {
  return showHenzoModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetCtx) => _BookClientSessionSheet(client: client),
  );
}

class _BookClientSessionSheet extends StatefulWidget {
  const _BookClientSessionSheet({required this.client});

  final ClientBookTarget client;

  @override
  State<_BookClientSessionSheet> createState() =>
      _BookClientSessionSheetState();
}

class _BookClientSessionSheetState extends State<_BookClientSessionSheet> {
  List<OwnerTrainingSession> _sessions = const [];
  var _loading = true;
  String? _loadError;
  var _enrollingSessionId = '';
  var _sendConfirmation = true;

  @override
  void initState() {
    super.initState();
    _loadSessions();
  }

  Future<void> _loadSessions() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      setState(() {
        _loading = false;
        _loadError = 'auth';
      });
      return;
    }

    setState(() {
      _loading = true;
      _loadError = null;
    });

    try {
      final now = DateTime.now();
      final to = now.add(const Duration(days: 30));
      final list = await context.read<OwnerSessionsCache>().getSessions(
        token,
        fromUtc: now.toUtc(),
        toUtc: to.toUtc(),
      );
      if (!mounted) return;
      final bookable = list.where((s) => _isBookableSession(s, now)).toList()
        ..sort((a, b) => a.startsAt.compareTo(b.startsAt));
      setState(() {
        _sessions = bookable;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _loadError = e.toString();
      });
    }
  }

  Future<void> _enroll(OwnerTrainingSession session) async {
    if (_enrollingSessionId.isNotEmpty) return;
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;

    final locale = context.read<LocaleProvider>();
    final tr = locale.t;
    final messenger = ScaffoldMessenger.maybeOf(context);

    setState(() => _enrollingSessionId = session.sessionId);
    try {
      final uid = widget.client.userId?.trim();
      if (uid != null && uid.isNotEmpty) {
        await DashboardApiService.addOwnerSessionEnrollment(
          token,
          session.sessionId,
          userId: uid,
          sendConfirmationEmail: _sendConfirmation,
          locale: _emailLocale(locale),
        );
      } else {
        await DashboardApiService.addOwnerSessionEnrollment(
          token,
          session.sessionId,
          name: widget.client.displayName.trim(),
          email: widget.client.email!.trim(),
          phone: widget.client.phone?.trim(),
          sendConfirmationEmail: _sendConfirmation,
          locale: _emailLocale(locale),
        );
      }

      if (!mounted) return;
      context.read<OwnerSessionsCache>().invalidate();
      context.read<BookingsCache>().invalidate();
      messenger?.showSnackBar(
        SnackBar(content: Text(tr('ownerSession.participantAdded'))),
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      showApiError(context, e);
    } finally {
      if (mounted) setState(() => _enrollingSessionId = '');
    }
  }

  List<TrainingLocationItem> _studioLocations(String Function(String) tr) {
    final studio = context.read<StudioCache>().studio;
    if (studio == null) return const [];
    return TrainingLocationItem.listFromStudio(
      studio,
      mainStudioName: tr('locations.mainStudio'),
    );
  }

  String? _ownerTrainerFallback(AuthService auth) {
    final u = auth.user;
    if (u == null) return null;
    final name = u.name?.trim();
    if (name != null && name.isNotEmpty) return name;
    final email = u.email.trim();
    return email.isNotEmpty ? email : null;
  }

  @override
  Widget build(BuildContext context) {
    final tr = context.watch<LocaleProvider>().t;
    final auth = context.watch<AuthService>();
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    final maxH = MediaQuery.sizeOf(context).height * 0.88;
    final ownerFallback = _ownerTrainerFallback(auth);
    final locations = _studioLocations(tr);

    return SafeArea(
      top: false,
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 8, 16, 16 + bottom),
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: maxH),
          child: _SheetChrome(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            tr('ownerClient.bookSessionTitle'),
                            style: _sheetTitleStyle,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            tr('ownerClient.bookSessionSubtitle').replaceAll(
                              '{name}',
                              widget.client.displayName.trim(),
                            ),
                            style: TextStyle(
                              fontSize: 14.sp,
                              color: AppColors.textSecondary,
                              height: 1.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(
                        minWidth: 32,
                        minHeight: 32,
                      ),
                      onPressed: _enrollingSessionId.isNotEmpty
                          ? null
                          : () => Navigator.of(context).pop(),
                      icon: const Icon(
                        Icons.close,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    tr('ownerClient.sendConfirmationEmail'),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  value: _sendConfirmation,
                  onChanged: _enrollingSessionId.isNotEmpty
                      ? null
                      : (v) => setState(() => _sendConfirmation = v),
                ),
                const SizedBox(height: 4),
                Flexible(
                  child: _buildBody(
                    tr,
                    ownerFallback: ownerFallback,
                    locations: locations,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBody(
    String Function(String) tr, {
    required String? ownerFallback,
    required List<TrainingLocationItem> locations,
  }) {
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 32),
        child: Center(
          child: CircularProgressIndicator(color: AppColors.primary500),
        ),
      );
    }

    if (_loadError != null) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Text(
          tr('common.loadFailed'),
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textSecondary, fontSize: 14.sp),
        ),
      );
    }

    if (_sessions.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Column(
          children: [
            Text(
              tr('ownerClient.bookSessionEmpty'),
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 15.sp,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              tr('ownerClient.bookSessionEmptyHint'),
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14.sp,
                color: AppColors.textSecondary,
                height: 1.35,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      shrinkWrap: true,
      itemCount: _sessions.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final session = _sessions[index];
        final isEnrolling = _enrollingSessionId == session.sessionId;
        final sub = resolveOwnerSessionCardSubtitle(
          session: session,
          studioLocations: locations,
          ownerTrainerFallback: ownerFallback,
        );
        final rows = layoutOwnerSessionCardRows(
          session: session,
          subtitleLabel: sub.label,
          showLocationPin: sub.showLocationPin,
          ownerTrainerFallback: ownerFallback,
        );
        return OwnerDailyScheduleSessionCard(
          session: session,
          subtitleLabel: rows.subtitleLabel,
          showLocationPin: rows.showLocationPin,
          showSubtitleLeadingIcon: rows.showSubtitleLeadingIcon,
          trainerLine: rows.trainerLine,
          showDateAboveTime: true,
          dimPastSessions: false,
          bookActionLabel: tr('booking.book'),
          bookActionLoading: isEnrolling,
          onBookAgain: _enrollingSessionId.isEmpty
              ? () => _enroll(session)
              : null,
          onTap: _enrollingSessionId.isEmpty
              ? () => _enroll(session)
              : () {},
        );
      },
    );
  }
}

class _SheetChrome extends StatelessWidget {
  const _SheetChrome({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.borderPrimary),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 16,
            offset: Offset(0, 6),
          ),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
      child: child,
    );
  }
}

final TextStyle _sheetTitleStyle = TextStyle(
  fontSize: 18.sp,
  fontWeight: FontWeight.w800,
  color: AppColors.textPrimary,
);
