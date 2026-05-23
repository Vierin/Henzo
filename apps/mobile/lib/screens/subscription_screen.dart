import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/app_config.dart';
import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../models/subscription.dart';
import '../services/analytics_service.dart';
import '../services/auth_service.dart';
import '../services/revenuecat_service.dart';
import '../services/subscription_api_service.dart';
import '../services/subscription_refresh_notifier.dart';
import '../utils/formatters.dart';
import '../utils/show_api_error.dart';
import '../widgets/auth/auth_form_styles.dart';
import '../widgets/settings/branded_settings_app_bar.dart';

const Color _activeBadgeBg = Color(0xFFE8F5E9);
const Color _activeBadgeFg = Color(0xFF2E7D32);

BoxDecoration _subscriptionCardDecoration() => BoxDecoration(
  color: AppColors.backgroundPrimary,
  borderRadius: BorderRadius.circular(14),
);

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
  Package? _monthlyPackage;
  Package? _annualPackage;
  int? _annualSavePercent;
  bool _loading = true;
  bool _offeringsError = false;
  String? _checkoutLoading; // 'monthly' | 'annual'
  bool _restoreLoading = false;
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
      final sub = await SubscriptionApiService.getCurrent(token);
      Offering? offering;
      Package? monthly;
      Package? annual;
      var offeringsError = false;
      if (RevenueCatService.isConfigured) {
        final offerings = await RevenueCatService.fetchOfferings();
        offering = offerings?.current;
        monthly = RevenueCatService.packageForInterval(offering, 'monthly');
        annual = RevenueCatService.packageForInterval(offering, 'annual');
        offeringsError =
            offering == null || (monthly == null && annual == null);
      } else {
        offeringsError = true;
      }
      if (mounted) {
        setState(() {
          _subscription = sub;
          _monthlyPackage = monthly;
          _annualPackage = annual;
          _annualSavePercent = RevenueCatService.annualSavePercent(
            monthly: monthly,
            annual: annual,
          );
          _offeringsError = offeringsError;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool get _isPro => _subscription?.type.toUpperCase() == 'PRO';

  Package? _packageForInterval(String interval) =>
      interval == 'annual' ? _annualPackage : _monthlyPackage;

  String? _priceLabelForInterval(String interval) {
    final pkg = _packageForInterval(interval);
    return pkg?.storeProduct.priceString;
  }

  String? _comparePriceLabel() {
    if (_billingInterval != 'annual') return null;
    return _monthlyPackage?.storeProduct.priceString;
  }

  Future<void> _openUrl(String? url) async {
    if (url == null || url.isEmpty) return;
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _afterStorePurchase(String accessToken) async {
    bool synced = false;
    try {
      synced = await RevenueCatService.syncWithBackend(accessToken);
    } catch (e) {
      if (mounted) showApiError(context, e);
      return;
    }
    if (!mounted) return;
    if (synced) {
      if (!mounted) return;
      context
          .read<SubscriptionRefreshNotifier>()
          .notifySubscriptionMaybeChanged();
      await _load();
      if (!mounted) return;
      final locale = context.read<LocaleProvider>();
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(content: Text(locale.t('subscription.purchaseSuccess'))),
      );
    } else {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(content: Text('Подписка оформлена, обновите экран')),
      );
    }
  }

  Future<void> _handleSelectPlan(String interval) async {
    final locale = context.read<LocaleProvider>();
    if (!RevenueCatService.isConfigured) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(content: Text(locale.t('subscription.storeNotConfigured'))),
      );
      return;
    }
    final pkg = _packageForInterval(interval);
    if (pkg == null) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(content: Text(locale.t('subscription.offeringsUnavailable'))),
      );
      return;
    }
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;
    setState(() => _checkoutLoading = interval);
    try {
      final info = await RevenueCatService.purchasePackage(pkg);
      if (!mounted) return;
      if (info != null) {
        RevenueCatService.debugLogEntitlements(info);
        await _afterStorePurchase(token);
        if (!mounted) return;
        if (!RevenueCatService.hasActiveProEntitlement(info)) {
          ScaffoldMessenger.maybeOf(context)?.showSnackBar(
            SnackBar(
              content: Text(locale.t('subscription.rcEntitlementNotLinked')),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) showApiError(context, e);
    } finally {
      if (mounted) setState(() => _checkoutLoading = null);
    }
  }

  Future<void> _restorePurchases() async {
    final locale = context.read<LocaleProvider>();
    if (!RevenueCatService.isConfigured) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(content: Text(locale.t('subscription.storeNotConfigured'))),
      );
      return;
    }
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;
    setState(() => _restoreLoading = true);
    try {
      final info = await RevenueCatService.restorePurchases();
      if (!mounted) return;
      if (info != null) {
        RevenueCatService.debugLogEntitlements(info);
        if (RevenueCatService.hasActiveProEntitlement(info)) {
          await _afterStorePurchase(token);
        } else {
          ScaffoldMessenger.maybeOf(context)?.showSnackBar(
            SnackBar(content: Text(locale.t('subscription.restoreNothing'))),
          );
        }
      }
    } catch (e) {
      if (mounted) showApiError(context, e);
    } finally {
      if (mounted) setState(() => _restoreLoading = false);
    }
  }

  Future<void> _openManageSubscription() async {
    final url = await RevenueCatService.managementUrl();
    await _openUrl(url);
  }

  String _proPriceDisplay() {
    final amount = _subscription?.amount;
    if (amount != null && amount > 0) {
      return '${formatVnd(amount)} VND';
    }
    final store =
        _monthlyPackage?.storeProduct.priceString ??
        _annualPackage?.storeProduct.priceString;
    if (store != null && store.isNotEmpty) return store;
    return '—';
  }

  String? _nextPaymentDateLabel(BuildContext context) {
    final cpe = _subscription?.currentPeriodEnd;
    if (cpe == null || cpe.isEmpty) return null;
    final dt = DateTime.tryParse(cpe)?.toLocal();
    if (dt == null) return null;
    final locale = Localizations.localeOf(context);
    return DateFormat.yMMMMd(locale.toString()).format(dt);
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<LocaleProvider>(
      builder: (context, locale, _) {
        return Scaffold(
          backgroundColor: AppColors.backgroundSecondary,
          appBar: buildBrandedSettingsAppBar(
            context,
            title: locale.t('subscription.title'),
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
                        if (!_isPro) ...[
                          _CurrentPlanCard(isPro: false),
                          const SizedBox(height: 16),
                          if (_offeringsError)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: Text(
                                locale.t('subscription.offeringsUnavailable'),
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: AppColors.error600,
                                ),
                              ),
                            ),
                          if (_monthlyPackage != null && _annualPackage != null)
                            _BillingToggle(
                              billingInterval: _billingInterval,
                              annualSavePercent: _annualSavePercent ?? 0,
                              onChanged: (v) =>
                                  setState(() => _billingInterval = v),
                            ),
                          const SizedBox(height: 16),
                          _PlanCard(
                            priceLabel:
                                _priceLabelForInterval(_billingInterval) ?? '—',
                            comparePriceLabel: _comparePriceLabel(),
                            isAnnual: _billingInterval == 'annual',
                            onSubscribe: () =>
                                _handleSelectPlan(_billingInterval),
                            checkoutLoading: _checkoutLoading,
                          ),
                          const SizedBox(height: 12),
                          TextButton(
                            onPressed: _restoreLoading
                                ? null
                                : _restorePurchases,
                            child: Text(
                              _restoreLoading
                                  ? locale.t('common.loading')
                                  : locale.t('subscription.restorePurchases'),
                            ),
                          ),
                        ] else ...[
                          _ProStatusCard(
                            priceLabel: _proPriceDisplay(),
                            periodLabel: locale.t('subscription.perOneMonth'),
                            nextPaymentDate:
                                _nextPaymentDateLabel(context) ?? '—',
                            activeLabel: locale.t('profile.active'),
                            planTitle: locale.t('profile.pro'),
                            tagline: locale.t('subscription.proTagline'),
                            nextPaymentLabel: locale.t(
                              'subscription.nextPayment',
                            ),
                          ),
                          const SizedBox(height: 12),
                          _ProWhatsIncludedCard(
                            title: locale.t('subscription.whatsIncluded'),
                            features: _proFeatureLabels(locale),
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            height: AuthFormStyles.buttonHeight,
                            child: FilledButton(
                              onPressed: _openManageSubscription,
                              style: AuthFormStyles.primaryButtonStyle(),
                              child: Text(
                                locale.t('subscription.manageSubscription'),
                              ),
                            ),
                          ),
                        ],
                        if (!AppConfig.isRevenueCatEnabled && !kReleaseMode)
                          Padding(
                            padding: const EdgeInsets.only(top: 16),
                            child: Text(
                              locale.t('subscription.storeNotConfigured'),
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textTertiary,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
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
      decoration: _subscriptionCardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Image.asset(
                'assets/icons/icon-rocket.png',
                width: 24,
                height: 24,
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

class _ProStatusCard extends StatelessWidget {
  final String planTitle;
  final String tagline;
  final String activeLabel;
  final String priceLabel;
  final String periodLabel;
  final String nextPaymentLabel;
  final String nextPaymentDate;

  const _ProStatusCard({
    required this.planTitle,
    required this.tagline,
    required this.activeLabel,
    required this.priceLabel,
    required this.periodLabel,
    required this.nextPaymentLabel,
    required this.nextPaymentDate,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _subscriptionCardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Image.asset(
                'assets/icons/icon-rocket.png',
                width: 28,
                height: 28,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      planTitle,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      tagline,
                      style: const TextStyle(
                        fontSize: 14,
                        height: 1.25,
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
                  color: _activeBadgeBg,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  activeLabel,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: _activeBadgeFg,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          IntrinsicHeight(
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        priceLabel,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary500,
                          letterSpacing: -0.3,
                        ),
                      ),
                      Text(
                        periodLabel,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  width: 1,
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  color: AppColors.borderPrimary,
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        nextPaymentLabel,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      Text(
                        nextPaymentDate,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
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

class _ProWhatsIncludedCard extends StatelessWidget {
  final String title;
  final List<String> features;

  const _ProWhatsIncludedCard({required this.title, required this.features});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 16, 12, 16),
      decoration: _subscriptionCardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          LayoutBuilder(
            builder: (context, constraints) {
              const gap = 12.0;
              final itemWidth = (constraints.maxWidth - gap) / 2;
              return Wrap(
                spacing: gap,
                runSpacing: 0,
                children: features
                    .map(
                      (f) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: SizedBox(
                          width: itemWidth,
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Image.asset(
                                'assets/icons/icon-fire.png',
                                width: 20,
                                height: 20,
                              ),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  f,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    height: 1.25,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    )
                    .toList(),
              );
            },
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
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Expanded(
            child: Material(
              color: billingInterval == 'monthly'
                  ? AppColors.backgroundPrimary
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(12),
              child: InkWell(
                onTap: () => onChanged('monthly'),
                borderRadius: BorderRadius.circular(12),
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
                        if (annualSavePercent > 0) ...[
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
  final String priceLabel;
  final String? comparePriceLabel;
  final bool isAnnual;
  final VoidCallback onSubscribe;
  final String? checkoutLoading;

  const _PlanCard({
    required this.priceLabel,
    this.comparePriceLabel,
    required this.isAnnual,
    required this.onSubscribe,
    this.checkoutLoading,
  });

  @override
  Widget build(BuildContext context) {
    final locale = context.read<LocaleProvider>();
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
              Image.asset(
                'assets/icons/icon-rocket.png',
                width: 28,
                height: 28,
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
          if (isAnnual && comparePriceLabel != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                comparePriceLabel!,
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
            priceLabel,
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
                  Image.asset(
                    'assets/icons/icon-fire.png',
                    width: 22,
                    height: 22,
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
            height: AuthFormStyles.buttonHeight,
            child: FilledButton(
              onPressed: checkoutLoading != null ? null : onSubscribe,
              style: AuthFormStyles.primaryButtonStyle(),
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
