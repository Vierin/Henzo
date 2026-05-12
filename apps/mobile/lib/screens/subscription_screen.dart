import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../models/subscription.dart';
import '../models/subscription_pro_prices.dart';
import '../services/analytics_service.dart';
import '../services/auth_service.dart';
import '../services/subscription_api_service.dart';
import '../services/subscription_refresh_notifier.dart';
import '../utils/show_api_error.dart';

String _formatVndSite(int amount) {
  final raw = amount.toString();
  final buf = StringBuffer();
  final len = raw.length;
  for (var i = 0; i < len; i++) {
    if (i > 0 && (len - i) % 3 == 0) buf.write('.');
    buf.write(raw[i]);
  }
  return '${buf.toString()} VND';
}

List<String> _proFeatureLabels(LocaleProvider locale) => [
  locale.t('subscription.feature1'),
  locale.t('subscription.feature2'),
  locale.t('subscription.feature3'),
  locale.t('subscription.feature4'),
  locale.t('subscription.feature5'),
  locale.t('subscription.feature6'),
];

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  Subscription? _subscription;
  SubscriptionProPrices _prices = SubscriptionProPrices.fallbackStatic();
  bool _loading = true;
  String? _checkoutLoading; // 'monthly' | 'annual'
  String _billingInterval = 'monthly';
  SubscriptionRefreshNotifier? _subRefresh;

  @override
  void initState() {
    super.initState();
    AnalyticsService.instance.logEvent('paywall_opened');
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _subRefresh = context.read<SubscriptionRefreshNotifier>();
      _subRefresh!.addListener(_onSubscriptionRefresh);
      _load();
    });
  }

  void _onSubscriptionRefresh() {
    if (mounted) _load();
  }

  @override
  void dispose() {
    _subRefresh?.removeListener(_onSubscriptionRefresh);
    super.dispose();
  }

  Future<void> _load() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null) {
      setState(() => _loading = false);
      return;
    }
    setState(() => _loading = true);
    try {
      final results = await Future.wait<Object?>([
        SubscriptionApiService.getCurrent(token),
        SubscriptionApiService.getProPrices(token),
      ]);
      final sub = results[0] as Subscription?;
      final priceObj = results[1] as SubscriptionProPrices?;
      if (mounted) {
        setState(() {
          _subscription = sub;
          _prices = priceObj ?? SubscriptionProPrices.fallbackStatic();
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool get _isPro => _subscription?.type.toUpperCase() == 'PRO';

  Future<void> _openUrl(String? url) async {
    if (url == null || url.isEmpty) return;
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _handleSelectPlan(String interval) async {
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;
    setState(() => _checkoutLoading = interval);
    try {
      final url = await SubscriptionApiService.createCheckoutSession(
        token,
        interval,
      );
      if (mounted && url != null) {
        await _openUrl(url);
      } else if (mounted) {
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(
          const SnackBar(content: Text('Не удалось перейти к оплате')),
        );
      }
    } catch (e) {
      if (mounted) showApiError(context, e);
    } finally {
      if (mounted) setState(() => _checkoutLoading = null);
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
              locale.t('subscription.title'),
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            centerTitle: true,
            backgroundColor: AppColors.backgroundPrimary,
            foregroundColor: AppColors.textPrimary,
            elevation: 0,
          ),
          body: _loading
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const SizedBox(height: 8),
                        _CurrentPlanCard(isPro: _isPro),
                        const SizedBox(height: 16),
                        if (!_isPro) ...[
                          _BillingToggle(
                            billingInterval: _billingInterval,
                            annualSavePercent: _prices.annualSavePercent,
                            onChanged: (v) =>
                                setState(() => _billingInterval = v),
                          ),
                          const SizedBox(height: 16),
                          _PlanCard(
                            prices: _prices,
                            isAnnual: _billingInterval == 'annual',
                            onSubscribe: () =>
                                _handleSelectPlan(_billingInterval),
                            checkoutLoading: _checkoutLoading,
                          ),
                        ] else
                          const _ProEnabledCard(),
                      ],
                    ),
                  ),
                ),
        );
      },
    );
  }
}

class _CurrentPlanCard extends StatelessWidget {
  final bool isPro;

  const _CurrentPlanCard({required this.isPro});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        border: Border.all(color: AppColors.borderPrimary),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                isPro ? Icons.workspace_premium : Icons.verified_outlined,
                color: AppColors.primary500,
                size: 24,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Текущий план: ${isPro ? 'Pro' : 'Free'}',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      isPro
                          ? 'У вас подключен расширенный функционал Pro.'
                          : 'Сейчас у вас бесплатный план. Вы можете перейти на Pro в любой момент.',
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: AppColors.primary500.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  isPro ? 'PRO' : 'FREE',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary500,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ProEnabledCard extends StatelessWidget {
  const _ProEnabledCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        border: Border.all(color: AppColors.borderPrimary),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.check_circle, color: AppColors.primary500, size: 20),
              const SizedBox(width: 8),
              const Text(
                'План Pro активен',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Спасибо за подписку. Все функции Pro уже доступны в приложении.',
            style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _BillingToggle extends StatelessWidget {
  final String billingInterval;
  final int annualSavePercent;
  final ValueChanged<String> onChanged;

  const _BillingToggle({
    required this.billingInterval,
    required this.annualSavePercent,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.backgroundTertiary,
        border: Border.all(color: AppColors.borderPrimary),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Expanded(
            child: Material(
              color: billingInterval == 'monthly'
                  ? AppColors.backgroundPrimary
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
              child: InkWell(
                onTap: () => onChanged('monthly'),
                borderRadius: BorderRadius.circular(10),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Center(
                    child: Text(
                      'Месячный',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: billingInterval == 'monthly'
                            ? AppColors.primary500
                            : AppColors.textPrimary,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: Material(
              color: billingInterval == 'annual'
                  ? AppColors.backgroundPrimary
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
              child: InkWell(
                onTap: () => onChanged('annual'),
                borderRadius: BorderRadius.circular(10),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Center(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Годовой',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: billingInterval == 'annual'
                                ? AppColors.primary500
                                : AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.primary500,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '-$annualSavePercent%',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  static const Color _fireAccent = Color(0xFFE65100);

  final SubscriptionProPrices prices;
  final bool isAnnual;
  final VoidCallback onSubscribe;
  final String? checkoutLoading;

  const _PlanCard({
    required this.prices,
    required this.isAnnual,
    required this.onSubscribe,
    this.checkoutLoading,
  });

  @override
  Widget build(BuildContext context) {
    final locale = context.read<LocaleProvider>();
    final price = isAnnual ? prices.annualVnd : prices.monthlyVnd;
    final periodLabel = locale.t(
      isAnnual ? 'subscription.perYearShort' : 'subscription.perMonthShort',
    );

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        border: Border.all(color: AppColors.primary500.withValues(alpha: 0.5)),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary500.withValues(alpha: 0.1),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                Icons.rocket_launch_rounded,
                color: AppColors.primary500,
                size: 28,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      locale.t('profile.pro'),
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      locale.t('subscription.proTagline'),
                      style: const TextStyle(
                        fontSize: 14,
                        height: 1.25,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          if (isAnnual)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                _formatVndSite(prices.twelveMonthsCompareVnd),
                style: TextStyle(
                  fontSize: 18,
                  color: AppColors.textTertiary.withValues(alpha: 0.9),
                  decoration: TextDecoration.lineThrough,
                  decorationColor: AppColors.textTertiary.withValues(
                    alpha: 0.7,
                  ),
                ),
              ),
            ),
          Text(
            _formatVndSite(price),
            style: const TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            periodLabel,
            style: const TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 20),
          ..._proFeatureLabels(locale).map(
            (f) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.local_fire_department_rounded,
                    size: 22,
                    color: _fireAccent,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      f,
                      style: const TextStyle(
                        fontSize: 14,
                        height: 1.35,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: checkoutLoading != null ? null : onSubscribe,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary500,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: Text(
                checkoutLoading != null
                    ? locale.t('common.loading')
                    : locale.t('subscription.subscribe'),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            locale.t('subscription.noLongTerm'),
            style: const TextStyle(fontSize: 12, color: AppColors.textTertiary),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
