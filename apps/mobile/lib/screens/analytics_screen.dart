import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../services/auth_service.dart';
import '../services/dashboard_api_service.dart';
import '../utils/load_error_message.dart';
import '../utils/show_api_error.dart';
import '../utils/currency_format.dart';
import 'clients_screen.dart';
import 'main_shell.dart';
import 'period_picker_screen.dart';
import 'subscription_screen.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  DateTime _rangeStart = DateTime.now().subtract(const Duration(days: 30));
  DateTime _rangeEnd = DateTime.now();
  final PageController _pageController = PageController();
  final ValueNotifier<int> _pageIndex = ValueNotifier<int>(0);
  bool _isLoading = false;
  String? _errorText;
  StudioAnalytics? _analytics;
  // Cache analytics by period key to avoid re-fetching the same range.
  final Map<String, StudioAnalytics> _analyticsCache = {};

  @override
  void initState() {
    super.initState();
    _loadAnalytics();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _pageIndex.dispose();
    super.dispose();
  }

  Future<void> _pickDateRange() async {
    final picked = await PeriodPickerScreen.show(
      context,
      DateTimeRange(start: _rangeStart, end: _rangeEnd),
    );
    if (picked != null && mounted) {
      setState(() {
        _rangeStart = picked.start;
        _rangeEnd = picked.end;
      });
      await _loadAnalytics();
    }
  }

  String get _periodText {
    final fmt = DateFormat('dd.MM.yyyy');
    return '${fmt.format(_rangeStart)} - ${fmt.format(_rangeEnd)}';
  }

  String get _fromIso => DateTime(
        _rangeStart.year,
        _rangeStart.month,
        _rangeStart.day,
      ).toUtc().toIso8601String();

  String get _toIso => DateTime(
        _rangeEnd.year,
        _rangeEnd.month,
        _rangeEnd.day,
        23,
        59,
        59,
      ).toUtc().toIso8601String();

  String _asPercent(double? value) {
    if (value == null) return '—';
    return '${(value * 100).toStringAsFixed(1)}%';
  }

  void _openClients({String? filter}) {
    final shell = context.findAncestorStateOfType<MainShellState>();
    if (shell != null) {
      shell.openClientsTab(initialFilter: filter);
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ClientsScreen(initialFilter: filter),
      ),
    );
  }

  Future<void> _loadAnalytics() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;

    final cacheKey = '$_fromIso|$_toIso';
    final cached = _analyticsCache[cacheKey];
    if (cached != null) {
      setState(() { _analytics = cached; _errorText = null; });
      return;
    }

    setState(() { _isLoading = true; _errorText = null; });
    try {
      final data = await DashboardApiService.getCurrentStudioAnalytics(
        token,
        fromIso: _fromIso,
        toIso: _toIso,
      );
      if (!mounted) return;
      if (data != null) {
        _analyticsCache[cacheKey] = data;
      }
      setState(() => _analytics = data);
    } catch (e) {
      if (!mounted) return;
      setState(
        () => _errorText = loadErrorMessage(
          context.read<LocaleProvider>(),
          e,
        ),
      );
      showApiError(context, e);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<LocaleProvider>(
      builder: (context, locale, _) {
        return Scaffold(
          backgroundColor: AppColors.backgroundSecondary,
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 16),
                  Text(
                    locale.t('analytics.title'),
                    style: TextStyle(
                      fontSize: 24.sp,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Period picker
                  Row(
                    children: [
                      Text(
                        locale.t('analytics.period'),
                    style: TextStyle(
                      fontSize: 14.sp,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: _pickDateRange,
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.backgroundPrimary,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppColors.borderPrimary),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  _periodText,
                                  style: TextStyle(
                                    fontSize: 14.sp,
                                    color: AppColors.textPrimary,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Icon(
                                Icons.calendar_today_outlined,
                                size: 18,
                                color: AppColors.textSecondary,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              if (_isLoading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (_analytics == null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.backgroundPrimary,
                    borderRadius: BorderRadius.circular(12),
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
                      OutlinedButton(
                        onPressed: _loadAnalytics,
                        child: Text(locale.t('analytics.retry')),
                      ),
                    ],
                  ),
                )
              else ...[
                _buildBasicKpisCard(locale),
                const SizedBox(height: 24),
                if (_analytics?.isPro == true) ...[
                  _buildClientsCard(locale),
                  const SizedBox(height: 24),
                  SizedBox(
                    height: 225,
                    child: PageView(
                      controller: _pageController,
                      onPageChanged: (i) => _pageIndex.value = i,
                      padEnds: false,
                      children: [
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          child: _buildIncomeExpensesSlide(locale),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          child: _buildSalesSlide(locale),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          child: _buildServicesSlide(locale),
                        ),
                      ],
                    ),
                  ),
                ] else
                  _buildProLockedCard(locale),
              ],
              const SizedBox(height: 20),
              if (_analytics?.isPro == true)
                ValueListenableBuilder<int>(
                  valueListenable: _pageIndex,
                  builder: (_, page, _) => Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(3, (i) {
                      return GestureDetector(
                        onTap: () => _pageController.animateToPage(
                          i,
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeOut,
                        ),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          width: i == page ? 20 : 8,
                          height: 6,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(3),
                            color: i == page
                                ? AppColors.analyticsPurple
                                : AppColors.neutral300,
                          ),
                        ),
                      );
                    }),
                  ),
                ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
        );
      },
    );
  }

  Widget _buildIncomeExpensesSlide(LocaleProvider locale) {
    return SingleChildScrollView(
      physics: const NeverScrollableScrollPhysics(),
      child: _buildIncomeExpensesCard(locale),
    );
  }

  Widget _buildSalesSlide(LocaleProvider locale) {
    final a = _analytics;
    return _buildSlideCard(
      title: locale.t('analytics.sessions'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Expanded(
                child: _buildAnalyticsMiniCard(
                  title: locale.t('analytics.sessionsScheduled'),
                  value: '${a?.trainingSessionsScheduled ?? 0}',
                  icon: Icons.calendar_today_outlined,
                  iconBg: AppColors.analyticsTealLight,
                  iconColor: AppColors.analyticsTeal,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildAnalyticsMiniCard(
                  title: locale.t('analytics.sessionsCancelled'),
                  value: '${a?.trainingSessionsCancelled ?? 0}',
                  icon: Icons.event_busy_outlined,
                  iconBg: AppColors.analyticsTealLight,
                  iconColor: AppColors.analyticsTeal,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildAnalyticsMiniCard(
                  title: locale.t('analytics.utilization'),
                  value: _asPercent(a?.averageUtilization),
                  icon: Icons.donut_small,
                  iconBg: AppColors.analyticsPurpleLight,
                  iconColor: AppColors.analyticsPurple,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildAnalyticsMiniCard(
                  title: locale.t('analytics.activeEnrollments'),
                  value: '${a?.enrollmentsActive ?? 0}',
                  icon: Icons.group_outlined,
                  iconBg: AppColors.analyticsPurpleLight,
                  iconColor: AppColors.analyticsPurple,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildServicesSlide(LocaleProvider locale) {
    final a = _analytics;
    return _buildSlideCard(
      title: locale.t('analytics.trainings'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildAnalyticsMiniCard(
            title: locale.t('analytics.trainingsActive'),
            value: '${a?.trainingsActiveInPeriod ?? 0}',
            fullWidth: true,
            icon: Icons.fitness_center,
            iconBg: AppColors.analyticsPurpleLight,
            iconColor: AppColors.analyticsPurple,
          ),
          const SizedBox(height: 12),
          _buildAnalyticsMiniCard(
            title: locale.t('analytics.topTraining'),
            value: a?.topTrainingName ?? '—',
            fullWidth: true,
            icon: Icons.star_outline,
            iconBg: AppColors.analyticsPurpleLight,
            iconColor: AppColors.analyticsPurple,
          ),
          const SizedBox(height: 12),
          _buildAnalyticsMiniCard(
            title: locale.t('analytics.topTrainer'),
            value: a?.topTrainerName ?? '—',
            fullWidth: true,
            icon: Icons.person_outline,
            iconBg: AppColors.analyticsTealLight,
            iconColor: AppColors.analyticsTeal,
          ),
        ],
      ),
    );
  }

  Widget _buildSlideCard({required String title, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 16.sp,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }

  Widget _buildAnalyticsMiniCard({
    required String title,
    required String value,
    bool fullWidth = false,
    IconData? icon,
    Color? iconBg,
    Color? iconColor,
  }) {
    final bg = iconBg ?? AppColors.analyticsPurpleLight;
    final icoColor = iconColor ?? AppColors.analyticsPurple;
    return Container(
      width: fullWidth ? double.infinity : null,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.backgroundSecondary,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          if (icon != null) ...[
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
              child: Icon(icon, size: 20, color: icoColor),
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 14.sp,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 16.sp,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildClientsCard(LocaleProvider locale) {
    final total = _analytics?.clientsTotal ?? 0;
    final regular = _analytics?.clientsRegular ?? 0;
    final newCount = _analytics?.clientsNewInPeriod ?? 0;
    final sleepers = _analytics?.clientsInactive ?? 0;
    final regularPct = total > 0 ? regular / total : 0.0;
    final newPct = total > 0 ? newCount / total : 0.0;
    final sleepersPct = total > 0 ? sleepers / total : 0.0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(12),
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
        children: [
          Text(
            locale.t('analytics.clients'),
            style: TextStyle(
              fontSize: 16.sp,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                locale.t('analytics.allClients'),
                style: TextStyle(fontSize: 14.sp, color: AppColors.textSecondary),
              ),
              Text(
                '$total',
                style: TextStyle(
                  fontSize: 18.sp,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Segmented bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: SizedBox(
              height: 8,
              child: Row(
                children: [
                  if (regularPct > 0)
                    Expanded(
                      flex: (regularPct * 1000).round().clamp(1, 1000),
                      child: Container(color: AppColors.analyticsPurpleLight),
                    ),
                  if (newPct > 0)
                    Expanded(
                      flex: (newPct * 1000).round().clamp(1, 1000),
                      child: Container(color: AppColors.analyticsTealLight),
                    ),
                  if (sleepersPct > 0)
                    Expanded(
                      flex: (sleepersPct * 1000).round().clamp(1, 1000),
                      child: Container(
                        color: AppColors.analyticsSleepersRed.withValues(
                          alpha: 0.5,
                        ),
                      ),
                    ),
                  if (total == 0)
                    Expanded(child: Container(color: AppColors.neutral200)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Legend
          Wrap(
            spacing: 16,
            runSpacing: 8,
            children: [
              _buildLegendDot(
                AppColors.analyticsPurpleLight,
                locale.t('analytics.regular'),
                locale.t('analytics.regularHint'),
              ),
              _buildLegendDot(
                AppColors.analyticsTealLight,
                locale.t('analytics.new'),
                locale.t('analytics.inPeriod'),
              ),
              _buildLegendDot(
                AppColors.analyticsSleepersRed.withValues(alpha: 0.5),
                locale.t('analytics.inactive'),
                locale.t('analytics.inactiveHint'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton.icon(
              onPressed: () => _openClients(filter: 'sleepers'),
              icon: const Icon(Icons.people_outline),
              label: const Text('Open clients'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBasicKpisCard(LocaleProvider locale) {
    final a = _analytics;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(12),
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
        children: [
          Text(
            locale.t('analytics.overview'),
            style: TextStyle(
              fontSize: 16.sp,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          _buildFinanceCard(
            iconBg: AppColors.analyticsTealLight,
            icon: Icons.trending_up,
            iconColor: AppColors.analyticsTeal,
            title: locale.t('analytics.revenue'),
            valueText: formatVnd(a?.revenueTotal ?? 0),
          ),
          const SizedBox(height: 12),
          _buildFinanceCard(
            iconBg: AppColors.analyticsPurpleLight,
            icon: Icons.event_note_outlined,
            iconColor: AppColors.analyticsPurple,
            title: locale.t('analytics.bookings'),
            valueText: '${a?.bookingCount ?? 0}',
          ),
          const SizedBox(height: 12),
          _buildFinanceCard(
            iconBg: AppColors.analyticsTealLight,
            icon: Icons.group_outlined,
            iconColor: AppColors.analyticsTeal,
            title: locale.t('analytics.clients'),
            valueText: '${a?.clientsTotal ?? 0}',
          ),
        ],
      ),
    );
  }

  Widget _buildProLockedCard(LocaleProvider locale) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(12),
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

  Widget _buildLegendDot(Color color, String label, String sub) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(shape: BoxShape.circle, color: color),
        ),
        const SizedBox(width: 6),
        Text(
          '$label ($sub)',
          style: TextStyle(fontSize: 11.sp, color: AppColors.textSecondary),
        ),
      ],
    );
  }

  Widget _buildIncomeExpensesCard(LocaleProvider locale) {
    final a = _analytics;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(12),
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
        children: [
          Text(
            locale.t('analytics.overview'),
            style: TextStyle(
              fontSize: 16.sp,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildFinanceCard(
                  iconBg: AppColors.analyticsTealLight,
                  icon: Icons.trending_up,
                  iconColor: AppColors.analyticsTeal,
                  title: locale.t('analytics.revenue'),
                  valueText: formatVnd(a?.revenueTotal ?? 0),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildFinanceCard(
                  iconBg: AppColors.analyticsPurpleLight,
                  icon: Icons.event_note_outlined,
                  iconColor: AppColors.analyticsPurple,
                  title: locale.t('analytics.bookings'),
                  valueText: '${a?.bookingCount ?? 0}',
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildFinanceCard(
                  iconBg: AppColors.analyticsTealLight,
                  icon: Icons.receipt_long_outlined,
                  iconColor: AppColors.analyticsTeal,
                  title: locale.t('analytics.averageCheck'),
                  valueText: formatVnd(a?.averagePerBooking ?? 0),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildFinanceCard(
                  iconBg: AppColors.analyticsPurpleLight,
                  icon: Icons.how_to_reg_outlined,
                  iconColor: AppColors.analyticsPurple,
                  title: locale.t('analytics.attendance'),
                  valueText: _asPercent(a?.attendanceRate),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildFinanceCard(
            iconBg: AppColors.analyticsExpensesOrange.withValues(alpha: 0.2),
            icon: Icons.person_off_outlined,
            iconColor: AppColors.analyticsExpensesOrange,
            title: locale.t('analytics.noShow'),
            valueText: '${a?.noshowCount ?? 0}',
          ),
        ],
      ),
    );
  }

  Widget _buildFinanceCard({
    required Color iconBg,
    required IconData icon,
    required Color iconColor,
    required String title,
    required String valueText,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.backgroundSecondary,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
            child: Icon(icon, size: 20, color: iconColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 14.sp,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  valueText,
                  style: TextStyle(
                    fontSize: 16.sp,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
