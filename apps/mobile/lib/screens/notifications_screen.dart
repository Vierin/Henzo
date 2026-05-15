import 'package:flutter/material.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../models/app_notification.dart';
import '../services/notifications_store.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({
    super.key,
    this.initialFilter = NotificationFilter.all,
  });

  final NotificationFilter initialFilter;

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

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final store = context.watch<NotificationsStore>();
    final items = store.items.where((n) => !_isReminder(n)).toList();
    final filteredItems = items.where(_matchesFilter).toList();

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          onPressed: () => Navigator.pop(context),
          style: IconButton.styleFrom(
            backgroundColor: AppColors.backgroundPrimary,
            shape: const CircleBorder(),
          ),
          icon: const Icon(
            Icons.arrow_back_ios_new,
            color: AppColors.textPrimary,
            size: 18,
          ),
        ),
        title: Text(
          locale.t('notifications.title'),
          style: const TextStyle(
            fontSize: 18,
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
                        style: const TextStyle(
                          fontSize: 14,
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
        return _notificationKind(n) == _NotificationKind.booking;
      case NotificationFilter.reviews:
        return _notificationKind(n) == _NotificationKind.review;
    }
  }
}

enum NotificationFilter { all, bookings, reviews }

enum _NotificationKind { booking, system, review }

bool _isReminder(AppNotification n) {
  final type = (n.data['type'] ?? n.data['eventType'] ?? '').toLowerCase();
  final text = '${n.title} ${n.body}'.toLowerCase();
  return type.contains('reminder') || text.contains('reminder');
}

_NotificationKind _notificationKind(AppNotification n) {
  final type = (n.data['type'] ?? n.data['eventType'] ?? '').toLowerCase();
  final text = '${n.title} ${n.body}'.toLowerCase();
  if (type.contains('review') || text.contains('review')) {
    return _NotificationKind.review;
  }
  if (type.contains('booking') ||
      type.contains('booked') ||
      type.contains('reserve') ||
      type.contains('reservation') ||
      type.contains('cancelled') ||
      text.contains('booking') ||
      text.contains('booked') ||
      text.contains('reserve') ||
      text.contains('reservation')) {
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
    required this.iconBackground,
    required this.icon,
    required this.typeLabelKey,
  });

  final Color accent;
  final Color iconBackground;
  final IconData icon;
  final String typeLabelKey;

  static _NotificationTheme forKind(
    _NotificationKind kind,
  ) {
    return switch (kind) {
      _NotificationKind.booking => const _NotificationTheme(
        accent: AppColors.primary500,
        iconBackground: AppColors.primary50,
        icon: Icons.calendar_today_outlined,
        typeLabelKey: 'notifications.typeBooking',
      ),
      _NotificationKind.review => const _NotificationTheme(
        accent: AppColors.profilePurple,
        iconBackground: AppColors.profilePurpleLight,
        icon: Icons.star_outline_rounded,
        typeLabelKey: 'notifications.typeReview',
      ),
      _NotificationKind.system => const _NotificationTheme(
        accent: AppColors.warning600,
        iconBackground: AppColors.warning50,
        icon: Icons.campaign_outlined,
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
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.3,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              locale.t('notifications.emptySubtitle'),
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 15,
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
  const _FiltersRow({required this.value, required this.onChanged});

  final NotificationFilter value;
  final ValueChanged<NotificationFilter> onChanged;

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    return Row(
      children: [
        Expanded(
          child: _FilterPill(
            label: locale.t('notifications.filterAll'),
            selected: value == NotificationFilter.all,
            onTap: () => onChanged(NotificationFilter.all),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _FilterPill(
            label: locale.t('notifications.filterBookings'),
            selected: value == NotificationFilter.bookings,
            onTap: () => onChanged(NotificationFilter.bookings),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _FilterPill(
            label: locale.t('notifications.filterReviews'),
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
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
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
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: selected ? Colors.white : AppColors.textPrimary,
              ),
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
  });

  final AppNotification notification;
  final LocaleProvider locale;

  @override
  Widget build(BuildContext context) {
    final kind = _notificationKind(notification);
    final theme = _NotificationTheme.forKind(kind);
    final timeStr = _relativeTime(notification.createdAt, locale);
    final message = notification.body.isNotEmpty
        ? notification.body
        : notification.title;
    final sessionDate = kind == _NotificationKind.booking
        ? _bookingSessionDate(notification, locale)
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
      child: Material(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(16),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () {
            context.read<NotificationsStore>().markRead(notification.id);
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: theme.iconBackground,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  alignment: Alignment.center,
                  child: Icon(theme.icon, size: 24, color: theme.accent),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: theme.accent,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            locale.t(theme.typeLabelKey),
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.4,
                              color: theme.accent,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            timeStr,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        message,
                        style: const TextStyle(
                          fontSize: 15,
                          height: 1.35,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      if (sessionDate != null) ...[
                        const SizedBox(height: 6),
                        Text(
                          locale
                              .t('notifications.sessionDate')
                              .replaceAll('{date}', sessionDate),
                          style: const TextStyle(
                            fontSize: 13,
                            height: 1.3,
                            fontWeight: FontWeight.w500,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String? _bookingSessionDate(
    AppNotification n,
    LocaleProvider locale,
  ) {
    final formatted = n.data['formattedDate']?.trim();
    if (formatted != null && formatted.isNotEmpty) return formatted;

    final raw = n.data['dateTime']?.trim();
    if (raw == null || raw.isEmpty) return null;

    try {
      final dt = DateTime.parse(raw).toLocal();
      final tag = locale.languageTag.replaceAll('-', '_');
      return DateFormat('d MMM yyyy, HH:mm', tag).format(dt);
    } catch (_) {
      return null;
    }
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
