import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../models/subscription.dart';
import '../models/service_item.dart';
import '../services/auth_service.dart';
import '../services/cache/salon_cache.dart';
import '../services/cache/services_staff_cache.dart';
import '../services/dashboard_api_service.dart';
import 'online_booking_screen.dart';
import 'services_screen.dart';
import 'settings_screen.dart';
import 'subscription_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Subscription? _subscription;
  bool _loadingSubscription = true;
  int _trainingsCount = 0;
  bool _loadingTrainingsCount = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadSubscription();
      _loadTrainingsCount();
    });
  }

  Future<void> _loadTrainingsCount() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) setState(() => _loadingTrainingsCount = false);
      return;
    }
    try {
      final salon = await context.read<SalonCache>().getSalon(token);
      final list = salon != null
          ? await context.read<ServicesStaffCache>().getServicesForSalon(
              token,
              salon.id,
            )
          : <ServiceItem>[];
      if (mounted) {
        setState(() {
          _trainingsCount = list.length;
          _loadingTrainingsCount = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingTrainingsCount = false);
    }
  }

  Future<void> _loadSubscription() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) setState(() => _loadingSubscription = false);
      return;
    }
    try {
      final sub = await DashboardApiService.getCurrentSubscription(token);
      if (mounted)
        setState(() {
          _subscription = sub;
          _loadingSubscription = false;
        });
    } catch (_) {
      if (mounted) setState(() => _loadingSubscription = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<LocaleProvider>(
      builder: (context, locale, _) {
        return Scaffold(
          backgroundColor: AppColors.backgroundSecondary,
          appBar: AppBar(
            title: Text(
              locale.t('profile.title'),
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            centerTitle: true,
            backgroundColor: AppColors.backgroundPrimary,
            foregroundColor: AppColors.textPrimary,
            elevation: 0,
            actions: [
              IconButton(
                tooltip: 'Настройки',
                icon: const Icon(Icons.settings_outlined),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const SettingsScreen()),
                  );
                },
              ),
            ],
          ),
          body: RefreshIndicator(
            onRefresh: () async {
              await Future.wait([_loadSubscription(), _loadTrainingsCount()]);
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildCurrentSubscriptionCard(),
                  const SizedBox(height: 24),
                  _buildFourCardsGrid(),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  static String _packageLabel(String? type) {
    if (type == null || type.isEmpty) return '—';
    switch (type.toUpperCase()) {
      case 'FREEMIUM':
        return 'FREEMIUM';
      case 'PRO':
        return 'PRO';
      default:
        return type;
    }
  }

  static String _statusLabel(bool loading, Subscription? sub) {
    if (loading) return 'LOADING';
    if (sub == null) return 'NONE';
    switch (sub.status.toUpperCase()) {
      case 'ACTIVE':
        return 'ACTIVE';
      case 'CANCELLED':
        return 'CANCELLED';
      case 'EXPIRED':
        return 'EXPIRED';
      case 'INACTIVE':
        return 'INACTIVE';
      default:
        return sub.status;
    }
  }

  String _mapProfilePackage(String packageCode) {
    final locale = context.read<LocaleProvider>();
    switch (packageCode.toUpperCase()) {
      case 'FREEMIUM':
        return locale.t('profile.free');
      case 'PRO':
        return locale.t('profile.pro');
      default:
        return packageCode;
    }
  }

  String _mapProfileStatus(String statusCode) {
    final locale = context.read<LocaleProvider>();
    switch (statusCode.toUpperCase()) {
      case 'LOADING':
        return locale.t('common.loading');
      case 'NONE':
        return locale.t('profile.noSubscription');
      case 'ACTIVE':
        return locale.t('profile.active');
      case 'CANCELLED':
        return locale.t('profile.cancelled');
      case 'EXPIRED':
        return locale.t('profile.expired');
      case 'INACTIVE':
        return locale.t('profile.inactive');
      default:
        return statusCode;
    }
  }

  Widget _buildCurrentSubscriptionCard() {
    final localeProv = context.read<LocaleProvider>();
    final sub = _subscription;
    final isFreePlan =
        !_loadingSubscription &&
        (sub == null ||
            (sub.type.toUpperCase() == 'FREEMIUM' && (sub.amount ?? 0) <= 0));
    final isActive = _loadingSubscription ? false : (sub?.isActive ?? isFreePlan);
    final tierLabel = isFreePlan
        ? localeProv.t('profile.free')
        : _mapProfilePackage(_packageLabel(sub?.type));
    final borderColor = isActive ? AppColors.primary500 : AppColors.error500;
    final statusColor = isActive ? AppColors.primary500 : AppColors.error500;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () =>
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const SubscriptionScreen()),
            ).then((_) {
              if (mounted) _loadSubscription();
            }),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.backgroundPrimary,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor, width: 2),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.06),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 10),
                    Text(
                      '${localeProv.t('profile.yourSubscription')}: $tierLabel',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    if (_loadingSubscription)
                      Text(
                        '${localeProv.t('profile.status')}: '
                        '${localeProv.t('common.loading')}',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textSecondary,
                        ),
                      )
                    else if (isFreePlan)
                      Text(
                        '${localeProv.t('profile.status')}: ${localeProv.t('profile.active')}',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: statusColor,
                        ),
                      )
                    else
                      Text(
                        '${localeProv.t('profile.status')}: '
                        '${_mapProfileStatus(_statusLabel(false, sub))}',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: statusColor,
                        ),
                      ),
                    const SizedBox(height: 4),
                    if (!isFreePlan && sub != null)
                      Text(
                        context.read<LocaleProvider>().t('profile.proActive'),
                        style: const TextStyle(
                          fontSize: 14,
                          color: AppColors.textSecondary,
                        ),
                      ),
                  ],
                ),
              ),
              Icon(Icons.launch, size: 22, color: AppColors.textSecondary),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFourCardsGrid() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: _ProfileGridCard(
                title: 'Настройки салона',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const SettingsScreen()),
                  );
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _ProfileGridCard(
                title: 'Онлайн бронирование',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const OnlineBookingScreen(),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _ProfileTrainingsRowCard(
          count: _trainingsCount,
          loading: _loadingTrainingsCount,
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => const ServicesScreen(trainingMode: true),
              ),
            ).then((_) {
              if (mounted) _loadTrainingsCount();
            });
          },
        ),
      ],
    );
  }
}

/// Full-width row: «Тренировки» + count of training types.
class _ProfileTrainingsRowCard extends StatelessWidget {
  const _ProfileTrainingsRowCard({
    required this.count,
    required this.loading,
    required this.onTap,
  });

  final int count;
  final bool loading;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: AppColors.backgroundPrimary,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.borderPrimary),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.06),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              const Expanded(
                child: Text(
                  'Тренировки',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              if (loading)
                const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              else
                Text(
                  '$count',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary600,
                  ),
                ),
              const SizedBox(width: 4),
              Icon(
                Icons.chevron_right,
                color: AppColors.textSecondary,
                size: 22,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProfileGridCard extends StatelessWidget {
  final String title;
  final VoidCallback onTap;

  const _ProfileGridCard({required this.title, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          constraints: const BoxConstraints(minHeight: 96),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.backgroundPrimary,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.borderPrimary),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.06),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
