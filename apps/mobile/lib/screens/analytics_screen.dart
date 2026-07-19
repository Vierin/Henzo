import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../constants/layout.dart';
import '../l10n/locale_provider.dart';
import '../services/analytics_repository.dart';
import '../services/auth_service.dart';
import '../services/dashboard_api_service.dart';
import '../utils/currency_format.dart';
import '../utils/load_error_message.dart';
import '../utils/show_api_error.dart';
import '../widgets/analytics/analytics_dashboard_skeleton.dart';
import '../widgets/analytics/analytics_dashboard_widgets.dart';
import '../widgets/settings/settings_typography.dart';
import 'subscription_screen.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  final _repository = AnalyticsRepository.instance;

  int _selectedDays = 30;
  bool _isMetricsLoading = false;
  bool _isTrendLoading = false;
  String? _errorText;
  AnalyticsDashboardSnapshot? _snapshot;
  DateTime? _studioCreatedAt;
  int _loadGeneration = 0;

  @override
  void initState() {
    super.initState();
    _loadStudioCreatedAt();
    _loadAnalytics();
  }

  int? get _studioAgeDays {
    final created = _studioCreatedAt;
    if (created == null) return null;
    final now = DateTime.now();
    final createdDay = DateTime(created.year, created.month, created.day);
    final today = DateTime(now.year, now.month, now.day);
    return today.difference(createdDay).inDays + 1;
  }

  Set<int> get _disabledPeriodDays {
    final age = _studioAgeDays;
    if (age == null) return const {};
    return {7, 30, 90}.where((days) => days > 7 && age < days).toSet();
  }

  Future<void> _loadStudioCreatedAt() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;

    final studio = await DashboardApiService.getCurrentStudio(token);
    if (!mounted) return;

    final disabled = _disabledPeriodDaysForAge(studio?.createdAt);
    final shouldResetPeriod = disabled.contains(_selectedDays);
    setState(() {
      _studioCreatedAt = studio?.createdAt;
      if (shouldResetPeriod) {
        _selectedDays = 7;
        _snapshot = null;
        _isMetricsLoading = true;
      }
    });
    if (shouldResetPeriod) {
      _loadAnalytics(force: true);
    }
  }

  Set<int> _disabledPeriodDaysForAge(DateTime? createdAt) {
    if (createdAt == null) return const {};
    final now = DateTime.now();
    final createdDay = DateTime(
      createdAt.year,
      createdAt.month,
      createdAt.day,
    );
    final today = DateTime(now.year, now.month, now.day);
    final age = today.difference(createdDay).inDays + 1;
    return {7, 30, 90}.where((days) => days > 7 && age < days).toSet();
  }

  DateTime get _rangeEnd {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day, 23, 59, 59);
  }

  DateTime get _rangeStart {
    final end = _rangeEnd;
    return DateTime(
      end.year,
      end.month,
      end.day,
    ).subtract(Duration(days: _selectedDays - 1));
  }

  String get _cacheKey => _repository.cacheKey(
        selectedDays: _selectedDays,
        rangeStartIso: _isoStart(_rangeStart),
      );

  String _isoStart(DateTime day) =>
      DateTime(day.year, day.month, day.day).toUtc().toIso8601String();

  Future<void> _loadAnalytics({bool force = false}) async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;

    final key = _cacheKey;
    final generation = ++_loadGeneration;

    if (!force && _repository.isFresh(key)) {
      final cached = _repository.snapshotFor(key);
      if (cached != null) {
        setState(() {
          _snapshot = cached;
          _errorText = null;
          _isMetricsLoading = false;
          _isTrendLoading = !cached.isTrendLoaded;
        });
        if (!cached.isTrendLoaded) {
          await _loadTrend(token: token, key: key, generation: generation);
        }
        return;
      }
    }

    if (!force) {
      final stale = _repository.snapshotFor(key);
      if (stale != null) {
        setState(() {
          _snapshot = stale;
          _errorText = null;
          _isMetricsLoading = false;
          _isTrendLoading = !stale.isTrendLoaded;
        });
      }
    }

    if (_snapshot == null) {
      setState(() {
        _isMetricsLoading = true;
        _errorText = null;
      });
    }

    try {
      final metrics = await _repository.fetchMetrics(
        token: token,
        selectedDays: _selectedDays,
        rangeStart: _rangeStart,
        rangeEnd: _rangeEnd,
      );
      if (!mounted || generation != _loadGeneration || key != _cacheKey) {
        return;
      }

      final partial = metrics.copyWith(
        trend: _snapshot?.trend ?? const [],
        isTrendLoaded: false,
      );
      _repository.put(key, partial);
      setState(() {
        _snapshot = partial;
        _isMetricsLoading = false;
        _isTrendLoading = true;
        _errorText = null;
      });

      await _loadTrend(token: token, key: key, generation: generation);
    } catch (e) {
      if (!mounted || generation != _loadGeneration) return;
      if (_snapshot == null) {
        setState(
          () => _errorText = loadErrorMessage(
            context.read<LocaleProvider>(),
            e,
          ),
        );
        showApiError(context, e);
      }
    } finally {
      if (mounted && generation == _loadGeneration) {
        setState(() => _isMetricsLoading = false);
      }
    }
  }

  Future<void> _loadTrend({
    required String token,
    required String key,
    required int generation,
  }) async {
    if (!mounted || generation != _loadGeneration || key != _cacheKey) return;

    setState(() => _isTrendLoading = true);

    try {
      final trend = await _repository.fetchTrend(
        token: token,
        rangeStart: _rangeStart,
        rangeEnd: _rangeEnd,
      );
      if (!mounted || generation != _loadGeneration || key != _cacheKey) {
        return;
      }

      final base = _snapshot ?? _repository.snapshotFor(key);
      if (base == null) return;

      final full = base.copyWith(trend: trend, isTrendLoaded: true);
      _repository.put(key, full);
      setState(() {
        _snapshot = full;
        _isTrendLoading = false;
      });
    } catch (_) {
      if (!mounted || generation != _loadGeneration) return;
      setState(() => _isTrendLoading = false);
    }
  }

  void _onPeriodSelected(int days) {
    if (_selectedDays == days || _disabledPeriodDays.contains(days)) return;
    setState(() {
      _selectedDays = days;
      final cached = _repository.snapshotFor(_cacheKey);
      _snapshot = cached;
      _isMetricsLoading = cached == null;
      _isTrendLoading = cached != null && !cached.isTrendLoaded;
      _errorText = null;
    });
    _loadAnalytics();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<LocaleProvider>(
      builder: (context, locale, _) {
        final periodLabels = {
          7: locale.t('analytics.last7Days'),
          30: locale.t('analytics.last30Days'),
          90: locale.t('analytics.last90Days'),
        };
        final showDashboardSkeleton = _snapshot == null && _isMetricsLoading;
        final showDashboard = _snapshot != null;
        final showError = _snapshot == null && !_isMetricsLoading;

        return Scaffold(
          backgroundColor: AppColors.backgroundSecondary,
          body: SafeArea(
            child: RefreshIndicator(
              color: AppColors.primary500,
              onRefresh: () => _loadAnalytics(force: true),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(
                  kScreenPaddingHorizontal,
                  12,
                  kScreenPaddingHorizontal,
                  32,
                ),
                children: [
                  Center(
                    child: Text(
                      locale.t('analytics.title'),
                      style: SettingsTypography.screenTitle(context),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 16),
                  AnalyticsPeriodChips(
                    selectedDays: _selectedDays,
                    labels: periodLabels,
                    disabledDays: _disabledPeriodDays,
                    disabledTapMessage: locale.t('analytics.notEnoughDataYet'),
                    onSelected: _onPeriodSelected,
                  ),
                  const SizedBox(height: 16),
                  if (showDashboardSkeleton)
                    const AnalyticsDashboardSkeleton()
                  else if (showError)
                    _buildErrorCard(locale)
                  else if (showDashboard)
                    _buildDashboard(locale, _snapshot!),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildErrorCard(LocaleProvider locale) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(kAnalyticsCardRadius),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _errorText == null
                ? locale.t('analytics.noData')
                : locale.t('analytics.failedLoad'),
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 14.sp,
            ),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _loadAnalytics,
            child: Text(locale.t('analytics.retry')),
          ),
        ],
      ),
    );
  }

  Widget _buildDashboard(
    LocaleProvider locale,
    AnalyticsDashboardSnapshot snapshot,
  ) {
    final current = snapshot.current;
    final previous = snapshot.previous;

    if (!current.isPro) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AnalyticsMetricCard(
            label: locale.t('analytics.revenue'),
            value: formatVnd(current.revenueTotal),
            iconAsset: 'assets/icons/icon-trending.svg',
            iconBackground: AppColors.success100,
            iconColor: AppColors.success600,
          ),
          const SizedBox(height: 12),
          _buildProLockedCard(locale),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AnalyticsMetricCard(
          label: locale.t('analytics.revenue'),
          value: formatVnd(current.revenueTotal),
          subtitle: formatAnalyticsDeltaWithPeriod(
            current: current.revenueTotal,
            previous: previous?.revenueTotal,
            periodDays: _selectedDays,
            previousDaysTemplate: locale.t('analytics.fromPreviousDays'),
          ),
          iconAsset: 'assets/icons/icon-trending.svg',
          iconBackground: AppColors.success100,
          iconColor: AppColors.success600,
        ),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: AnalyticsMetricCard(
                compact: true,
                label: locale.t('analytics.activeClients'),
                value: '${current.clientsTotal}',
                subtitle: formatAnalyticsDelta(
                  current: current.clientsTotal.toDouble(),
                  previous: previous?.clientsTotal.toDouble(),
                ),
                iconAsset: 'assets/icons/icon-clients.svg',
                iconWidth: 22,
                iconHeight: 20,
                iconBackground: AppColors.success100,
                iconColor: AppColors.success600,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AnalyticsOccupancyCard(
                compact: true,
                label: locale.t('analytics.avgOccupancy'),
                percent: current.averageUtilization,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: AnalyticsMetricCard(
                compact: true,
                label: locale.t('analytics.noShow'),
                value: '${current.noshowCount}',
                subtitle: formatAnalyticsSharePercent(
                  part: current.noshowCount,
                  total: current.bookingCount,
                  labelTemplate: locale.t('analytics.ofBookings'),
                ),
                subtitleColor: AppColors.textSecondary,
                iconAsset: 'assets/icons/icon-person-minus.svg',
                iconBackground: AppColors.error100,
                iconColor: AppColors.error500,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AnalyticsMetricCard(
                compact: true,
                label: locale.t('analytics.waitlistRequests'),
                value: '${current.enrollmentsActive}',
                subtitle: formatAnalyticsDelta(
                  current: current.enrollmentsActive.toDouble(),
                  previous: previous?.enrollmentsActive.toDouble(),
                ),
                iconAsset: 'assets/icons/icon-add-people.svg',
                iconWidth: 24,
                iconHeight: 20,
                iconBackground: AppColors.analyticsPurpleLight,
                iconColor: AppColors.analyticsPurple,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (_isTrendLoading || !snapshot.isTrendLoaded)
          const AnalyticsRevenueTrendCardSkeleton()
        else
          AnalyticsRevenueTrendCard(
            title: locale.t('analytics.revenueTrend'),
            points: snapshot.trend,
            localeTag: locale.languageTag,
          ),
      ],
    );
  }

  Widget _buildProLockedCard(LocaleProvider locale) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(kAnalyticsCardRadius),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            locale.t('analytics.proLockedTitle'),
            style: TextStyle(
              fontSize: 16.sp,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            locale.t('analytics.proLockedDescription'),
            style: TextStyle(
              fontSize: 14.sp,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const SubscriptionScreen()),
              );
            },
            child: Text(locale.t('analytics.upgradeToPro')),
          ),
        ],
      ),
    );
  }
}
