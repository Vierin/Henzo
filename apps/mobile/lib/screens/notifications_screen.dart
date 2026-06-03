import 'package:flutter/material.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../models/app_notification.dart';
import '../models/studio.dart';
import '../services/auth_service.dart';
import '../services/cache/owner_sessions_cache.dart';
import '../services/cache/studio_cache.dart';
import '../services/dashboard_api_service.dart';
import '../services/notifications_store.dart';
import '../utils/color_hex.dart';
import '../widgets/common/henzo_header_back_button.dart';
import '../utils/show_api_error.dart';
import 'public_class_detail_screen.dart';
import 'owner_training_session_detail_screen.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

enum NotificationsScreenAudience { owner, client }

/// Push items shown in the client notifications panel (excludes owner-only).
bool isClientRelevantNotification(AppNotification n) =>
    !_isOwnerOnlyNotification(n);

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({
    super.key,
    this.initialFilter = NotificationFilter.all,
    this.audience = NotificationsScreenAudience.owner,
  });

  final NotificationFilter initialFilter;
  final NotificationsScreenAudience audience;

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late NotificationFilter _filter;

  @override
  void initState() {
    super.initState();
    _filter = widget.initialFilter;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationsStore>().markAllRead();
    });
  }

  bool get _isClient =>
      widget.audience == NotificationsScreenAudience.client;

  List<AppNotification> _visibleItems(List<AppNotification> all) {
    var list = all;
    if (_isClient) {
      list = list.where(isClientRelevantNotification).toList();
    } else {
      list = list.where((n) => !_isReminder(n)).toList();
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final store = context.watch<NotificationsStore>();
    final items = _visibleItems(store.items);
    final filteredItems = items.where(_matchesFilter).toList();
    final allCount = items.length;
    final bookingsCount = items
        .where((n) => _isBookingFilterKind(_notificationKind(n, _isClient)))
        .length;
    final secondaryCount = _isClient
        ? items
            .where(
              (n) =>
                  !_isBookingFilterKind(_notificationKind(n, _isClient)),
            )
            .length
        : items
            .where(
              (n) => _notificationKind(n, false) == _NotificationKind.review,
            )
            .length;

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: HenzoHeaderBackButton(
          onPressed: () => Navigator.pop(context),
        ),
        leadingWidth: 56,
        title: Text(
          locale.t('notifications.title'),
          style: TextStyle(
            fontSize: 18.sp,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.3,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: RefreshIndicator(
        color: AppColors.primary500,
        onRefresh: () => store.load(),
        child: LayoutBuilder(
          builder: (context, constraints) {
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
              children: [
                _FiltersRow(
                  value: _filter,
                  allCount: allCount,
                  bookingsCount: bookingsCount,
                  secondaryCount: secondaryCount,
                  isClient: _isClient,
                  onChanged: (v) => setState(() => _filter = v),
                ),
                const SizedBox(height: 16),
                if (items.isEmpty)
                  SizedBox(
                    height: (constraints.maxHeight - 72).clamp(280.0, 520.0),
                    child: _NotificationsEmptyState(locale: locale),
                  )
                else if (filteredItems.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 48),
                    child: Center(
                      child: Text(
                        locale.t('notifications.filterEmpty'),
                        style: TextStyle(
                          fontSize: 14.sp,
                          color: AppColors.textSecondary,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  )
                else
                  ...[
                    for (var i = 0; i < filteredItems.length; i++) ...[
                      if (i > 0) const SizedBox(height: 10),
                      _NotificationCard(
                        notification: filteredItems[i],
                        locale: locale,
                        isClient: _isClient,
                      ),
                    ],
                  ],
              ],
            );
          },
        ),
      ),
    );
  }

  bool _matchesFilter(AppNotification n) {
    switch (_filter) {
      case NotificationFilter.all:
        return true;
      case NotificationFilter.bookings:
        return _isBookingFilterKind(_notificationKind(n, _isClient));
      case NotificationFilter.reviews:
        if (_isClient) {
          return !_isBookingFilterKind(_notificationKind(n, true));
        }
        return _notificationKind(n, false) == _NotificationKind.review;
    }
  }
}

bool _isOwnerOnlyNotification(AppNotification n) {
  final type = (n.data['type'] ?? n.data['eventType'] ?? '').toUpperCase();
  if (type == 'NEW_BOOKING' || type == 'NEW_CLASS_BOOKING') {
    return true;
  }
  if (_notificationKind(n, false) == _NotificationKind.review) {
    return true;
  }
  final clientName = n.data['clientName']?.trim();
  if (clientName != null && clientName.isNotEmpty) {
    return true;
  }
  return false;
}

enum NotificationFilter { all, bookings, reviews }

enum _NotificationKind { booking, bookingCancelled, system, review }

bool _isReminder(AppNotification n) {
  final type = (n.data['type'] ?? n.data['eventType'] ?? '').toLowerCase();
  final text = '${n.title} ${n.body}'.toLowerCase();
  return type.contains('reminder') || text.contains('reminder');
}

bool _isBookingFilterKind(_NotificationKind kind) =>
    kind == _NotificationKind.booking ||
    kind == _NotificationKind.bookingCancelled;

_NotificationKind _notificationKind(AppNotification n, bool forClient) {
  final type = (n.data['type'] ?? n.data['eventType'] ?? '').toLowerCase();
  final text = '${n.title} ${n.body}'.toLowerCase();

  if (forClient && _isReminder(n)) {
    return _NotificationKind.booking;
  }

  if (!forClient && (type.contains('review') || text.contains('review'))) {
    return _NotificationKind.review;
  }
  if (type.contains('booking_cancelled') ||
      type.contains('cancelled') && type.contains('booking')) {
    return _NotificationKind.bookingCancelled;
  }
  if (type.contains('booking') ||
      type.contains('booked') ||
      type.contains('reserve') ||
      type.contains('reservation') ||
      text.contains('booking') ||
      text.contains('booked') ||
      text.contains('reserve') ||
      text.contains('reservation') ||
      text.contains('cancelled')) {
    if (text.contains('cancel') || type.contains('cancel')) {
      return _NotificationKind.bookingCancelled;
    }
    return _NotificationKind.booking;
  }
  if (type.contains('announcement') ||
      type.contains('system') ||
      type.contains('test')) {
    return _NotificationKind.system;
  }
  return _NotificationKind.system;
}

class _NotificationTheme {
  const _NotificationTheme({
    required this.accent,
    required this.typeLabelKey,
    this.icon,
    this.svgAsset,
  });

  final Color accent;
  final IconData? icon;
  final String? svgAsset;
  final String typeLabelKey;

  static _NotificationTheme forKind(_NotificationKind kind) {
    return switch (kind) {
      _NotificationKind.booking => const _NotificationTheme(
        accent: AppColors.primary500,
        svgAsset: 'assets/icons/icon-calendar.svg',
        typeLabelKey: 'notifications.typeBooking',
      ),
      _NotificationKind.bookingCancelled => const _NotificationTheme(
        accent: AppColors.primary500,
        icon: Icons.close_rounded,
        typeLabelKey: 'notifications.typeBookingCancelled',
      ),
      _NotificationKind.review => const _NotificationTheme(
        accent: AppColors.profilePurple,
        icon: Icons.star_outline_rounded,
        typeLabelKey: 'notifications.typeReview',
      ),
      _NotificationKind.system => const _NotificationTheme(
        accent: AppColors.neutral500,
        svgAsset: 'assets/icons/icon-megaphone.svg',
        typeLabelKey: 'notifications.typeAnnouncement',
      ),
    };
  }
}

class _NotificationsEmptyState extends StatelessWidget {
  const _NotificationsEmptyState({required this.locale});

  final LocaleProvider locale;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: 88,
              height: 88,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 88,
                    height: 88,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.primary500.withValues(alpha: 0.12),
                    ),
                  ),
                  SvgPicture.asset(
                    'assets/icons/icon-bell.svg',
                    width: 40,
                    height: 50,
                    colorFilter: const ColorFilter.mode(
                      AppColors.primary500,
                      BlendMode.srcIn,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text(
              locale.t('notifications.emptyTitle'),
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20.sp,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.3,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              locale.t('notifications.emptySubtitle'),
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 15.sp,
                height: 1.45,
                fontWeight: FontWeight.w500,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FiltersRow extends StatelessWidget {
  const _FiltersRow({
    required this.value,
    required this.allCount,
    required this.bookingsCount,
    required this.secondaryCount,
    required this.isClient,
    required this.onChanged,
  });

  final NotificationFilter value;
  final int allCount;
  final int bookingsCount;
  final int secondaryCount;
  final bool isClient;
  final ValueChanged<NotificationFilter> onChanged;

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    return Row(
      children: [
        Expanded(
          child: _FilterPill(
            label: locale.t('notifications.filterAll'),
            count: allCount,
            selected: value == NotificationFilter.all,
            onTap: () => onChanged(NotificationFilter.all),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _FilterPill(
            label: locale.t('notifications.filterBookings'),
            count: bookingsCount,
            selected: value == NotificationFilter.bookings,
            onTap: () => onChanged(NotificationFilter.bookings),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _FilterPill(
            label: locale.t(
              isClient
                  ? 'notifications.filterOthers'
                  : 'notifications.filterReviews',
            ),
            count: secondaryCount,
            selected: value == NotificationFilter.reviews,
            onTap: () => onChanged(NotificationFilter.reviews),
          ),
        ),
      ],
    );
  }
}

class _FilterPill extends StatelessWidget {
  const _FilterPill({
    required this.label,
    required this.count,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final int count;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final labelColor = selected ? Colors.white : AppColors.textPrimary;
    final countColor = selected
        ? Colors.white.withValues(alpha: 0.65)
        : AppColors.textTertiary;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Ink(
          decoration: BoxDecoration(
            color: selected ? AppColors.primary500 : AppColors.backgroundPrimary,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: selected ? AppColors.primary500 : AppColors.borderPrimary,
            ),
          ),
          child: Container(
            alignment: Alignment.center,
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                Flexible(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14.sp,
                      fontWeight: FontWeight.w600,
                      color: labelColor,
                    ),
                  ),
                ),
                if (count > 0) ...[
                  const SizedBox(width: 4),
                  Text(
                    '$count',
                    style: TextStyle(
                      fontSize: 14.sp,
                      fontWeight: FontWeight.w600,
                      color: countColor,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NotificationCard extends StatelessWidget {
  const _NotificationCard({
    required this.notification,
    required this.locale,
    required this.isClient,
  });

  final AppNotification notification;
  final LocaleProvider locale;
  final bool isClient;

  @override
  Widget build(BuildContext context) {
    final kind = _notificationKind(notification, isClient);
    final theme = _NotificationTheme.forKind(kind);
    final timeStr = _relativeTime(notification.createdAt, locale);
    final session = _isBookingFilterKind(kind)
        ? _bookingSessionParts(notification, locale)
        : null;

    return Slidable(
      key: ValueKey(notification.id),
      endActionPane: ActionPane(
        motion: const DrawerMotion(),
        extentRatio: 0.16,
        children: [
          CustomSlidableAction(
            onPressed: (_) =>
                context.read<NotificationsStore>().deleteById(notification.id),
            backgroundColor: AppColors.error500,
            padding: EdgeInsets.zero,
            child: const Icon(
              Icons.delete_outline,
              color: Colors.white,
              size: 22,
            ),
          ),
        ],
      ),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: AppColors.backgroundPrimary,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.borderPrimary),
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(16),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () =>
                _onNotificationTap(context, notification, kind, isClient),
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 14, 12, 14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  _TypeIconCircle(
                    accent: theme.accent,
                    icon: theme.icon,
                    svgAsset: theme.svgAsset,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              '• ${locale.t(theme.typeLabelKey)}',
                              style: TextStyle(
                                fontSize: 11.sp,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.3,
                                color: theme.accent,
                              ),
                            ),
                            const Spacer(),
                            Text(
                              timeStr,
                              style: TextStyle(
                                fontSize: 12.sp,
                                fontWeight: FontWeight.w500,
                                color: AppColors.textTertiary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text.rich(
                          TextSpan(
                            style: TextStyle(
                              fontSize: 14.sp,
                              height: 1.4,
                              fontWeight: FontWeight.w400,
                              color: AppColors.textPrimary,
                            ),
                            children: _messageSpans(
                              notification,
                              kind,
                              isClient,
                            ),
                          ),
                        ),
                        if (session != null) ...[
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              const Icon(
                                Icons.schedule_outlined,
                                size: 14,
                                color: AppColors.textTertiary,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                session.time,
                                style: TextStyle(
                                  fontSize: 13.sp,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(width: 14),
                              const Icon(
                                Icons.calendar_today_outlined,
                                size: 13,
                                color: AppColors.textTertiary,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                session.date,
                                style: TextStyle(
                                  fontSize: 13.sp,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  const _NotificationCardArrow(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  List<InlineSpan> _messageSpans(
    AppNotification n,
    _NotificationKind kind,
    bool isClient,
  ) {
    const bold = TextStyle(fontWeight: FontWeight.w700);
    const normal = TextStyle(fontWeight: FontWeight.w400);

    final leadName = isClient ? _clientLeadName(n) : n.data['clientName']?.trim();
    final serviceName = _serviceOrClassName(n);
    final body = n.body.trim();

    if (leadName != null && leadName.isNotEmpty) {
      if (body.startsWith(leadName)) {
        return [
          TextSpan(text: leadName, style: bold),
          TextSpan(text: body.substring(leadName.length), style: normal),
        ];
      }
      if (isClient) {
        return [
          TextSpan(text: leadName, style: bold),
          TextSpan(
            text: body.isNotEmpty ? ' $body' : '',
            style: normal,
          ),
        ];
      }
      return switch (kind) {
        _NotificationKind.bookingCancelled => [
          TextSpan(text: leadName, style: bold),
          TextSpan(
            text: _cancelledMessageSuffix(n, serviceName),
            style: normal,
          ),
        ],
        _NotificationKind.booking => [
          TextSpan(text: leadName, style: bold),
          TextSpan(
            text: _bookedMessageSuffix(n, serviceName),
            style: normal,
          ),
        ],
        _NotificationKind.review => [
          TextSpan(text: leadName, style: bold),
          TextSpan(text: _reviewMessageSuffix(n), style: normal),
        ],
        _ => [_plainMessageSpan(n)],
      };
    }

    return [_plainMessageSpan(n)];
  }

  String? _clientLeadName(AppNotification n) {
    final studio = n.data['studioName']?.trim();
    if (studio != null && studio.isNotEmpty) return studio;
    final training = _serviceOrClassName(n);
    if (training != null && training.isNotEmpty) return training;
    return null;
  }

  String? _serviceOrClassName(AppNotification n) {
    final service = n.data['serviceName']?.trim();
    if (service != null && service.isNotEmpty) return service;
    final training = n.data['trainingName']?.trim();
    if (training != null && training.isNotEmpty) return training;
    return null;
  }

  TextSpan _plainMessageSpan(AppNotification n) {
    final text = n.body.isNotEmpty ? n.body : n.title;
    return TextSpan(text: text);
  }

  String _bookedMessageSuffix(AppNotification n, String? serviceName) {
    if (serviceName != null && serviceName.isNotEmpty) {
      return ' booked $serviceName';
    }
    final body = n.body.trim();
    if (body.isNotEmpty) return ' $body';
    return ' booked a session';
  }

  String _cancelledMessageSuffix(AppNotification n, String? serviceName) {
    if (serviceName != null && serviceName.isNotEmpty) {
      return ' cancelled $serviceName';
    }
    final body = n.body.trim();
    if (body.isNotEmpty) return ' $body';
    return ' cancelled a session';
  }

  String _reviewMessageSuffix(AppNotification n) {
    final body = n.body.trim();
    if (body.isNotEmpty) return ' $body';
    return ' left a review.';
  }

  _BookingSessionParts? _bookingSessionParts(
    AppNotification n,
    LocaleProvider locale,
  ) {
    final raw =
        n.data['dateTime']?.trim() ?? n.data['startsAt']?.trim();
    if (raw != null && raw.isNotEmpty) {
      try {
        final dt = DateTime.parse(raw).toLocal();
        return _formatSessionParts(dt, locale);
      } catch (_) {}
    }

    final formatted = n.data['formattedDate']?.trim();
    if (formatted != null && formatted.isNotEmpty) {
      return _BookingSessionParts(time: formatted, date: formatted);
    }
    return null;
  }

  _BookingSessionParts _formatSessionParts(
    DateTime dt,
    LocaleProvider locale,
  ) {
    final tag = locale.languageTag.replaceAll('-', '_');
    return _BookingSessionParts(
      time: DateFormat('HH:mm', tag).format(dt),
      date: DateFormat('d MMM', tag).format(dt),
    );
  }

  Future<void> _onNotificationTap(
    BuildContext context,
    AppNotification notification,
    _NotificationKind kind,
    bool isClient,
  ) async {
    context.read<NotificationsStore>().markRead(notification.id);
    if (!_isBookingFilterKind(kind)) return;
    if (isClient) {
      await _openClientBookingDetail(context, notification);
      return;
    }
    await _openBookingSessionDetail(context, notification);
  }

  String _relativeTime(DateTime date, LocaleProvider locale) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inMinutes < 1) return locale.t('notifications.justNow');
    if (diff.inMinutes < 60) {
      return locale
          .t('notifications.minsAgo')
          .replaceAll('{n}', '${diff.inMinutes}');
    }
    if (diff.inHours < 24) {
      return locale
          .t('notifications.hoursAgo')
          .replaceAll('{n}', '${diff.inHours}');
    }
    if (diff.inDays < 7) {
      return locale
          .t('notifications.daysAgo')
          .replaceAll('{n}', '${diff.inDays}');
    }
    final tag = locale.languageTag.replaceAll('-', '_');
    return DateFormat('d MMM yyyy', tag).format(date);
  }
}

class _BookingSessionParts {
  const _BookingSessionParts({required this.time, required this.date});

  final String time;
  final String date;
}

Future<void> _openClientBookingDetail(
  BuildContext context,
  AppNotification notification,
) async {
  final sessionId = notification.data['sessionId']?.trim() ?? '';
  final studioId =
      notification.data['studioId']?.trim() ??
      notification.data['studioId']?.trim() ??
      '';
  if (sessionId.isEmpty || studioId.isEmpty) return;

  final dateRaw =
      notification.data['dateTime']?.trim() ??
      notification.data['startsAt']?.trim();
  final startsAt = dateRaw != null && dateRaw.isNotEmpty
      ? DateTime.tryParse(dateRaw)?.toLocal()
      : null;

  if (!context.mounted) return;
  await Navigator.of(context).push<void>(
    MaterialPageRoute<void>(
      builder: (_) => PublicClassDetailScreen(
        studioId: studioId,
        sessionId: sessionId,
        sessionStartsAtHint: startsAt ?? DateTime.now(),
      ),
    ),
  );
}

Future<void> _openBookingSessionDetail(
  BuildContext context,
  AppNotification notification,
) async {
  final token = context.read<AuthService>().accessToken;
  if (token == null || token.isEmpty) return;

  final sessionId = notification.data['sessionId']?.trim() ?? '';
  final dateRaw =
      notification.data['dateTime']?.trim() ??
      notification.data['startsAt']?.trim();
  DateTime? anchor;
  if (dateRaw != null && dateRaw.isNotEmpty) {
    anchor = DateTime.tryParse(dateRaw)?.toLocal();
  }

  final day = anchor ?? DateTime.now();
  final dayStart = DateTime(day.year, day.month, day.day);
  final fromUtc = dayStart.toUtc();
  final toUtc = dayStart.add(const Duration(days: 2)).toUtc();

  List<OwnerTrainingSession> sessions;
  try {
    sessions = await context.read<OwnerSessionsCache>().getSessions(
      token,
      fromUtc: fromUtc,
      toUtc: toUtc,
    );
  } catch (e) {
    if (context.mounted) showApiError(context, e);
    return;
  }

  OwnerTrainingSession? match;
  if (sessionId.isNotEmpty) {
    for (final s in sessions) {
      if (s.sessionId == sessionId) {
        match = s;
        break;
      }
    }
  }

  if (match == null && anchor != null) {
    final nameHint =
        notification.data['trainingName']?.trim() ??
        notification.data['serviceName']?.trim();
    if (nameHint != null && nameHint.isNotEmpty) {
      final hint = nameHint.toLowerCase();
      for (final s in sessions) {
        final sameDay = s.startsAt.year == anchor.year &&
            s.startsAt.month == anchor.month &&
            s.startsAt.day == anchor.day;
        if (sameDay && s.trainingName.toLowerCase() == hint) {
          match = s;
          break;
        }
      }
    }
  }

  if (!context.mounted) return;
  if (match == null) {
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      const SnackBar(content: Text('Session not found')),
    );
    return;
  }

  Studio? studio;
  try {
    studio = await context.read<StudioCache>().getStudio(token);
  } catch (_) {}

  final venue = studio?.name?.trim();

  if (!context.mounted) return;
  await Navigator.of(context).push<void>(
    MaterialPageRoute<void>(
      builder: (navCtx) => OwnerTrainingSessionDetailScreen(
        session: match!,
        trainingColor: parseHexColor(match.trainingDisplayColorHex),
        venueName: venue,
        onParticipantsChanged: () {
          navCtx.read<OwnerSessionsCache>().invalidate();
        },
      ),
    ),
  );
}

class _TypeIconCircle extends StatelessWidget {
  const _TypeIconCircle({
    required this.accent,
    this.icon,
    this.svgAsset,
  });

  final Color accent;
  final IconData? icon;
  final String? svgAsset;

  static const double _size = 38;
  static const double _iconSize = 16;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: _size,
      height: _size,
      decoration: BoxDecoration(shape: BoxShape.circle, color: accent),
      alignment: Alignment.center,
      child: svgAsset != null
          ? SvgPicture.asset(
              svgAsset!,
              width: _iconSize,
              height: _iconSize,
              fit: BoxFit.contain,
            )
          : Icon(icon, size: _iconSize, color: Colors.white),
    );
  }
}

class _NotificationCardArrow extends StatelessWidget {
  const _NotificationCardArrow();

  static const double _d = 30;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: _d,
      height: _d,
      child: DecoratedBox(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.primary500, width: 1),
        ),
        child: Center(
          child: SvgPicture.asset(
            'assets/icons/icon-arrow.svg',
            width: 14,
            height: 7,
            fit: BoxFit.contain,
            colorFilter: const ColorFilter.mode(
              AppColors.primary500,
              BlendMode.srcIn,
            ),
          ),
        ),
      ),
    );
  }
}
