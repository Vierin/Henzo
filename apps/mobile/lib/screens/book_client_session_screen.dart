import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../models/training_location_item.dart';
import '../services/auth_service.dart';
import '../services/cache/bookings_cache.dart';
import '../services/cache/owner_sessions_cache.dart';
import '../services/cache/studio_cache.dart';
import '../services/dashboard_api_service.dart'
    show DashboardApiService, OwnerTrainingSession;
import '../utils/load_error_message.dart';
import '../utils/owner_session_card_subtitle.dart';
import '../utils/show_api_error.dart';
import '../utils/synthetic_guest.dart';
import '../widgets/common/app_app_bar.dart';
import '../widgets/dashboard/owner_daily_schedule_session_card.dart';
import '../widgets/schedule_style_date_picker.dart';
import '../widgets/training/training_filter_chip.dart';
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

/// Opens the full-page "Book a class" flow for an owner enrolling a client.
/// Returns `true` when the client was enrolled into a session.
Future<bool?> showBookClientSessionScreen(
  BuildContext context, {
  required ClientBookTarget client,
}) {
  return Navigator.of(context).push<bool>(
    MaterialPageRoute(
      builder: (_) => BookClientSessionScreen(client: client),
    ),
  );
}

class BookClientSessionScreen extends StatefulWidget {
  const BookClientSessionScreen({super.key, required this.client});

  final ClientBookTarget client;

  @override
  State<BookClientSessionScreen> createState() =>
      _BookClientSessionScreenState();
}

class _BookClientSessionScreenState extends State<BookClientSessionScreen> {
  List<OwnerTrainingSession> _sessions = const [];
  var _loading = true;
  String? _loadError;
  var _enrollingSessionId = '';
  var _sendConfirmation = true;

  String? _selectedCategory;
  DateTime? _selectedDay;

  static const _windowDays = 30;

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
      final to = now.add(const Duration(days: _windowDays));
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
        _loadError = loadErrorMessage(context.read<LocaleProvider>(), e);
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

  /// Distinct category labels present in the loaded sessions, sorted.
  List<String> _categories(String localeCode) {
    final set = <String>{};
    for (final s in _sessions) {
      final label = s.categoryLabelForLocale(localeCode)?.trim();
      if (label != null && label.isNotEmpty) set.add(label);
    }
    final list = set.toList()..sort();
    return list;
  }

  List<OwnerTrainingSession> _filteredSessions(String localeCode) {
    return _sessions.where((s) {
      if (_selectedCategory != null) {
        final label = s.categoryLabelForLocale(localeCode)?.trim();
        if (label != _selectedCategory) return false;
      }
      final day = _selectedDay;
      if (day != null) {
        final start = s.startsAt.toLocal();
        if (start.year != day.year ||
            start.month != day.month ||
            start.day != day.day) {
          return false;
        }
      }
      return true;
    }).toList();
  }

  Future<void> _pickDay() async {
    final now = DateTime.now();
    final picked = await showScheduleStyleDatePicker(
      context: context,
      initialDate: _selectedDay ?? now,
      firstDate: now,
      lastDate: now.add(const Duration(days: _windowDays)),
    );
    if (!mounted || picked == null) return;
    setState(() => _selectedDay = DateTime(picked.year, picked.month, picked.day));
  }

  @override
  Widget build(BuildContext context) {
    final tr = context.watch<LocaleProvider>().t;
    final localeCode = context.watch<LocaleProvider>().localeCode;

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppAppBar(
        title: tr('ownerClient.bookSessionTitle'),
        actions: [
          IconButton(
            tooltip: tr('ownerClient.bookSessionTitle'),
            onPressed: _enrollingSessionId.isNotEmpty ? null : _pickDay,
            icon: Icon(
              _selectedDay != null
                  ? Icons.event_available
                  : Icons.calendar_today_outlined,
              color: _selectedDay != null
                  ? AppColors.primary500
                  : AppColors.textPrimary,
            ),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Text(
                tr('ownerClient.bookSessionSubtitle')
                    .replaceAll('{name}', widget.client.displayName.trim()),
                style: TextStyle(
                  fontSize: 14.sp,
                  color: AppColors.textSecondary,
                  height: 1.3,
                ),
              ),
            ),
            const SizedBox(height: 12),
            _buildFilterPills(tr, localeCode),
            if (_selectedDay != null) _buildSelectedDayChip(localeCode),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: SwitchListTile(
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
            ),
            const SizedBox(height: 4),
            Expanded(child: _buildBody(tr, localeCode)),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterPills(String Function(String) tr, String localeCode) {
    final categories = _categories(localeCode);
    if (categories.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          TrainingFilterChip(
            label: tr('ownerClient.filterAll'),
            selected: _selectedCategory == null,
            onSelected: (_) => setState(() => _selectedCategory = null),
          ),
          for (final cat in categories) ...[
            const SizedBox(width: 8),
            TrainingFilterChip(
              label: cat,
              selected: _selectedCategory == cat,
              onSelected: (_) => setState(
                () => _selectedCategory = _selectedCategory == cat ? null : cat,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSelectedDayChip(String localeCode) {
    final day = _selectedDay!;
    final label = DateFormat('d MMM', localeCode).format(day);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
      child: Align(
        alignment: Alignment.centerLeft,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () => setState(() => _selectedDay = null),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.primary500,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.event, size: 16.sp, color: AppColors.textInverse),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13.sp,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textInverse,
                  ),
                ),
                const SizedBox(width: 6),
                Icon(Icons.close, size: 16.sp, color: AppColors.textInverse),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBody(String Function(String) tr, String localeCode) {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary500),
      );
    }

    if (_loadError != null) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
        child: Center(
          child: Text(
            tr('common.loadFailed'),
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textSecondary, fontSize: 14.sp),
          ),
        ),
      );
    }

    final auth = context.watch<AuthService>();
    final ownerFallback = _ownerTrainerFallback(auth);
    final locations = _studioLocations(tr);
    final sessions = _filteredSessions(localeCode);

    if (sessions.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
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
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      itemCount: sessions.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final session = sessions[index];
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
          onTap: _enrollingSessionId.isEmpty ? () => _enroll(session) : () {},
        );
      },
    );
  }
}
