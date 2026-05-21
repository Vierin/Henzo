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

  bool _sendingWorkout = false;
  String _selectedWorkout = 'Yoga';

  @override
  void initState() {
    super.initState();
    _loadStats();
    _loadHealth();
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

  Future<void> _loadHealth({bool force = false}) async {
    if (!force &&
        _cachedHealth != null &&
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
    if (mounted) setState(() => _loadingHealth = true);
    final granted = await HealthService.requestPermissions();
    if (!granted) {
      if (!mounted) return;
      setState(() {
        _loadingHealth = false;
        _healthPermissionDenied = true;
      });
      return;
    }
    try {
      final data = await HealthService.fetchData();
      if (!mounted) return;
      setState(() {
        _health = data;
        _loadingHealth = false;
        _healthPermissionDenied = false;
      });
      _cachedHealth = data;
      _healthCachedAt = DateTime.now();
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingHealth = false);
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
              _loadHealth(force: true),
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
        const SizedBox(height: 10),
        if (_healthPermissionDenied)
          _buildPermissionBanner()
        else if (_loadingHealth)
          _buildHealthSkeletons()
        else
          _buildHealthCards(),
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
      WorkoutSendStatus.sent => 'Тренировка отправлена на часы ✓',
      WorkoutSendStatus.notificationOnly =>
        'Уведомление отправлено — проверь часы',
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
    final isConnected = !_healthPermissionDenied && !_loadingHealth;

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
                  isConnected ? 'Connected' : 'Not connected',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: isConnected
                        ? AppColors.textSecondary
                        : AppColors.textTertiary,
                  ),
                ),
              ],
            ),
          ),
          // Synced pill
          if (isConnected)
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
            ),
        ],
      ),
    );
  }

  Widget _buildPermissionBanner() {
    return GestureDetector(
      onTap: () => _loadHealth(force: true),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.backgroundPrimary,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppColors.primary500.withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          children: [
            const Icon(Icons.favorite_outline, color: AppColors.primary500, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Allow Health access to see your activity',
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                ),
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.textTertiary, size: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildHealthSkeletons() {
    return Row(
      children: List.generate(3, (i) {
        final isLast = i == 2;
        return Expanded(
          child: Container(
            margin: EdgeInsets.only(right: isLast ? 0 : 8),
            height: 96,
            decoration: BoxDecoration(
              color: AppColors.backgroundPrimary,
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        );
      }),
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
