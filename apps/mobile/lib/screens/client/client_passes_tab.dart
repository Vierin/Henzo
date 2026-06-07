import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../utils/formatters.dart';
import '../../services/auth_service.dart';
import '../../utils/load_error_message.dart';
import '../../services/client_schedule_store.dart';
import '../../utils/client_schedule_owner_session.dart';
import '../../widgets/client/client_leave_review_sheet.dart';
import '../../widgets/client/client_placeholder_card.dart';
import '../../widgets/dashboard/owner_daily_schedule_session_card.dart';
import '../public_studio_detail_screen.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class _PassesListEntry {
  const _PassesListEntry.year(this.year) : item = null;
  const _PassesListEntry.card(this.item) : year = null;

  final int? year;
  final Map<String, dynamic>? item;
}

class ClientPassesTab extends StatelessWidget {
  const ClientPassesTab({super.key});

  @override
  Widget build(BuildContext context) {
    return const ClientPassesHistoryList();
  }
}

class ClientPassesHistoryList extends StatefulWidget {
  const ClientPassesHistoryList({super.key});

  @override
  State<ClientPassesHistoryList> createState() =>
      _ClientPassesHistoryListState();
}

class _ClientPassesHistoryListState extends State<ClientPassesHistoryList>
    with AutomaticKeepAliveClientMixin {
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _items = const [];
  final Set<String> _submittingReviewEnrollmentIds = <String>{};

  @override
  void initState() {
    super.initState();
    clientScheduleCacheTick.addListener(_onScheduleCacheTick);
    _load();
  }

  @override
  void dispose() {
    clientScheduleCacheTick.removeListener(_onScheduleCacheTick);
    super.dispose();
  }

  void _onScheduleCacheTick() {
    if (mounted) _load(force: false);
  }

  @override
  bool get wantKeepAlive => true;

  Future<void> _load({bool force = false}) async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (!mounted) return;
      setState(() {
        _items = const [];
        _loading = false;
      });
      return;
    }
    if (mounted) setState(() => _loading = true);
    try {
      final all = await ClientScheduleStore.loadFullSchedule(
        token,
        force: force,
      );
      final sorted = ClientScheduleStore.passesPastItems(all);
      if (!mounted) return;
      setState(() {
        _items = sorted;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      final locale = context.read<LocaleProvider>();
      setState(() {
        _items = const [];
        _loading = false;
        _error = loadErrorMessage(locale, e);
      });
    }
  }

  Future<void> _leaveReview(Map<String, dynamic> item) async {
    final studio = item['studio'] is Map
        ? Map<String, dynamic>.from(item['studio'] as Map)
        : <String, dynamic>{};
    final studioId = (studio['id'] ?? item['studioId'] ?? '').toString();
    final studioName = (studio['name'] ?? 'Studio').toString();
    final enrollmentId = (item['enrollmentId'] ?? '').toString();
    if (studioId.isEmpty) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(content: Text(context.read<LocaleProvider>().t('clientActivity.studioUnavailable'))),
      );
      return;
    }
    if (enrollmentId.isNotEmpty) {
      setState(() => _submittingReviewEnrollmentIds.add(enrollmentId));
    }
    final submitted = await showClientLeaveReviewSheet(
      context,
      studioId: studioId,
      studioName: studioName,
      enrollmentId: enrollmentId.isNotEmpty ? enrollmentId : null,
    );
    if (!mounted) return;
    if (enrollmentId.isNotEmpty) {
      setState(() => _submittingReviewEnrollmentIds.remove(enrollmentId));
    }
    if (submitted == true) {
      ClientScheduleStore.invalidate();
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(content: Text(context.read<LocaleProvider>().t('clientActivity.thankYouForReview'))),
      );
      await _load(force: true);
    }
  }

  List<_PassesListEntry> _groupedEntries() {
    final out = <_PassesListEntry>[];
    int? lastYear;
    for (final item in _items) {
      final startsAt = parseApiDateTime(item['startsAt']);
      final year = startsAt?.year;
      if (year != null && year != lastYear) {
        out.add(_PassesListEntry.year(year));
        lastYear = year;
      }
      out.add(_PassesListEntry.card(item));
    }
    return out;
  }

  void _openStudio(Map<String, dynamic> item) {
    final studio = item['studio'] is Map
        ? Map<String, dynamic>.from(item['studio'] as Map)
        : <String, dynamic>{};
    final studioId = (studio['id'] ?? item['studioId'] ?? '').toString();
    if (studioId.isEmpty) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PublicStudioDetailScreen(studioId: studioId),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final locale = context.watch<LocaleProvider>();
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return ListView(
        padding: const EdgeInsets.all(kScreenPaddingHorizontal),
        children: [
          ClientPlaceholderCard(
            title: locale.t('clientActivity.passesLoadFailedTitle'),
            subtitle: _error!,
            onRetry: () => _load(force: true),
          ),
        ],
      );
    }
    if (_items.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(kScreenPaddingHorizontal),
        children: [
          ClientPlaceholderCard(
            title: locale.t('clientActivity.passesEmptyTitle'),
            subtitle: locale.t('clientActivity.passesEmptySubtitle'),
          ),
        ],
      );
    }
    final entries = _groupedEntries();
    final localeTag = locale.languageTag;

    return RefreshIndicator(
      onRefresh: () => _load(force: true),
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(
          kScreenPaddingHorizontal,
          12,
          kScreenPaddingHorizontal,
          24,
        ),
        itemCount: entries.length,
        itemBuilder: (_, index) {
          final entry = entries[index];
          if (entry.year != null) {
            return Padding(
              padding: EdgeInsets.only(
                top: index == 0 ? 0 : 16,
                bottom: 10,
              ),
              child: Text(
                '${entry.year}',
                style: TextStyle(
                  fontSize: 18.sp,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                  height: 1.1,
                ),
              ),
            );
          }

          final item = entry.item!;
          final session = mapClientScheduleItemToOwnerSession(item);
          if (session == null) return const SizedBox.shrink();
          final presentation = presentationForClientScheduleItem(
            session,
            item,
          );

          final enrollmentId = (item['enrollmentId'] ?? '').toString();
          final hasReview = item['hasReview'] == true;
          final isReviewing = enrollmentId.isNotEmpty &&
              _submittingReviewEnrollmentIds.contains(enrollmentId);

          return OwnerDailyScheduleSessionCard(
            session: session,
            subtitleLabel: presentation.subtitleLabel,
            showLocationPin: presentation.showLocationPin,
            showSubtitleLeadingIcon: presentation.showSubtitleLeadingIcon,
            trainerLine: presentation.trainerLine,
            useLargeTrainerIcon: true,
            showDateAboveTime: false,
            secondaryTimeLabel: formatPassCardDayMonth(
              session.startsAt,
              localeTag,
            ),
            dimPastSessions: false,
            onLeaveReview: hasReview ? null : () => _leaveReview(item),
            leaveReviewSubmitted: hasReview,
            leaveReviewLoading: isReviewing,
            onTap: () => _openStudio(item),
          );
        },
      ),
    );
  }
}
