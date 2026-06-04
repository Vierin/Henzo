import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../models/booking.dart';
import '../../models/client_summary.dart';
import '../../models/owner_studio_client.dart';
import '../../services/auth_service.dart';
import '../../services/cache/bookings_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/client_identity.dart';
import '../../utils/owner_studio_setup_errors.dart';
import '../../utils/synthetic_guest.dart';
import '../../widgets/app_search_prefix_icon.dart';
import '../../widgets/clients/add_owner_client_sheet.dart';
import '../../widgets/clients/client_list_tile.dart';
import '../../widgets/clients/clients_filter_chip.dart';
import 'client_detail_screen.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

enum ClientFilter { all, sleepers, whiteList, blocked }

class _ClientsListRow {
  const _ClientsListRow.header(this.letter) : client = null;
  const _ClientsListRow.tile(this.client) : letter = null;

  final String? letter;
  final ClientSummary? client;

  bool get isHeader => client == null;
}

class ClientsScreen extends StatefulWidget {
  const ClientsScreen({super.key, this.initialFilter, this.initialQuery});

  final String? initialFilter;
  final String? initialQuery;

  @override
  State<ClientsScreen> createState() => ClientsScreenState();
}

class ClientsScreenState extends State<ClientsScreen> {
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

  /// Used when switching to the Clients tab from [MainShellState] (single list).
  void applyRouteArgs({String? filter, String? query}) {
    final q = query?.trim();
    setState(() {
      _filter = _parseFilter(filter);
      if (q != null && q.isNotEmpty) {
        _searchController.text = q;
        _searchQuery = q;
      }
    });
    _loadData();
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

  bool? _guestFromEmail(String? email) {
    final e = email?.toLowerCase();
    if (e != null && e.endsWith('@henzo.local')) return true;
    return null;
  }

  String _bookingRowName(
    String? userName,
    String? email,
    String Function(String) tr,
  ) {
    if (isSyntheticGuestEmail(email)) {
      return tr('ownerClient.anonymousRosterTitle');
    }
    final n = userName?.trim() ?? '';
    if (n.isNotEmpty) return n;
    final em = email?.trim();
    if (em != null && em.isNotEmpty) return em;
    return tr('ownerClient.fallbackClientName');
  }

  String _rosterRowTitle(OwnerStudioClientRow r, String Function(String) tr) {
    if (isSyntheticGuestEmail(r.email) ||
        (r.name ?? '').trim().toLowerCase() == 'walk-in') {
      return tr('ownerClient.anonymousRosterTitle');
    }
    if (r.isGuest == true) {
      final n = (r.name ?? '').trim();
      if (n.isNotEmpty && !n.contains('@')) return n;
      return tr('ownerClient.guestTag');
    }
    if ((r.name ?? '').trim().isNotEmpty) return r.name!.trim();
    return r.email ?? r.phone ?? tr('ownerClient.fallbackClientName');
  }

  String _clientCardTitle(ClientSummary c, String Function(String) tr) {
    if (isSyntheticGuestEmail(c.email) ||
        c.name.trim().toLowerCase() == 'walk-in') {
      return tr('ownerClient.anonymousRosterTitle');
    }
    if (c.isGuest == true) {
      final n = c.name.trim();
      if (n.isNotEmpty && !n.contains('@')) return n;
      return tr('ownerClient.guestTag');
    }
    final n = c.name.trim();
    if (n.isNotEmpty) return n;
    return c.email?.trim() ??
        c.phone?.trim() ??
        tr('ownerClient.fallbackClientName');
  }

  String _clientCardSecondary(ClientSummary c, String Function(String) tr) {
    final visits = tr(
      'ownerClient.cardVisits',
    ).replaceAll('{count}', '${c.visitsCount}');
    if (c.isGuest == true && !isSyntheticGuestEmail(c.email)) {
      return '$visits · ${tr('ownerClient.guestTag')}';
    }
    return visits;
  }

  List<ClientSummary> _buildUniqueClients(
    List<Booking> bookings,
    String Function(String) tr,
  ) {
    final map = <String, ClientSummary>{};
    final now = DateTime.now();
    final threeMonthsAgo = now.subtract(const Duration(days: 90));
    for (final b in bookings) {
      final u = b.user;
      if (isAnonymousRosterClient(email: u?.email, name: u?.name)) continue;
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
        name: _bookingRowName(u?.name, email, tr),
        userId: userId,
        email: email,
        phone: phone,
        lastVisit: latestVisit,
        isSleeper: latestVisit.isBefore(threeMonthsAgo),
        visitsCount: (existing?.visitsCount ?? 0) + 1,
        isBlocked: existing?.isBlocked ?? false,
        isGuest: _guestFromEmail(email) ?? existing?.isGuest,
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
      final tr = context.read<LocaleProvider>().t;
      final primaryBookings = await context.read<BookingsCache>().getBookings(
        token,
      );
      final enrollmentBookings =
          await DashboardApiService.getOwnerEnrollmentBookings(token);
      final blocklist = await DashboardApiService.getOwnerClientBlocklist(
        token,
      );
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
      final roster = await DashboardApiService.getOwnerStudioClients(token);
      final now = DateTime.now();
      final threeMonthsAgo = now.subtract(const Duration(days: 90));

      ClientSummary mergeTwo(ClientSummary a, ClientSummary b) {
        final last = a.lastVisit.isAfter(b.lastVisit)
            ? a.lastVisit
            : b.lastVisit;
        final visits = a.visitsCount > b.visitsCount
            ? a.visitsCount
            : b.visitsCount;
        final guest = a.isGuest == true || b.isGuest == true
            ? true
            : (a.isGuest ?? b.isGuest);
        return ClientSummary(
          key: a.key,
          name: a.name.trim().isNotEmpty ? a.name : b.name,
          userId: a.userId ?? b.userId,
          email: a.email ?? b.email,
          phone: a.phone ?? b.phone,
          lastVisit: last,
          isSleeper: last.isBefore(threeMonthsAgo),
          visitsCount: visits,
          isBlocked: a.isBlocked || b.isBlocked,
          isGuest: guest,
        );
      }

      final merged = <String, ClientSummary>{};
      void addOrMerge(ClientSummary c) {
        if (c.key.isEmpty) return;
        final ex = merged[c.key];
        merged[c.key] = ex == null ? c : mergeTwo(ex, c);
      }

      final bookingClients = _buildUniqueClients(bookings, tr);
      for (final c in bookingClients) {
        final userId = c.userId;
        final email = c.email?.trim().toLowerCase();
        final phone = c.phone?.trim();
        final blocked =
            (userId != null && blockedUserIds.contains(userId)) ||
            (email != null && blockedEmails.contains(email)) ||
            (phone != null && blockedPhones.contains(phone));
        addOrMerge(
          ClientSummary(
            key: c.key,
            name: c.name,
            userId: c.userId,
            email: c.email,
            phone: c.phone,
            lastVisit: c.lastVisit,
            isSleeper: c.isSleeper,
            visitsCount: c.visitsCount,
            isBlocked: blocked,
            isGuest: c.isGuest,
          ),
        );
      }

      for (final r in roster) {
        if (isAnonymousRosterClient(email: r.email, name: r.name)) continue;
        final displayName = _rosterRowTitle(r, tr);
        final key = clientProfileIdentityKey(
          userId: r.userId,
          email: r.email,
          phone: r.phone,
          name: displayName,
        );
        final userId = r.userId;
        final email = r.email?.trim().toLowerCase();
        final phone = r.phone?.trim();
        final blocked =
            (blockedUserIds.contains(userId)) ||
            (email != null && blockedEmails.contains(email)) ||
            (phone != null && blockedPhones.contains(phone));
        addOrMerge(
          ClientSummary(
            key: key,
            name: displayName,
            userId: r.userId,
            email: r.email,
            phone: r.phone,
            lastVisit: r.lastVisit ?? DateTime.now(),
            isSleeper: r.lastVisit?.isBefore(threeMonthsAgo) ?? false,
            visitsCount: r.visitsCount,
            isBlocked: blocked,
            isGuest: r.isGuest,
          ),
        );
      }

      final byUserId = <String, ClientSummary>{};
      final withoutUserId = <ClientSummary>[];
      for (final c in merged.values) {
        final uid = c.userId?.trim();
        if (uid != null && uid.isNotEmpty) {
          final ex = byUserId[uid];
          byUserId[uid] = ex == null ? c : mergeTwo(ex, c);
        } else {
          withoutUserId.add(c);
        }
      }
      final list = [...byUserId.values, ...withoutUserId]
          .where(
            (c) => !isAnonymousRosterClient(email: c.email, name: c.name),
          )
          .toList()
        ..sort((a, b) => b.lastVisit.compareTo(a.lastVisit));

      if (mounted) {
        setState(() {
          _clients = list;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _clients = [];
          _isLoading = false;
        });
        if (!isOwnerStudioNotReadyError(e)) {
          ScaffoldMessenger.maybeOf(context)?.showSnackBar(
            SnackBar(content: Text('Ошибка: $e'), backgroundColor: Colors.red),
          );
        }
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

  int _countFor(ClientFilter filter) {
    switch (filter) {
      case ClientFilter.all:
        return _clients.length;
      case ClientFilter.sleepers:
        return _clients.where((c) => c.isSleeper).length;
      case ClientFilter.whiteList:
        return _clients.where((c) => !c.isBlocked).length;
      case ClientFilter.blocked:
        return _clients.where((c) => c.isBlocked).length;
    }
  }

  static String _groupLetter(String name) {
    final t = name.trim();
    if (t.isEmpty) return '#';
    final ch = t.characters.first.toUpperCase();
    final r = ch.runes.first;
    final latin = r >= 0x41 && r <= 0x5A;
    final cyr = (r >= 0x0410 && r <= 0x042F) || r == 0x0401;
    return (latin || cyr) ? ch : '#';
  }

  static int _compareGroupKeys(String a, String b) {
    const hash = '#';
    if (a == hash && b != hash) return 1;
    if (b == hash && a != hash) return -1;
    return a.compareTo(b);
  }

  List<_ClientsListRow> _flattenGrouped(List<ClientSummary> list) {
    if (list.isEmpty) return [];
    final sorted = [...list]
      ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    final groups = <String, List<ClientSummary>>{};
    for (final c in sorted) {
      final key = _groupLetter(c.name);
      groups.putIfAbsent(key, () => []).add(c);
    }
    final keys = groups.keys.toList()..sort(_compareGroupKeys);
    final out = <_ClientsListRow>[];
    for (final k in keys) {
      out.add(_ClientsListRow.header(k));
      for (final c in groups[k]!) {
        out.add(_ClientsListRow.tile(c));
      }
    }
    return out;
  }

  String _membersOverline(int n) {
    final t = context.read<LocaleProvider>().t;
    final h = n % 100;
    if (h >= 11 && h <= 14) {
      return t('ownerClient.clientCountMany').replaceAll('{n}', '$n');
    }
    switch (n % 10) {
      case 1:
        return t('ownerClient.clientCountOne').replaceAll('{n}', '$n');
      case 2:
      case 3:
      case 4:
        return t('ownerClient.clientCountFew').replaceAll('{n}', '$n');
      default:
        return t('ownerClient.clientCountMany').replaceAll('{n}', '$n');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;
    final tr = context.read<LocaleProvider>().t;
    final clients = _filteredClients;
    final rows = _flattenGrouped(clients);
    final total = _clients.length;

    return SafeArea(
      bottom: false,
      child: Scaffold(
        backgroundColor: AppColors.backgroundSecondary,
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(
                kScreenPaddingHorizontal,
                12,
                kScreenPaddingHorizontal,
                4,
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _membersOverline(total),
                          style:
                              textTheme.labelSmall?.copyWith(
                                color: AppColors.textPrimary,
                                letterSpacing: -0.3,
                                fontSize: 14.sp,
                                fontWeight: FontWeight.w500,
                              ) ??
                              TextStyle(
                                fontSize: 14.sp,
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.w500,
                                letterSpacing: -0.3,
                              ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Клиенты',
                          style:
                              textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ) ??
                              TextStyle(
                                fontSize: 24.sp,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                                letterSpacing: -0.3,
                              ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Tooltip(
                    message: 'Добавить клиента',
                    child: SizedBox(
                      width: 36,
                      height: 36,
                      child: Material(
                        color: AppColors.primary500,
                        shape: const CircleBorder(),
                        elevation: 0,
                        clipBehavior: Clip.antiAlias,
                        child: InkWell(
                          onTap: () async {
                            final token = context
                                .read<AuthService>()
                                .accessToken;
                            if (token == null || token.isEmpty) return;
                            await showAddOwnerClientSheet(
                              context,
                              mode: AddOwnerClientMode.directoryOnly,
                              onSuccess: _loadData,
                            );
                          },
                          customBorder: const CircleBorder(),
                          child: const Center(
                            child: Icon(
                              Icons.add,
                              size: 20,
                              color: AppColors.textInverse,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                kScreenPaddingHorizontal,
                12,
                kScreenPaddingHorizontal,
                8,
              ),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: context.watch<LocaleProvider>().t('ownerClient.searchHint'),
                  hintStyle: TextStyle(
                    fontSize: 14.sp,
                    color: AppColors.textTertiary,
                  ),
                  prefixIcon: const AppSearchPrefixIcon(),
                  prefixIconConstraints: AppSearchPrefixIcon.prefixConstraints(),
                  isDense: true,
                  filled: true,
                  fillColor: AppColors.backgroundPrimary,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(
                      color: AppColors.borderPrimary,
                    ),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(
                      color: AppColors.borderPrimary,
                      width: 1,
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(
                      color: AppColors.primary500,
                      width: 1.5,
                    ),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 14,
                  ),
                ),
              ),
            ),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(
                kScreenPaddingHorizontal,
                4,
                kScreenPaddingHorizontal,
                0,
              ),
              child: Row(
                children: [
                  ClientsFilterChip(
                    label: tr('ownerClient.filterAll'),
                    count: _countFor(ClientFilter.all),
                    isSelected: _filter == ClientFilter.all,
                    onTap: () => setState(() => _filter = ClientFilter.all),
                  ),
                  const SizedBox(width: 4),
                  ClientsFilterChip(
                    label: tr('ownerClient.filterSleepers'),
                    count: _countFor(ClientFilter.sleepers),
                    isSelected: _filter == ClientFilter.sleepers,
                    onTap: () =>
                        setState(() => _filter = ClientFilter.sleepers),
                  ),
                  const SizedBox(width: 4),
                  ClientsFilterChip(
                    label: tr('ownerClient.filterWhiteList'),
                    count: _countFor(ClientFilter.whiteList),
                    isSelected: _filter == ClientFilter.whiteList,
                    onTap: () =>
                        setState(() => _filter = ClientFilter.whiteList),
                  ),
                  const SizedBox(width: 4),
                  ClientsFilterChip(
                    label: tr('ownerClient.filterBlocked'),
                    count: _countFor(ClientFilter.blocked),
                    isSelected: _filter == ClientFilter.blocked,
                    onTap: () => setState(() => _filter = ClientFilter.blocked),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
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
                              padding: const EdgeInsets.symmetric(
                                horizontal: kScreenPaddingHorizontal,
                              ),
                              children: [
                                SizedBox(
                                  height:
                                      MediaQuery.of(context).size.height * 0.45,
                                  child: Center(
                                    child: Column(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
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
                                            fontSize: 16.sp,
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
                              padding: const EdgeInsets.fromLTRB(
                                kScreenPaddingHorizontal,
                                0,
                                kScreenPaddingHorizontal,
                                24,
                              ),
                              physics: const AlwaysScrollableScrollPhysics(),
                              itemCount: rows.length,
                              itemBuilder: (context, i) {
                                final row = rows[i];
                                if (row.isHeader) {
                                  final letter = row.letter!;
                                  final isFirst = i == 0;
                                  return Padding(
                                    padding: EdgeInsets.only(
                                      top: isFirst ? 0 : 14,
                                      bottom: 6,
                                      left: 12,
                                    ),
                                    child: Align(
                                      alignment: Alignment.centerLeft,
                                      child: Text(
                                        letter,
                                        style:
                                            textTheme.titleSmall?.copyWith(
                                              fontWeight: FontWeight.w700,
                                              fontSize: 16.sp,
                                              color: AppColors.textPrimary,
                                            ) ??
                                            TextStyle(
                                              fontSize: 16.sp,
                                              fontWeight: FontWeight.w700,
                                              color: AppColors.textPrimary,
                                            ),
                                      ),
                                    ),
                                  );
                                }
                                final c = row.client!;
                                return ClientListTile(
                                  name: _clientCardTitle(c, tr),
                                  secondaryLine: _clientCardSecondary(c, tr),
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
