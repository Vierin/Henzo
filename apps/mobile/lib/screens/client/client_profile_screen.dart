import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import 'client_passes_tab.dart';
import 'client_profile_settings_screen.dart';
import 'client_schedule_tab.dart';

class ClientProfileScreen extends StatefulWidget {
  const ClientProfileScreen({super.key});

  @override
  State<ClientProfileScreen> createState() => _ClientProfileScreenState();
}

class _ClientProfileScreenState extends State<ClientProfileScreen>
    with AutomaticKeepAliveClientMixin {
  static const Duration _statsCacheTtl = Duration(minutes: 2);
  static int? _cachedClassesVisited;
  static DateTime? _statsCachedAt;

  int _classesVisited = 0;
  bool _loadingStats = true;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  @override
  bool get wantKeepAlive => true;

  Future<void> _loadStats({bool force = false}) async {
    if (!force &&
        _cachedClassesVisited != null &&
        _statsCachedAt != null &&
        DateTime.now().difference(_statsCachedAt!) < _statsCacheTtl) {
      if (mounted) {
        setState(() {
          _classesVisited = _cachedClassesVisited!;
          _loadingStats = false;
        });
      }
      return;
    }
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (!mounted) return;
      setState(() {
        _classesVisited = 0;
        _loadingStats = false;
      });
      return;
    }
    if (mounted) setState(() => _loadingStats = true);
    try {
      final raw = await ApiClient.get('/fitness/client/profile-stats', token);
      final map = raw is Map<String, dynamic>
          ? raw
          : (raw is Map ? Map<String, dynamic>.from(raw) : <String, dynamic>{});
      if (!mounted) return;
      setState(() {
        _classesVisited = (map['classesVisited'] as num?)?.toInt() ?? 0;
        _loadingStats = false;
      });
      _cachedClassesVisited = _classesVisited;
      _statsCachedAt = DateTime.now();
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingStats = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final auth = context.watch<AuthService>();
    final user = auth.user;
    final displayName = user?.name?.trim().isNotEmpty == true
        ? user!.name!.trim()
        : 'Client';
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: DefaultTabController(
          length: 2,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 8, 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            displayName,
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _loadingStats
                                ? 'Loading classes visited...'
                                : '$_classesVisited classes visited',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Profile settings',
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const ClientProfileSettingsScreen(),
                          ),
                        );
                      },
                      icon: const Icon(
                        Icons.settings_outlined,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 12),
                child: TabBar(
                  labelColor: AppColors.primary500,
                  unselectedLabelColor: AppColors.textSecondary,
                  indicatorColor: AppColors.primary500,
                  indicatorSize: TabBarIndicatorSize.tab,
                  dividerColor: AppColors.borderPrimary,
                  tabs: [
                    Tab(text: 'Schedule'),
                    Tab(text: 'Passes'),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              const Expanded(
                child: TabBarView(
                  children: [
                    ClientScheduleTab(),
                    ClientPassesTab(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
