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
import '../services/client_schedule_store.dart';
import '../services/dashboard_api_service.dart';
import '../services/notifications_store.dart';
import '../utils/color_hex.dart';
import '../utils/formatters.dart';
import '../widgets/client/client_panel_empty_state.dart';
import '../widgets/common/henzo_header_back_button.dart';
import '../utils/show_api_error.dart';
import 'dashboard/owner_studio_reviews_screen.dart';
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
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final token = context.read<AuthService>().accessToken;
      final store = context.read<NotificationsStore>();
      await store.syncFromServer(token);
      if (!mounted) return;
      await store.markAllRead(accessToken: token);
    });
  }

  bool get _isClient => widget.audience == NotificationsScreenAudience.client;

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
                (n) => !_isBookingFilterKind(_notificationKind(n, _isClient)),
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
        leading: HenzoHeaderBackButton(onPressed: () => Navigator.pop(context)),
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
        onRefresh: () async {
          final token = context.read<AuthService>().accessToken;
          await store.syncFromServer(token);
        },
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
                if (items.isEmpty || filteredItems.isEmpty)
                  SizedBox(
                    height: (constraints.maxHeight - 72).clamp(280.0, 520.0),
                    child: ClientPanelEmptyState(
                      title: items.isEmpty
                          ? locale.t('notifications.emptyTitle')
                          : locale.t('notifications.filterEmpty'),
                      subtitle: items.isEmpty
                          ? locale.t('notifications.emptySubtitle')
                          : null,
                    ),
                  )
                else
                  ..._buildGroupedList(filteredItems, locale),
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

  List<Widget> _buildGroupedList(
    List<AppNotification> items,
    LocaleProvider locale,
  ) {
    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    final yesterdayStart = todayStart.subtract(const Duration(days: 1));

    _DateBucket bucket(AppNotification n) {
      if (!n.createdAt.isBefore(todayStart)) return _DateBucket.today;
      if (!n.createdAt.isBefore(yesterdayStart)) return _DateBucket.yesterday;
      return _DateBucket.earlier;
    }

    final result = <Widget>[];
    _DateBucket? lastBucket;

    for (var i = 0; i < items.length; i++) {
      final b = bucket(items[i]);
      if (b != lastBucket) {
        if (result.isNotEmpty) result.add(const SizedBox(height: 20));
        result.add(
          _SectionHeader(
            label: switch (b) {
              _DateBucket.today => locale.t('notifications.sectionToday'),
              _DateBucket.yesterday => locale.t(
                'notifications.sectionYesterday',
              ),
              _DateBucket.earlier => locale.t('notifications.sectionEarlier'),
            },
          ),
        );
        result.add(const SizedBox(height: 10));
        lastBucket = b;
      } else {
        result.add(const SizedBox(height: 10));
      }
      result.add(
        _NotificationCard(
          notification: items[i],
          locale: locale,
          isClient: _isClient,
        ),
      );
    }
    return result;
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

bool _isClientSessionNotification(AppNotification n) {
  final type = (n.data['type'] ?? n.data['eventType'] ?? '').toUpperCase();
  return type == 'PRE_CLASS_REMINDER' ||
      type == 'WAITLIST_PROMOTED' ||
      type == 'WAITLIST_SPOT_OPENED' ||
      type == 'SESSION_CANCELLED' ||
      type == 'SESSION_RESCHEDULED' ||
      (n.data['sessionId']?.trim().isNotEmpty ?? false);
}

_NotificationKind _notificationKind(AppNotification n, bool forClient) {
  final type = (n.data['type'] ?? n.data['eventType'] ?? '').toLowerCase();
  final text = '${n.title} ${n.body}'.toLowerCase();

  if (forClient && (_isReminder(n) || _isClientSessionNotification(n))) {
    if (type.contains('cancel')) {
      return _NotificationKind.bookingCancelled;
    }
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

enum _DateBucket { today, yesterday, earlier }

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 13.sp,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.8,
          color: AppColors.textPrimary,
        ),
      ),
    );
  }
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
            color: selected
                ? AppColors.primary500
                : AppColors.backgroundPrimary,
            borderRadius: BorderRadius.circular(999),
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

const _kNotificationCardRadius = 16.0;

class _NotificationDeleteAction extends StatelessWidget {
  const _NotificationDeleteAction({required this.onPressed});

  final void Function(BuildContext context) onPressed;

  @override
  Widget build(BuildContext context) {
    return CustomSlidableAction(
      onPressed: onPressed,
      backgroundColor: AppColors.error500,
      padding: EdgeInsets.zero,
      child: const Icon(Icons.delete_outline, color: Colors.white, size: 22),
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
    // Show the "sent at" stamp in the studio timezone (not the device's): if
    // you're enrolled in a studio you're almost always in its country.
    final studioOffset = _studioUtcOffset(notification);
    final sentAt = studioOffset != null
        ? notification.createdAt.toUtc().add(studioOffset)
        : notification.createdAt;
    final timeStr = _relativeTime(sentAt, locale);
    final isTappable = kind != _NotificationKind.bookingCancelled;
    final session = _isBookingFilterKind(kind)
        ? _bookingSessionParts(notification, locale)
        : null;

    return ClipRRect(
      borderRadius: BorderRadius.circular(_kNotificationCardRadius),
      child: Slidable(
        key: ValueKey(notification.id),
        endActionPane: ActionPane(
          motion: const BehindMotion(),
          extentRatio: 0.18,
          children: [
            _NotificationDeleteAction(
              onPressed: (_) => context.read<NotificationsStore>().deleteById(
                notification.id,
              ),
            ),
          ],
        ),
        child: ColoredBox(
          color: AppColors.backgroundPrimary,
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () =>
                  _onNotificationTap(context, notification, kind, isClient),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 14, 12, 14),
                child: IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
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
                            Text(
                              '• ${locale.t(theme.typeLabelKey)}',
                              style: TextStyle(
                                fontSize: 11.sp,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.3,
                                color: theme.accent,
                              ),
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
                                    color: AppColors.textPrimary,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    session.time,
                                    style: TextStyle(
                                      fontSize: 13.sp,
                                      fontWeight: FontWeight.w500,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                  const SizedBox(width: 14),
                                  SvgPicture.asset(
                                    'assets/icons/icon-calendar.svg',
                                    width: 12,
                                    height: 12,
                                    fit: BoxFit.contain,
                                    excludeFromSemantics: true,
                                    colorFilter: const ColorFilter.mode(
                                      AppColors.textPrimary,
                                      BlendMode.srcIn,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    session.date,
                                    style: TextStyle(
                                      fontSize: 13.sp,
                                      fontWeight: FontWeight.w500,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            timeStr,
                            style: TextStyle(
                              fontSize: 12.sp,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textTertiary,
                            ),
                          ),
                          if (isTappable)
                            const Expanded(
                              child: Center(child: _NotificationCardArrow()),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
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

    // Client inbox items: render the message from the notification type + data
    // in the app language, so the Notifications page is localized regardless of
    // the language the server stored the body in. Falls back to the raw server
    // text for unknown types or missing data.
    if (isClient) {
      final localized = _localizedClientSpans(n, bold, normal);
      if (localized != null) return localized;
    }

    final leadName = isClient
        ? _clientLeadName(n)
        : n.data['clientName']?.trim();
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
        final studio = n.data['studioName']?.trim();
        final displayBody =
            studio != null &&
                studio.isNotEmpty &&
                leadName == studio &&
                body.toLowerCase().contains(studio.toLowerCase())
            ? _bodyWithoutEmbeddedStudio(body, studio)
            : body;
        return [
          TextSpan(text: leadName, style: bold),
          TextSpan(
            text: displayBody.isNotEmpty ? ' $displayBody' : '',
            style: normal,
          ),
        ];
      }
      final ownerLocalized = _localizedOwnerSpans(n, kind, bold, normal);
      if (ownerLocalized != null) return ownerLocalized;
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
          TextSpan(text: _bookedMessageSuffix(n, serviceName), style: normal),
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

  /// Builds a localized message for known client notification types from their
  /// `type` + `data` fields. Returns null when the type is unknown or the
  /// required data (studio / class name) is missing, so the caller falls back
  /// to the raw server text.
  List<InlineSpan>? _localizedClientSpans(
    AppNotification n,
    TextStyle bold,
    TextStyle normal,
  ) {
    final type = (n.data['type'] ?? n.data['eventType'] ?? '')
        .trim()
        .toUpperCase();
    final key = switch (type) {
      'PRE_CLASS_REMINDER' => 'notifications.msgReminder',
      'WAITLIST_SPOT_OPENED' => 'notifications.msgWaitlist',
      'WAITLIST_PROMOTED' => 'notifications.msgWaitlistPromoted',
      'SESSION_CANCELLED' => 'notifications.msgCancelled',
      'SESSION_RESCHEDULED' => 'notifications.msgRescheduled',
      'OWNER_BOOKED' => 'notifications.msgOwnerBooked',
      _ => null,
    };
    if (key == null) return null;

    final studio = n.data['studioName']?.trim() ?? '';
    final className = _serviceOrClassName(n)?.trim() ?? '';
    if (studio.isEmpty || className.isEmpty) return null;

    final text = locale
        .t(key)
        .replaceAll('{studio}', studio)
        .replaceAll('{class}', className);

    // Optional cancellation note left by the owner.
    final note = n.data['note']?.trim() ?? '';
    final noteSpan = note.isEmpty
        ? null
        : TextSpan(
            text:
                '\n${locale.t('notifications.cancelNote').replaceAll('{note}', note)}',
            style: normal,
          );

    // Bold the studio name where the template leads with it.
    if (text.startsWith(studio)) {
      return [
        TextSpan(text: studio, style: bold),
        TextSpan(text: text.substring(studio.length), style: normal),
        if (noteSpan != null) noteSpan,
      ];
    }
    return [
      TextSpan(text: text, style: normal),
      if (noteSpan != null) noteSpan,
    ];
  }

  /// Builds a localized message for owner notification cards from the
  /// notification kind + data (client name / service). Returns null when the
  /// client name is missing, so the caller falls back to the raw server text.
  List<InlineSpan>? _localizedOwnerSpans(
    AppNotification n,
    _NotificationKind kind,
    TextStyle bold,
    TextStyle normal,
  ) {
    final client = n.data['clientName']?.trim() ?? '';
    if (client.isEmpty) return null;
    final service = _serviceOrClassName(n)?.trim() ?? '';

    final String key;
    switch (kind) {
      case _NotificationKind.booking:
        key = service.isNotEmpty
            ? 'notifications.ownerBooked'
            : 'notifications.ownerBookedGeneric';
      case _NotificationKind.bookingCancelled:
        key = service.isNotEmpty
            ? 'notifications.ownerCancelled'
            : 'notifications.ownerCancelledGeneric';
      case _NotificationKind.review:
        key = 'notifications.ownerReview';
      case _NotificationKind.system:
        return null;
    }

    final text = locale
        .t(key)
        .replaceAll('{client}', client)
        .replaceAll('{service}', service);

    // Bold the client name where the template leads with it.
    if (text.startsWith(client)) {
      return [
        TextSpan(text: client, style: bold),
        TextSpan(text: text.substring(client.length), style: normal),
      ];
    }
    return [TextSpan(text: text, style: normal)];
  }

  String _bodyWithoutEmbeddedStudio(String body, String studio) {
    final escaped = RegExp.escape(studio);
    return body
        .replaceFirst(
          RegExp(r' (?:at|в|tại|in) ' + escaped, caseSensitive: false),
          '',
        )
        .trim();
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

  /// Studio UTC offset derived from the backend-provided pair
  /// (`startsAt` UTC instant + `startsAtLocal` studio wall-clock). Lets us
  /// render times in the studio timezone without a tz database on the client.
  Duration? _studioUtcOffset(AppNotification n) {
    final utcRaw = n.data['startsAt']?.trim();
    final localRaw = n.data['startsAtLocal']?.trim();
    if (utcRaw == null ||
        utcRaw.isEmpty ||
        localRaw == null ||
        localRaw.isEmpty) {
      return null;
    }
    final utc = DateTime.tryParse(utcRaw)?.toUtc();
    final wall = DateTime.tryParse(localRaw);
    if (utc == null || wall == null) return null;
    final wallAsUtc = DateTime.utc(
      wall.year,
      wall.month,
      wall.day,
      wall.hour,
      wall.minute,
      wall.second,
    );
    return wallAsUtc.difference(utc);
  }

  _BookingSessionParts? _bookingSessionParts(
    AppNotification n,
    LocaleProvider locale,
  ) {
    // Prefer the studio-local wall-clock time computed by the backend, so the
    // card shows the same time as the notification body (not device-local).
    final localRaw = n.data['startsAtLocal']?.trim();
    if (localRaw != null && localRaw.isNotEmpty) {
      final dt = DateTime.tryParse(localRaw);
      if (dt != null) return _formatSessionParts(dt, locale);
    }

    final raw = n.data['dateTime']?.trim() ?? n.data['startsAt']?.trim();
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

  _BookingSessionParts _formatSessionParts(DateTime dt, LocaleProvider locale) {
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
    if (kind == _NotificationKind.bookingCancelled) return;
    if (kind == _NotificationKind.review) {
      if (!isClient) {
        await _openOwnerReviews(context, notification);
      }
      return;
    }
    if (!_isBookingFilterKind(kind)) return;
    if (isClient) {
      await _openClientBookingDetail(context, notification);
      return;
    }
    await _openBookingSessionDetail(context, notification);
  }

  String _relativeTime(DateTime date, LocaleProvider locale) {
    final now = DateTime.now();
    final yesterdayStart = DateTime(
      now.year,
      now.month,
      now.day,
    ).subtract(const Duration(days: 1));
    if (!date.isBefore(yesterdayStart)) {
      return DateFormat('HH:mm').format(date);
    }
    return DateFormat('dd.MM.yy HH:mm').format(date);
  }
}

class _BookingSessionParts {
  const _BookingSessionParts({required this.time, required this.date});

  final String time;
  final String date;
}

class _ClientBookingRoute {
  const _ClientBookingRoute({
    required this.studioId,
    required this.sessionId,
    required this.startsAt,
  });

  final String studioId;
  final String sessionId;
  final DateTime startsAt;
}

DateTime? _parseNotificationStartsAt(Map<String, String> data) {
  final raw = data['dateTime']?.trim() ?? data['startsAt']?.trim();
  if (raw == null || raw.isEmpty) return null;
  return DateTime.tryParse(raw)?.toLocal();
}

_ClientBookingRoute? _routeFromScheduleItem(Map<String, dynamic> item) {
  final sessionId = (item['sessionId'] ?? '').toString().trim();
  if (sessionId.isEmpty) return null;

  final studio = item['studio'] is Map
      ? Map<String, dynamic>.from(item['studio'] as Map)
      : <String, dynamic>{};
  final studioId = (studio['id'] ?? item['studioId'] ?? '').toString().trim();
  if (studioId.isEmpty) return null;

  final startsAt = parseApiDateTime(item['startsAt']) ?? DateTime.now();
  return _ClientBookingRoute(
    studioId: studioId,
    sessionId: sessionId,
    startsAt: startsAt,
  );
}

Future<_ClientBookingRoute?> _resolveClientBookingRoute(
  BuildContext context,
  AppNotification notification,
) async {
  final data = notification.data;
  var sessionId = data['sessionId']?.trim() ?? '';
  var studioId = data['studioId']?.trim() ?? '';
  var startsAt = _parseNotificationStartsAt(data);

  final token = context.read<AuthService>().accessToken;
  final enrollmentId = data['enrollmentId']?.trim();

  if (token != null &&
      token.isNotEmpty &&
      (sessionId.isEmpty || studioId.isEmpty)) {
    try {
      final items = await ClientScheduleStore.loadFullSchedule(token);
      for (final item in items) {
        if (enrollmentId != null &&
            enrollmentId.isNotEmpty &&
            (item['enrollmentId'] ?? '').toString() == enrollmentId) {
          final route = _routeFromScheduleItem(item);
          if (route != null) return route;
        }
        if (sessionId.isNotEmpty &&
            (item['sessionId'] ?? '').toString() == sessionId) {
          final route = _routeFromScheduleItem(item);
          if (route != null) {
            studioId = studioId.isEmpty ? route.studioId : studioId;
            startsAt ??= route.startsAt;
            break;
          }
        }
      }
    } catch (_) {}
  }

  if (sessionId.isEmpty || studioId.isEmpty) return null;
  return _ClientBookingRoute(
    studioId: studioId,
    sessionId: sessionId,
    startsAt: startsAt ?? DateTime.now(),
  );
}

Future<void> _openOwnerReviews(
  BuildContext context,
  AppNotification notification,
) async {
  var studioId = notification.data['studioId']?.trim() ?? '';
  if (studioId.isEmpty) {
    final token = context.read<AuthService>().accessToken;
    if (token != null && token.isNotEmpty) {
      try {
        final studio = await context.read<StudioCache>().getStudio(token);
        studioId = studio?.id.trim() ?? '';
      } catch (_) {}
    }
  }

  if (!context.mounted) return;
  if (studioId.isEmpty) {
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      SnackBar(
        content: Text(
          context.read<LocaleProvider>().t('dashboard.reviewsLoadError'),
        ),
      ),
    );
    return;
  }

  await Navigator.of(context).push<void>(
    MaterialPageRoute<void>(
      builder: (_) => OwnerStudioReviewsScreen(studioId: studioId),
    ),
  );
}

Future<void> _openClientBookingDetail(
  BuildContext context,
  AppNotification notification,
) async {
  final route = await _resolveClientBookingRoute(context, notification);
  if (!context.mounted) return;
  if (route == null) {
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      SnackBar(
        content: Text(
          context.read<LocaleProvider>().t('publicClassDetail.notFound'),
        ),
      ),
    );
    return;
  }

  await Navigator.of(context).push<void>(
    MaterialPageRoute<void>(
      builder: (_) => PublicClassDetailScreen(
        studioId: route.studioId,
        sessionId: route.sessionId,
        sessionStartsAtHint: route.startsAt,
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
        final sameDay =
            s.startsAt.year == anchor.year &&
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
    ScaffoldMessenger.maybeOf(
      context,
    )?.showSnackBar(const SnackBar(content: Text('Session not found')));
    return;
  }

  Studio? studio;
  try {
    studio = await context.read<StudioCache>().getStudio(token);
  } catch (_) {}

  final venue = studio?.name?.trim();

  if (!context.mounted) return;
  if (ModalRoute.of(context)?.isCurrent != true) return;
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
  const _TypeIconCircle({required this.accent, this.icon, this.svgAsset});

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

  @override
  Widget build(BuildContext context) {
    return const Icon(
      Icons.chevron_right_rounded,
      size: 22,
      color: AppColors.primary500,
    );
  }
}
