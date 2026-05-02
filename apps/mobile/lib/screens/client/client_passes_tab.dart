import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../services/auth_service.dart';
import '../../services/client_schedule_store.dart';
import '../../utils/formatters.dart';
import '../public_studio_schedule_screen.dart';
import '../../widgets/client/client_placeholder_card.dart';

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
      setState(() {
        _items = const [];
        _loading = false;
        _error = e.toString();
      });
    }
  }

  String _statusLabel(Map<String, dynamic> item) {
    final status = (item['sessionStatus'] ?? '').toString().toUpperCase();
    final endsAt =
        DateTime.tryParse((item['endsAt'] ?? '').toString())?.toLocal();
    if (status == 'COMPLETED') return 'Completed';
    if (endsAt != null && endsAt.isBefore(DateTime.now())) return 'Completed';
    return 'Scheduled';
  }

  Color _statusColor(String status) {
    if (status == 'Completed') return const Color(0xFF2E7D32);
    return AppColors.primary500;
  }

  void _bookAgain(Map<String, dynamic> item) {
    final studio = item['studio'] is Map
        ? Map<String, dynamic>.from(item['studio'] as Map)
        : <String, dynamic>{};
    final studioId = (studio['id'] ?? item['studioId'] ?? '').toString();
    final studioName = (studio['name'] ?? 'Studio').toString();
    if (studioId.isEmpty) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(content: Text('Studio is unavailable for rebooking')),
      );
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PublicStudioScheduleScreen(
          studioId: studioId,
          studioName: studioName,
        ),
      ),
    );
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
            title: 'Failed to load passes',
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
            title: 'No classes yet',
            subtitle: 'Your class cards will appear here.',
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
          final studio = item['studio'] is Map
              ? Map<String, dynamic>.from(item['studio'] as Map)
              : <String, dynamic>{};
          final studioName = (studio['name'] ?? '').toString();
          final startsAt =
              DateTime.tryParse((item['startsAt'] ?? '').toString())?.toLocal();
          final status = _statusLabel(item);
          final statusColor = _statusColor(status);
          // All rows here are past sessions — always offer rebooking.
          const canBookAgain = true;

          return Container(
            color: AppColors.backgroundPrimary,
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            (training['name'] ?? 'Class').toString(),
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            dateTimeLabelDayMonthHm(startsAt),
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 12,
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
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                          color: statusColor.withValues(alpha: 0.35),
                        ),
                      ),
                      child: Text(
                        status,
                        style: TextStyle(
                          color: statusColor,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
                if (canBookAgain) ...[
                  const SizedBox(height: 10),
                  Align(
                    alignment: Alignment.centerRight,
                    child: SizedBox(
                      height: 32,
                      child: FilledButton(
                        onPressed: () => _bookAgain(item),
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.primary500,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          textStyle: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        child: const Text('Book again'),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}
