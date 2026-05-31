import 'package:flutter/material.dart';
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
import 'package:flutter_screenutil/flutter_screenutil.dart';

class ClientScheduleTab extends StatefulWidget {
  const ClientScheduleTab({super.key});

  @override
  State<ClientScheduleTab> createState() => ClientScheduleTabState();
}

class ClientScheduleTabState extends State<ClientScheduleTab>
    with AutomaticKeepAliveClientMixin {
  bool _loading = true;
  List<Map<String, dynamic>> _items = const [];
  String? _error;
  final Set<String> _cancelingBookingIds = <String>{};

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
      final upcoming = ClientScheduleStore.upcomingItems(all);
      if (!mounted) return;
      setState(() {
        _items = upcoming;
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
        const SnackBar(content: Text('Booking cancelled')),
      );
      await _load(force: true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(content: Text('Failed to cancel booking: $e')),
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
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ClientPlaceholderCard(
            title: locale.t('clientActivity.scheduleLoadFailedTitle'),
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
            title: locale.t('clientActivity.scheduleEmptyTitle'),
            subtitle: locale.t('clientActivity.scheduleEmptySubtitle'),
          ),
        ],
      );
    }
    return RefreshIndicator(
      onRefresh: () => _load(force: true),
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(
          kScreenPaddingHorizontal,
          12,
          kScreenPaddingHorizontal,
          24,
        ),
        itemCount: _items.length,
        itemBuilder: (_, index) {
          final item = _items[index];
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
