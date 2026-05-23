import 'dart:io';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/brand_typography.dart';
import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import '../../services/health_service.dart';
import '../../services/workout_service.dart';
import 'client_profile_settings_screen.dart';

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

  static HealthData? _cachedHealth;
  static DateTime? _healthCachedAt;

  int _classesVisited = 0;
  bool _loadingStats = true;

  HealthData? _health;
  bool _loadingHealth = true;
  bool _healthPermissionDenied = false;
  bool _healthNeedsInstall = false;

  bool _sendingWorkout = false;
  String _selectedWorkout = 'Yoga';

  @override
  void initState() {
    super.initState();
    _loadStats();
    _probeHealth();
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

  Future<void> _probeHealth() async {
    if (mounted) setState(() => _loadingHealth = true);
    final hasAccess = await HealthService.hasAccess();
    if (!hasAccess) {
      if (!mounted) return;
      setState(() {
        _loadingHealth = false;
        _healthPermissionDenied = true;
      });
      return;
    }
    await _fetchHealthData();
  }

  Future<void> _connectHealth() async {
    if (mounted) setState(() => _loadingHealth = true);
    final result = await HealthService.connect();
    if (!result.ok) {
      if (!mounted) return;
      setState(() {
        _loadingHealth = false;
        _healthPermissionDenied = true;
        _healthNeedsInstall =
            result.issue == HealthConnectIssue.needsHealthConnectApp;
      });
      final msg = result.userMessage;
      if (msg != null && msg.isNotEmpty) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Text(msg),
              duration: const Duration(seconds: 7),
            ),
          );
      }
      return;
    }
    await _fetchHealthData();
  }

  Future<void> _fetchHealthData() async {
    try {
      final data = await HealthService.fetchData();
      if (!mounted) return;
      setState(() {
        _health = data;
        _loadingHealth = false;
        _healthPermissionDenied = false;
        _healthNeedsInstall = false;
      });
      _cachedHealth = data;
      _healthCachedAt = DateTime.now();
      if (!data.hasAnyMetrics && mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            const SnackBar(
              content: Text(
                'Permissions OK, but no data yet. In Health Connect open '
                'Data and access → Huawei Health and allow sharing steps '
                'and calories.',
              ),
              duration: Duration(seconds: 8),
            ),
          );
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingHealth = false);
    }
  }

  bool get _healthFullySynced =>
      !_loadingHealth &&
      !_healthPermissionDenied &&
      (_health?.hasAnyMetrics ?? false);

  Future<void> _refreshHealth() async {
    if (_cachedHealth != null &&
        _healthCachedAt != null &&
        DateTime.now().difference(_healthCachedAt!) < _statsCacheTtl) {
      if (mounted) {
        setState(() {
          _health = _cachedHealth;
          _loadingHealth = false;
        });
      }
      return;
    }
    if (await HealthService.hasAccess()) {
      await _fetchHealthData();
    } else {
      await _connectHealth();
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
        child: RefreshIndicator(
          onRefresh: () async {
            await Future.wait([
              _loadStats(force: true),
              _refreshHealth(),
            ]);
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(
              kScreenPaddingHorizontal,
              16,
              kScreenPaddingHorizontal,
              24,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            displayName,
                            style: BrandTypography.greeting(context).copyWith(
                              fontSize: 24,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _loadingStats
                                ? 'Loading classes visited...'
                                : '$_classesVisited classes visited',
                            style: BrandTypography.sectionSubtitle(context),
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
                const SizedBox(height: 24),
                _buildActivitySection(),
                const SizedBox(height: 20),
                _buildStartWorkoutButton(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildActivitySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Today\'s Activity',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.3,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        _buildHealthSourceBanner(),
        if (_healthFullySynced) ...[
          const SizedBox(height: 10),
          _buildHealthCards(),
        ],
      ],
    );
  }

  static const _workoutTypes = [
    'Yoga', 'Running', 'Cycling', 'Swimming',
    'Strength', 'HIIT', 'Pilates', 'Walking',
  ];

  Future<void> _onSendWorkout() async {
    setState(() => _sendingWorkout = true);
    final result = await WorkoutService.scheduleWorkoutReminder(
      workoutType: _selectedWorkout,
      minutesBefore: 10,
    );
    if (!mounted) return;
    setState(() => _sendingWorkout = false);

    final msg = switch (result.status) {
      WorkoutSendStatus.sent => 'Тренировка отправлена на часы',
      WorkoutSendStatus.notificationOnly =>
        'Уведомление отправлено (часы не подключены)',
      WorkoutSendStatus.failed => 'Не удалось отправить',
    };

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  Widget _buildStartWorkoutButton() {
    final isIOS = Platform.isIOS;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Запустить тренировку',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.3,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.backgroundPrimary,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Workout type selector
              SizedBox(
                height: 36,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _workoutTypes.length,
                  separatorBuilder: (context, index) => const SizedBox(width: 8),
                  itemBuilder: (_, i) {
                    final type = _workoutTypes[i];
                    final selected = type == _selectedWorkout;
                    return GestureDetector(
                      onTap: () => setState(() => _selectedWorkout = type),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: selected
                              ? AppColors.primary500
                              : AppColors.backgroundSecondary,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          type,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: selected
                                ? Colors.white
                                : AppColors.textSecondary,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 14),
              // Description row
              Row(
                children: [
                  Icon(
                    isIOS ? Icons.watch : Icons.watch_outlined,
                    size: 16,
                    color: AppColors.textTertiary,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      isIOS
                          ? 'Уведомление придёт на Apple Watch — нажми "Начать" на часах'
                          : 'Уведомление придёт на смарт-часы с Wear OS',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.textTertiary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              // Send button
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _sendingWorkout ? null : _onSendWorkout,
                  icon: _sendingWorkout
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.play_arrow_rounded, size: 20),
                  label: Text(
                    _sendingWorkout
                        ? 'Отправляем...'
                        : 'Начать $_selectedWorkout через 10 мин',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary500,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildHealthSourceBanner() {
    final isIOS = Platform.isIOS;
    final name = isIOS ? 'Apple Health' : 'Health Connect';
    final hasPermission = !_healthPermissionDenied && !_loadingHealth;
    final isSynced = _healthFullySynced;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          // Icon
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              gradient: isIOS
                  ? const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFFFF6B6B), Color(0xFFE8192C)],
                    )
                  : const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF4285F4), Color(0xFF1A73E8)],
                    ),
            ),
            child: const Icon(Icons.favorite, color: Colors.white, size: 22),
          ),
          const SizedBox(width: 12),
          // Title + subtitle
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -0.2,
                    color: AppColors.textPrimary,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  isSynced
                      ? 'Connected'
                      : hasPermission && !isSynced
                      ? 'Waiting for data from Huawei Health'
                      : (_healthNeedsInstall
                          ? 'Install Health Connect app'
                          : 'Not connected'),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: isSynced
                        ? AppColors.textSecondary
                        : AppColors.textTertiary,
                  ),
                ),
              ],
            ),
          ),
          if (_loadingHealth)
            const SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.primary500,
              ),
            )
          else if (isSynced)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: const Color(0xFF34A853).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(
                      color: Color(0xFF34A853),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 5),
                  const Text(
                    'Synced',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF34A853),
                      letterSpacing: -0.1,
                    ),
                  ),
                ],
              ),
            )
          else if (hasPermission)
            FilledButton(
              onPressed: () {
                _cachedHealth = null;
                _healthCachedAt = null;
                _fetchHealthData();
              },
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.backgroundSecondary,
                foregroundColor: AppColors.textPrimary,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              child: const Text(
                'Refresh',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            )
          else
            FilledButton(
              onPressed: _connectHealth,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary500,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              child: Text(
                _healthNeedsInstall ? 'Install' : 'Connect',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildHealthCards() {
    final health = _health;
    final steps = health?.steps ?? 0;
    final calories = health?.calories ?? 0;
    final workouts = health?.workouts ?? 0;

    return Row(
      children: [
        _HealthCard(
          icon: Icons.directions_walk_outlined,
          value: _formatSteps(steps),
          label: 'Steps',
          color: const Color(0xFF4A90D9),
        ),
        const SizedBox(width: 8),
        _HealthCard(
          icon: Icons.local_fire_department_outlined,
          value: '$calories',
          label: 'kcal',
          color: AppColors.primary500,
        ),
        const SizedBox(width: 8),
        _HealthCard(
          icon: Icons.fitness_center_outlined,
          value: '$workouts',
          label: '7d workouts',
          color: const Color(0xFF34A853),
        ),
      ],
    );
  }

  String _formatSteps(int steps) {
    if (steps >= 1000) {
      final k = steps / 1000;
      return '${k.toStringAsFixed(k.truncateToDouble() == k ? 0 : 1)}k';
    }
    return '$steps';
  }
}

class _HealthCard extends StatelessWidget {
  const _HealthCard({
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.backgroundPrimary,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.5,
                color: AppColors.textPrimary,
                height: 1.1,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: AppColors.textTertiary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
