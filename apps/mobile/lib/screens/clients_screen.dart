import 'package:flutter/material.dart';
import 'dart:async';
import 'package:provider/provider.dart';
import '../../constants/colors.dart';
import '../../models/booking.dart';
import '../../models/client_summary.dart';
import '../../services/auth_service.dart';
import '../../services/cache/bookings_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/client_identity.dart';
import '../../widgets/clients/client_list_tile.dart';
import '../../widgets/clients/clients_filter_chip.dart';
import 'client_detail_screen.dart';

enum ClientFilter { all, sleepers, whiteList, blocked }

class ClientsScreen extends StatefulWidget {
  const ClientsScreen({super.key, this.initialFilter, this.initialQuery});

  final String? initialFilter;
  final String? initialQuery;

  @override
  State<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends State<ClientsScreen> {
  bool _isLoading = true;
  final _searchController = TextEditingController();
  Timer? _searchDebounce;
  String _searchQuery = '';
  ClientFilter _filter = ClientFilter.all;
  List<ClientSummary> _clients = [];

  @override
  void initState() {
    super.initState();
    _filter = _parseFilter(widget.initialFilter);
    final initialQuery = widget.initialQuery?.trim();
    if (initialQuery != null && initialQuery.isNotEmpty) {
      _searchController.text = initialQuery;
      _searchQuery = initialQuery;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
    _searchController.addListener(_onSearchChanged);
  }

  ClientFilter _parseFilter(String? raw) {
    switch (raw?.trim().toLowerCase()) {
      case 'sleepers':
        return ClientFilter.sleepers;
      case 'whitelist':
      case 'white_list':
      case 'white-list':
        return ClientFilter.whiteList;
      case 'blocked':
        return ClientFilter.blocked;
      default:
        return ClientFilter.all;
    }
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 250), () {
      if (!mounted) return;
      setState(() => _searchQuery = _searchController.text.trim());
    });
  }

  List<ClientSummary> _buildUniqueClients(List<Booking> bookings) {
    final map = <String, ClientSummary>{};
    final now = DateTime.now();
    final threeMonthsAgo = now.subtract(const Duration(days: 90));
    for (final b in bookings) {
      final u = b.user;
      final key = clientIdentityKey(b);
      if (key.isEmpty) continue;
      final existing = map[key];
      final userId = u?.id ?? existing?.userId;
      final email = u?.email ?? existing?.email;
      final phone = u?.phone ?? existing?.phone;
      final latestVisit =
          (existing == null || b.dateTime.isAfter(existing.lastVisit))
          ? b.dateTime
          : existing.lastVisit;
      map[key] = ClientSummary(
        key: key,
        name: u?.name ?? u?.email ?? 'Клиент',
        userId: userId,
        email: email,
        phone: phone,
        lastVisit: latestVisit,
        isSleeper: latestVisit.isBefore(threeMonthsAgo),
        visitsCount: (existing?.visitsCount ?? 0) + 1,
        isBlocked: existing?.isBlocked ?? false,
      );
    }
    final items = map.values.toList();
    items.sort((a, b) => b.lastVisit.compareTo(a.lastVisit));
    return items;
  }

  Future<void> _loadData() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }
    try {
      final primaryBookings = await context.read<BookingsCache>().getBookings(token);
      final enrollmentBookings =
          await DashboardApiService.getOwnerEnrollmentBookings(token);
      final blocklist = await DashboardApiService.getOwnerClientBlocklist(token);
      final blockedUserIds = blocklist
          .map((b) => b.userId)
          .whereType<String>()
          .toSet();
      final blockedEmails = blocklist
          .map((b) => b.email?.trim().toLowerCase())
          .whereType<String>()
          .toSet();
      final blockedPhones = blocklist
          .map((b) => b.phone?.trim())
          .whereType<String>()
          .toSet();
      final bookings = <Booking>[...primaryBookings, ...enrollmentBookings];
      if (mounted) {
        setState(() {
          _clients = _buildUniqueClients(bookings).map((c) {
            final userId = c.userId;
            final email = c.email?.trim().toLowerCase();
            final phone = c.phone?.trim();
            return ClientSummary(
              key: c.key,
              name: c.name,
              userId: c.userId,
              email: c.email,
              phone: c.phone,
              lastVisit: c.lastVisit,
              isSleeper: c.isSleeper,
              visitsCount: c.visitsCount,
              isBlocked: (userId != null && blockedUserIds.contains(userId)) ||
                  (email != null && blockedEmails.contains(email)) ||
                  (phone != null && blockedPhones.contains(phone)),
            );
          }).toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _clients = [];
          _isLoading = false;
        });
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(
          SnackBar(content: Text('Ошибка: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  List<ClientSummary> get _filteredClients {
    var list = _clients;

    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((c) {
        return (c.name.toLowerCase().contains(q)) ||
            (c.email?.toLowerCase().contains(q) ?? false) ||
            (c.phone?.contains(q) ?? false);
      }).toList();
    }

    switch (_filter) {
      case ClientFilter.all:
        break;
      case ClientFilter.sleepers:
        list = list.where((c) => c.isSleeper).toList();
        break;
      case ClientFilter.whiteList:
        list = list.where((c) => !c.isBlocked).toList();
        break;
      case ClientFilter.blocked:
        list = list.where((c) => c.isBlocked).toList();
        break;
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final clients = _filteredClients;

    return SafeArea(
      bottom: false,
      child: Scaffold(
        backgroundColor: AppColors.backgroundSecondary,
        appBar: AppBar(
          backgroundColor: AppColors.backgroundPrimary,
          foregroundColor: AppColors.textPrimary,
          elevation: 0,
          leading: IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.arrow_back),
            color: AppColors.textPrimary,
          ),
          title: const Text(
            'Клиенты',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          centerTitle: true,
        ),
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 16, 12, 12),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Поиск',
                  prefixIcon: const Icon(
                    Icons.search,
                    size: 22,
                    color: AppColors.textSecondary,
                  ),
                  filled: true,
                  fillColor: AppColors.backgroundPrimary,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                ),
              ),
            ),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              child: Row(
                children: [
                  ClientsFilterChip(
                    label: 'Все',
                    isSelected: _filter == ClientFilter.all,
                    onTap: () => setState(() => _filter = ClientFilter.all),
                  ),
                  const SizedBox(width: 8),
                  ClientsFilterChip(
                    label: 'Спящие',
                    isSelected: _filter == ClientFilter.sleepers,
                    onTap: () => setState(() => _filter = ClientFilter.sleepers),
                  ),
                  const SizedBox(width: 8),
                  ClientsFilterChip(
                    label: 'Белый список',
                    isSelected: _filter == ClientFilter.whiteList,
                    onTap: () =>
                        setState(() => _filter = ClientFilter.whiteList),
                  ),
                  const SizedBox(width: 8),
                  ClientsFilterChip(
                    label: 'Заблокированные',
                    isSelected: _filter == ClientFilter.blocked,
                    onTap: () => setState(() => _filter = ClientFilter.blocked),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                      color: AppColors.primary500,
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _loadData,
                    color: AppColors.primary500,
                    child: clients.isEmpty
                        ? ListView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            children: [
                              SizedBox(
                                height:
                                    MediaQuery.of(context).size.height * 0.45,
                                child: Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.people_outline,
                                        size: 64,
                                        color: AppColors.neutral300,
                                      ),
                                      const SizedBox(height: 16),
                                      Text(
                                        _filter == ClientFilter.all &&
                                                _searchQuery.isEmpty
                                            ? 'Нет клиентов'
                                            : 'Ничего не найдено',
                                        style: TextStyle(
                                          fontSize: 16,
                                          color: AppColors.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            physics: const AlwaysScrollableScrollPhysics(),
                            itemCount: clients.length,
                            itemBuilder: (context, i) {
                              final c = clients[i];
                              return ClientListTile(
                                name: c.name,
                                subtitle: c.email ?? c.phone ?? '',
                                visitsCount: c.visitsCount,
                                onTap: () => Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => ClientDetailScreen(
                                      clientKey: c.key,
                                      name: c.name,
                                      userId: c.userId,
                                      email: c.email,
                                      phone: c.phone,
                                      initialBlocked: c.isBlocked,
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
          ),
        ],
      ),
      ),
    );
  }
}
