import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../models/app_notification.dart';
import '../services/notifications_store.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  NotificationFilter _filter = NotificationFilter.all;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationsStore>().markAllRead();
    });
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final store = context.watch<NotificationsStore>();
    final items = store.items;
    final filteredItems = items.where(_matchesFilter).toList();

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          onPressed: () => Navigator.pop(context),
          style: IconButton.styleFrom(
            backgroundColor: AppColors.neutral200,
            shape: const CircleBorder(),
          ),
          icon: const Icon(
            Icons.arrow_back,
            color: AppColors.textPrimary,
            size: 20,
          ),
        ),
        title: Text(
          locale.t('notifications.title'),
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
        actions: const [SizedBox(width: 8)],
      ),
      body: RefreshIndicator(
        onRefresh: () => store.load(),
        child: items.isEmpty
            ? SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: SizedBox(
                  height: 400,
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text('😔', style: TextStyle(fontSize: 64, height: 1)),
                          const SizedBox(height: 24),
                          Text(
                            locale.t('notifications.empty'),
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              )
            : ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(
                  vertical: 12,
                  horizontal: 12,
                ),
                children: [
                  _FiltersRow(
                    value: _filter,
                    onChanged: (v) => setState(() => _filter = v),
                  ),
                  const SizedBox(height: 12),
                  if (filteredItems.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(top: 36),
                      child: Center(
                        child: Text(
                          'No notifications in this section',
                          style: TextStyle(
                            fontSize: 14,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    )
                  else
                    Container(
                      decoration: BoxDecoration(
                        border: Border.all(color: AppColors.borderPrimary),
                        color: AppColors.backgroundPrimary,
                      ),
                      child: Column(
                        children: [
                          for (var i = 0; i < filteredItems.length; i++) ...[
                            _NotificationTile(notification: filteredItems[i]),
                            if (i != filteredItems.length - 1)
                              const Divider(
                                height: 1,
                                thickness: 1,
                                color: AppColors.borderPrimary,
                              ),
                          ],
                        ],
                      ),
                    ),
                ],
              ),
      ),
    );
  }

  bool _matchesFilter(AppNotification n) {
    switch (_filter) {
      case NotificationFilter.all:
        return true;
      case NotificationFilter.bookings:
        return _notificationType(n) == _NotificationType.booking;
      case NotificationFilter.reviews:
        return _notificationType(n) == _NotificationType.review;
    }
  }
}

enum NotificationFilter { all, bookings, reviews }

enum _NotificationType { booking, review, other }

_NotificationType _notificationType(AppNotification n) {
  final type = (n.data['type'] ?? n.data['eventType'] ?? '').toLowerCase();
  final text = '${n.title} ${n.body}'.toLowerCase();
  if (type.contains('review') || text.contains('review')) {
    return _NotificationType.review;
  }
  if (type.contains('booking') ||
      text.contains('booking') ||
      text.contains('booked') ||
      text.contains('reserve') ||
      text.contains('reservation')) {
    return _NotificationType.booking;
  }
  return _NotificationType.other;
}

class _FiltersRow extends StatelessWidget {
  const _FiltersRow({required this.value, required this.onChanged});

  final NotificationFilter value;
  final ValueChanged<NotificationFilter> onChanged;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _FilterPill(
            label: 'All',
            selected: value == NotificationFilter.all,
            onTap: () => onChanged(NotificationFilter.all),
          ),
          const SizedBox(width: 10),
          _FilterPill(
            label: 'Bookings',
            selected: value == NotificationFilter.bookings,
            onTap: () => onChanged(NotificationFilter.bookings),
          ),
          const SizedBox(width: 10),
          _FilterPill(
            label: 'Reviews',
            selected: value == NotificationFilter.reviews,
            onTap: () => onChanged(NotificationFilter.reviews),
          ),
        ],
      ),
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
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Ink(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary500 : AppColors.backgroundPrimary,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected ? AppColors.primary500 : AppColors.borderPrimary,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.notification});

  final AppNotification notification;

  static final DateFormat _dateFormat = DateFormat('dd.MM.yyyy HH:mm');

  @override
  Widget build(BuildContext context) {
    final timeStr = _relativeTime(notification.createdAt);
    final type = _notificationType(notification);
    final typeLabel = switch (type) {
      _NotificationType.booking => 'BOOKING',
      _NotificationType.review => 'REVIEW',
      _NotificationType.other => 'NOTICE',
    };
    final icon = switch (type) {
      _NotificationType.booking => Icons.calendar_today_outlined,
      _NotificationType.review => Icons.star_border_rounded,
      _NotificationType.other => Icons.notifications_none_rounded,
    };

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
        child: InkWell(
          onTap: () {
            context.read<NotificationsStore>().markRead(notification.id);
          },
          child: Container(
            decoration: BoxDecoration(
              border: Border(
                left: BorderSide(
                  color: notification.read
                      ? Colors.transparent
                      : AppColors.primary500,
                  width: 3,
                ),
              ),
            ),
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 30,
                  height: 30,
                  alignment: Alignment.center,
                  child: Icon(icon, size: 22, color: AppColors.textSecondary),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            typeLabel,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.3,
                              color: AppColors.primary600,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            timeStr,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          if (!notification.read) ...[
                            const SizedBox(width: 8),
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppColors.primary500,
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        notification.body.isNotEmpty
                            ? notification.body
                            : notification.title,
                        style: const TextStyle(
                          fontSize: 15.5,
                          height: 1.35,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      if (type == _NotificationType.booking) ...[
                        const SizedBox(height: 8),
                        Text(
                          'View Details',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary500,
                          ),
                        ),
                      ],
                      if (type == _NotificationType.review &&
                          notification.title.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppColors.backgroundSecondary,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.borderPrimary),
                          ),
                          child: Text(
                            '"${notification.title}"',
                            style: const TextStyle(
                              fontSize: 14,
                              fontStyle: FontStyle.italic,
                              color: AppColors.textSecondary,
                            ),
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

  String _relativeTime(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes} mins ago';
    if (diff.inHours < 24) return '${diff.inHours} hours ago';
    if (diff.inDays < 7) return '${diff.inDays} days ago';
    return _dateFormat.format(date);
  }
}
