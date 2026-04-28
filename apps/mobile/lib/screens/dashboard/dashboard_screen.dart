import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../utils/show_api_error.dart';
import '../../models/salon.dart';
import '../../services/auth_service.dart';
import '../../services/cache/salon_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../services/notifications_store.dart';
import '../../widgets/dashboard/dashboard_header_pill.dart';
import '../../widgets/dashboard/dashboard_link_card.dart';
import '../../widgets/dashboard/dashboard_setup_card.dart';
import '../../widgets/owner_training_session_card.dart';
import '../app_settings_screen.dart';
import '../notifications_screen.dart';
import '../salon_setup_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Salon? _salon;
  List<OwnerTrainingSession> _todaySessions = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
  }

  Future<void> _loadData() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    final auth = context.read<AuthService>();
    final token = auth.accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) {
        setState(() {
          _salon = null;
          _isLoading = false;
        });
      }
      return;
    }
    try {
      final salon = await context.read<SalonCache>().getSalon(token);
      final now = DateTime.now();
      final from = DateTime(now.year, now.month, now.day);
      final to = from.add(const Duration(days: 1));
      List<OwnerTrainingSession> sessions = [];
      try {
        sessions = await DashboardApiService.getOwnerTrainingSessions(
          token,
          fromIso: from.toUtc().toIso8601String(),
          toIso: to.toUtc().toIso8601String(),
        );
        sessions.sort((a, b) => a.startsAt.compareTo(b.startsAt));
      } catch (_) {
        // Daily sessions are non-blocking for dashboard bootstrap.
        sessions = [];
      }
      if (mounted) {
        setState(() {
          _salon = salon;
          _todaySessions = sessions;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _todaySessions = [];
          _isLoading = false;
        });
        showApiError(context, e);
      }
    }
  }

  Future<void> _handleRefresh() async {
    await _loadData();
  }

  String? _ownerTrainerFallback() {
    final u = context.read<AuthService>().user;
    if (u == null) return null;
    final name = u.name;
    if (name != null && name.trim().isNotEmpty) return name.trim();
    final email = u.email.trim();
    if (email.isNotEmpty) return email;
    return null;
  }

  Widget _sessionStatusBadge(OwnerTrainingSession s) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 8,
        vertical: 4,
      ),
      decoration: BoxDecoration(
        color: _statusColor(s.status).withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        s.status,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: _statusColor(s.status),
        ),
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return AppColors.success600;
      case 'CANCELLED':
      case 'CANCELED':
        return AppColors.error600;
      case 'PENDING':
        return AppColors.warning600;
      default:
        return AppColors.primary600;
    }
  }

  Widget _buildDailySchedule() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderPrimary),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Daily schedule',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          if (_todaySessions.isEmpty)
            Text(
              'No trainings scheduled for today',
              style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
            )
          else
            ..._todaySessions.map(
              (s) {
                final badge = _sessionStatusBadge(s);
                return OwnerTrainingSessionCard(
                  session: s,
                  margin:
                      const EdgeInsets.only(left: 10, right: 10, bottom: 10),
                  statusBadge: badge,
                  trainerFallbackName: _ownerTrainerFallback(),
                  onTap: () => OwnerTrainingSessionCard.showDetailsModal(
                    context,
                    s,
                    statusBadge: badge,
                    trainerFallbackName: _ownerTrainerFallback(),
                    onEditTraining: s.trainingId.isNotEmpty
                        ? () => Navigator.of(context).pushNamed(
                              '/services',
                              arguments: {
                                'editTrainingId': s.trainingId,
                              },
                            )
                        : null,
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _handleRefresh,
          color: AppColors.primary500,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 16, 12, 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Expanded(
                        child: Text(
                          _isLoading || _salon == null
                              ? context.watch<LocaleProvider>().t(
                                  'nav.dashboard',
                                )
                              : (_salon!.name ?? ''),
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        alignment: WrapAlignment.end,
                        children: [
                          if (_salon != null)
                            DashboardHeaderPill(
                              icon: Icons.star_rounded,
                              label: _salon!.rating != null
                                  ? _salon!.rating!.toStringAsFixed(1)
                                  : '—',
                              onTap: null,
                            ),
                          Consumer<NotificationsStore>(
                            builder: (context, store, _) {
                              final count = store.unreadCount;
                              return Stack(
                                clipBehavior: Clip.none,
                                children: [
                                  DashboardHeaderIconPill(
                                    icon: Icons.notifications_outlined,
                                    onTap: () => Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) =>
                                            const NotificationsScreen(),
                                      ),
                                    ),
                                  ),
                                  if (count > 0)
                                    Positioned(
                                      top: -4,
                                      right: -4,
                                      child: Container(
                                        padding: const EdgeInsets.all(4),
                                        constraints: const BoxConstraints(
                                          minWidth: 18,
                                          minHeight: 18,
                                        ),
                                        decoration: const BoxDecoration(
                                          color: AppColors.primary500,
                                          shape: BoxShape.circle,
                                        ),
                                        alignment: Alignment.center,
                                        child: Text(
                                          count > 99 ? '99+' : '$count',
                                          style: const TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w600,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ),
                                    ),
                                ],
                              );
                            },
                          ),
                          DashboardHeaderIconPill(
                            icon: Icons.settings_outlined,
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => const AppSettingsScreen(),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                // Link cards: клиенты
                if (!_isLoading && _salon != null) ...[
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Row(
                      children: [
                        Expanded(
                          child: DashboardLinkCard(
                            title: context.read<LocaleProvider>().t(
                              'dashboard.clients',
                            ),
                            icon: Icons.people_outline,
                            color: AppColors.primary100,
                            onTap: () =>
                                Navigator.of(context).pushNamed('/clients'),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
                if (_isLoading)
                  const SizedBox(
                    height: 120,
                    child: Center(
                      child: CircularProgressIndicator(
                        color: AppColors.primary500,
                      ),
                    ),
                  )
                else if (_salon == null)
                  DashboardSetupCard(
                    onSetupTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => SalonSetupScreen(
                          onSaved: () {
                            Navigator.pop(context);
                            _loadData();
                          },
                        ),
                      ),
                    ),
                  )
                else
                  _buildDailySchedule(),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
