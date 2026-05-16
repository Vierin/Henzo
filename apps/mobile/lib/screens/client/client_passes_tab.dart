import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/layout.dart';
import '../../services/auth_service.dart';
import '../../services/client_schedule_store.dart';
import '../../utils/client_schedule_owner_session.dart';
import '../../widgets/client/client_placeholder_card.dart';
import '../../widgets/dashboard/owner_daily_schedule_session_card.dart';
import '../public_studio_schedule_screen.dart';

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
        padding: const EdgeInsets.all(kScreenPaddingHorizontal),
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
        padding: const EdgeInsets.all(kScreenPaddingHorizontal),
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

          return OwnerDailyScheduleSessionCard(
            session: session,
            subtitleLabel: presentation.subtitleLabel,
            showLocationPin: presentation.showLocationPin,
            showSubtitleLeadingIcon: presentation.showSubtitleLeadingIcon,
            trainerLine: presentation.trainerLine,
            dimPastSessions: false,
            bookActionLabel: 'Book again',
            onBookAgain: () => _bookAgain(item),
            onTap: () => _bookAgain(item),
          );
        },
      ),
    );
  }
}
