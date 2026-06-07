import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../services/api_client.dart';
import '../../utils/load_error_message.dart';
import '../../services/auth_service.dart';
import '../../services/client_schedule_store.dart';
import '../../utils/client_schedule_owner_session.dart';
import '../../widgets/client/client_placeholder_card.dart';
import '../../widgets/dashboard/owner_daily_schedule_session_card.dart';
import '../public_studio_detail_screen.dart';

class ClientScheduleTab extends StatefulWidget {
  const ClientScheduleTab({super.key});

  @override
  State<ClientScheduleTab> createState() => ClientScheduleTabState();
}

class ClientScheduleTabState extends State<ClientScheduleTab>
    with AutomaticKeepAliveClientMixin {
  bool _loading = true;
  List<Map<String, dynamic>> _allItems = const [];
  String? _error;
  final Set<String> _cancelingBookingIds = <String>{};
  DateTime _selectedDay = DateTime.now();

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

  String _dayKey(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  List<Map<String, dynamic>> get _itemsForDay {
    final key = _dayKey(_selectedDay);
    return _allItems.where((item) {
      final raw = item['startsAt'];
      if (raw == null) return false;
      final date = DateTime.tryParse(raw.toString())?.toLocal();
      if (date == null) return false;
      return _dayKey(date) == key;
    }).toList();
  }

  bool _hasItemsForDay(DateTime d) {
    final key = _dayKey(d);
    return _allItems.any((item) {
      final raw = item['startsAt'];
      if (raw == null) return false;
      final date = DateTime.tryParse(raw.toString())?.toLocal();
      if (date == null) return false;
      return _dayKey(date) == key;
    });
  }

  Future<void> _load({bool force = false}) async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (!mounted) return;
      setState(() {
        _allItems = const [];
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
      final upcoming = ClientScheduleStore.upcomingItems(all);
      if (!mounted) return;
      setState(() {
        _allItems = upcoming;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      final locale = context.read<LocaleProvider>();
      setState(() {
        _allItems = const [];
        _loading = false;
        _error = loadErrorMessage(locale, e);
      });
    }
  }

  String? _bookingId(Map<String, dynamic> item) {
    return ClientScheduleStore.bookingIdFromItem(item);
  }

  bool _canCancelBooking(Map<String, dynamic> item) {
    return ClientScheduleStore.canCancelClientBooking(item);
  }

  Future<void> _confirmCancel(Map<String, dynamic> item) async {
    final locale = context.read<LocaleProvider>();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(locale.t('clientActivity.cancelConfirmTitle')),
        content: Text(locale.t('clientActivity.cancelConfirmBody')),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(locale.t('common.cancel')),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error500),
            child: Text(locale.t('clientActivity.cancelConfirmAction')),
          ),
        ],
      ),
    );
    if (confirmed == true) _cancelBooking(item);
  }

  Future<void> _cancelBooking(Map<String, dynamic> item) async {
    final token = context.read<AuthService>().accessToken;
    final bookingId = _bookingId(item);
    if (token == null || token.isEmpty || bookingId == null) return;
    if (_cancelingBookingIds.contains(bookingId)) return;
    setState(() => _cancelingBookingIds.add(bookingId));
    try {
      await ApiClient.put(
        '/fitness/client/enrollments/$bookingId/cancel',
        token,
      );
      ClientScheduleStore.invalidate();
      if (!mounted) return;
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(content: Text(context.read<LocaleProvider>().t('client.bookingCancelled'))),
      );
      await _load(force: true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(content: Text(context.read<LocaleProvider>().t('client.cancelBookingFailed'))),
      );
    } finally {
      if (mounted) setState(() => _cancelingBookingIds.remove(bookingId));
    }
  }

  void _openStudio(Map<String, dynamic> item) {
    final studio = item['studio'] is Map
        ? Map<String, dynamic>.from(item['studio'] as Map)
        : <String, dynamic>{};
    final studioId = (studio['id'] ?? '').toString();
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

    Widget content;
    if (_loading) {
      content = const Center(child: CircularProgressIndicator());
    } else if (_error != null) {
      content = ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ClientPlaceholderCard(
            title: locale.t('clientActivity.scheduleLoadFailedTitle'),
            subtitle: _error!,
            onRetry: () => _load(force: true),
          ),
        ],
      );
    } else if (_allItems.isEmpty) {
      content = ListView(
        padding: const EdgeInsets.all(kScreenPaddingHorizontal),
        children: [
          ClientPlaceholderCard(
            title: locale.t('clientActivity.scheduleEmptyTitle'),
            subtitle: locale.t('clientActivity.scheduleEmptySubtitle'),
          ),
        ],
      );
    } else {
      final items = _itemsForDay;
      if (items.isEmpty) {
        content = ListView(
          padding: const EdgeInsets.fromLTRB(
            kScreenPaddingHorizontal,
            12,
            kScreenPaddingHorizontal,
            24,
          ),
          children: [
            Text(
              locale.t('dashboard.noClassesToday'),
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 14.sp,
              ),
            ),
          ],
        );
      } else {
        content = RefreshIndicator(
          onRefresh: () => _load(force: true),
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(
              kScreenPaddingHorizontal,
              12,
              kScreenPaddingHorizontal,
              24,
            ),
            itemCount: items.length,
            itemBuilder: (_, index) {
              final item = items[index];
              final session = mapClientScheduleItemToOwnerSession(item);
              if (session == null) return const SizedBox.shrink();
              final presentation = presentationForClientScheduleItem(
                session,
                item,
              );
              final canCancel = _canCancelBooking(item);
              final bookingId = _bookingId(item);
              final isCanceling =
                  bookingId != null && _cancelingBookingIds.contains(bookingId);

              return OwnerDailyScheduleSessionCard(
                session: session,
                subtitleLabel: presentation.subtitleLabel,
                showLocationPin: presentation.showLocationPin,
                showSubtitleLeadingIcon: presentation.showSubtitleLeadingIcon,
                trainerLine: presentation.trainerLine,
                showDateAboveTime: true,
                dimPastSessions: false,
                cancelActionLabel: locale.t('clientActivity.cancel'),
                cancelActionLoading: isCanceling,
                onCancelBooking: canCancel && !isCanceling
                    ? () => _confirmCancel(item)
                    : null,
                onTap: () => _openStudio(item),
              );
            },
          ),
        );
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 12),
        _DayStrip(
          selected: _selectedDay,
          hasSessions: _hasItemsForDay,
          onSelect: (d) => setState(() => _selectedDay = d),
        ),
        const SizedBox(height: 12),
        Expanded(child: content),
      ],
    );
  }
}

class _DayStrip extends StatefulWidget {
  const _DayStrip({
    required this.selected,
    required this.hasSessions,
    required this.onSelect,
  });

  final DateTime selected;
  final bool Function(DateTime) hasSessions;
  final ValueChanged<DateTime> onSelect;

  @override
  State<_DayStrip> createState() => _DayStripState();
}

class _DayStripState extends State<_DayStrip> {
  final _scrollController = ScrollController();
  bool _isUserScrolling = false;

  static const double _itemWidth = 48;
  static const double _itemMargin = 3;
  static const double _itemExtent = _itemWidth + _itemMargin * 2;

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _snapToNearest() {
    final offset = _scrollController.offset;
    final nearest = (offset / _itemExtent).round() * _itemExtent;
    final clamped = nearest.clamp(
      _scrollController.position.minScrollExtent,
      _scrollController.position.maxScrollExtent,
    );
    if ((clamped - offset).abs() < 0.5) return;
    _scrollController.animateTo(
      clamped,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
    );
  }

  String _dayKey(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  String _weekdayShort(DateTime d) {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return labels[d.weekday - 1];
  }

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final days = List.generate(
      31,
      (i) => DateTime(today.year, today.month, today.day + i - 7),
    );

    return SizedBox(
      height: 64,
      child: NotificationListener(
        onNotification: (notification) {
          if (notification is ScrollStartNotification &&
              notification.dragDetails != null) {
            _isUserScrolling = true;
          }
          if (notification is ScrollEndNotification && _isUserScrolling) {
            _isUserScrolling = false;
            _snapToNearest();
          }
          return false;
        },
        child: ListView.builder(
          controller: _scrollController,
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          itemCount: days.length,
          itemBuilder: (_, i) {
            final d = days[i];
            final isSelected = _dayKey(d) == _dayKey(widget.selected);
            final hasDot = widget.hasSessions(d);
            return GestureDetector(
              onTap: () => widget.onSelect(d),
              child: Container(
                width: _itemWidth,
                margin: const EdgeInsets.symmetric(horizontal: _itemMargin),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primary500 : Colors.transparent,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      _weekdayShort(d),
                      style: TextStyle(
                        fontSize: 10.sp,
                        color: isSelected
                            ? Colors.white70
                            : AppColors.textSecondary,
                      ),
                    ),
                    Text(
                      '${d.day}',
                      style: TextStyle(
                        fontSize: 16.sp,
                        fontWeight: FontWeight.w700,
                        color:
                            isSelected ? Colors.white : AppColors.textPrimary,
                      ),
                    ),
                    if (hasDot)
                      Container(
                        width: 5,
                        height: 5,
                        decoration: BoxDecoration(
                          color: isSelected
                              ? Colors.white
                              : AppColors.primary500,
                          shape: BoxShape.circle,
                        ),
                      )
                    else
                      const SizedBox(height: 5),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
