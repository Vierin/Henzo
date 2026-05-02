import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import '../../services/client_schedule_store.dart';
import '../../utils/formatters.dart';
import '../../widgets/client/client_placeholder_card.dart';

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
      setState(() {
        _items = const [];
        _loading = false;
        _error = e.toString();
      });
    }
  }

  String? _bookingId(Map<String, dynamic> item) {
    return ClientScheduleStore.bookingIdFromItem(item);
  }

  bool _canCancelBooking(Map<String, dynamic> item) {
    return ClientScheduleStore.canCancelClientBooking(item);
  }

  Future<void> _cancelBooking(Map<String, dynamic> item) async {
    final token = context.read<AuthService>().accessToken;
    final bookingId = _bookingId(item);
    if (token == null || token.isEmpty || bookingId == null) return;
    if (_cancelingBookingIds.contains(bookingId)) return;
    setState(() => _cancelingBookingIds.add(bookingId));
    try {
      await ApiClient.put('/bookings/$bookingId/cancel', token);
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

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ClientPlaceholderCard(
            title: 'Failed to load schedule',
            subtitle: _error!,
          ),
        ],
      );
    }
    if (_items.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          ClientPlaceholderCard(
            title: 'No classes scheduled yet',
            subtitle: 'Your upcoming bookings will appear here.',
          ),
        ],
      );
    }
    return RefreshIndicator(
      onRefresh: () => _load(force: true),
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: _items.length,
        separatorBuilder: (_, __) =>
            const Divider(height: 1, color: AppColors.borderPrimary),
        itemBuilder: (_, index) {
          final item = _items[index];
          final training = item['training'] is Map
              ? Map<String, dynamic>.from(item['training'] as Map)
              : <String, dynamic>{};
          final trainer = item['trainer'] is Map
              ? (item['trainer']['name'] ?? '').toString()
              : '';
          final studio = item['studio'] is Map
              ? Map<String, dynamic>.from(item['studio'] as Map)
              : <String, dynamic>{};
          final startsAt = DateTime.tryParse(
            (item['startsAt'] ?? '').toString(),
          )?.toLocal();
          final duration = (training['duration'] as num?)?.toInt();
          final price = (training['price'] as num?)?.toDouble();
          final className = (training['name'] ?? 'Class').toString();
          final studioName = (studio['name'] ?? '').toString();
          final canCancel = _canCancelBooking(item);
          final bookingId = _bookingId(item);
          final isCanceling =
              bookingId != null && _cancelingBookingIds.contains(bookingId);

          return Container(
            color: AppColors.backgroundPrimary,
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 82,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        timeLabelHm(startsAt),
                        style: const TextStyle(
                          fontSize: 28 / 1.6,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      if (duration != null)
                        Text(
                          '($duration min)',
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                          ),
                        ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        className,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 20 / 1.6,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      if (trainer.isNotEmpty)
                        Text(
                          trainer,
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 13,
                          ),
                        ),
                      if (studioName.isNotEmpty)
                        Text(
                          studioName,
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    if (price != null)
                      Text(
                        formatVnd(price),
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary500,
                          fontSize: 26 / 1.6,
                        ),
                      ),
                    if (canCancel) ...[
                      const SizedBox(height: 8),
                      SizedBox(
                        height: 30,
                        child: OutlinedButton(
                          onPressed: isCanceling
                              ? null
                              : () => _cancelBooking(item),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            side: const BorderSide(color: AppColors.error500),
                            foregroundColor: AppColors.error500,
                            textStyle: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          child: isCanceling
                              ? const SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: AppColors.error500,
                                  ),
                                )
                              : const Text('Cancel'),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
