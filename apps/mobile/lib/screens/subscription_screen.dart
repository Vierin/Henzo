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
import '../utils/subscription_plan_features.dart';
import '../utils/subscription_tier.dart';
import '../widgets/auth/auth_form_styles.dart';
import '../widgets/legal/subscription_legal_disclosure.dart';
import '../widgets/settings/branded_settings_app_bar.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

const Color _activeBadgeBg = Color(0xFFE8F5E9);
const Color _activeBadgeFg = Color(0xFF2E7D32);

TextStyle _subscriptionButtonTextStyle() =>
    TextStyle(fontSize: 16.sp, fontWeight: FontWeight.w500);

BoxDecoration _subscriptionCardDecoration() => BoxDecoration(
  color: AppColors.backgroundPrimary,
  borderRadius: BorderRadius.circular(14),
);

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  Subscription? _subscription;
  Package? _studioPackage;
  Package? _enterprisePackage;
  bool _loading = true;
  String? _checkoutLoading; // 'studio' | 'enterprise'
  bool _restoreLoading = false;
  String? _activeTier; // 'studio' | 'enterprise' | null
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
      Package? studioPkg;
      Package? enterprisePkg;
      String? activeTier;

      if (RevenueCatService.isConfigured) {
        final offerings = await RevenueCatService.fetchOfferings();
        studioPkg = RevenueCatService.packageForTier(offerings, 'studio');
        enterprisePkg = RevenueCatService.packageForTier(
          offerings,
          'enterprise',
        );

        // Detect active tier from CustomerInfo
        try {
          final info = await Purchases.getCustomerInfo();
          activeTier = RevenueCatService.getActiveTier(info);
        } catch (_) {}
      }

      if (mounted) {
        setState(() {
          _subscription = sub;
          _studioPackage = studioPkg;
          _enterprisePackage = enterprisePkg;
          _activeTier = activeTier;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool get _hasPaidPlan =>
      _activeTier != null || subscriptionTypeIsPaid(_subscription?.type);

  SubscriptionPlanTier get _activePlanTier {
    if (_activeTier != null) {
      return subscriptionPlanTierFromActiveCode(_activeTier);
    }
    return subscriptionPlanTierFromSubscriptionType(_subscription?.type);
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

  Package? _packageForTier(String tier) =>
      tier == 'enterprise' ? _enterprisePackage : _studioPackage;

  Future<void> _handleSelectPlan(String tier) async {
    final locale = context.read<LocaleProvider>();
    if (!RevenueCatService.isConfigured) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(content: Text(locale.t('subscription.storeNotConfigured'))),
      );
      return;
    }
    final pkg = _packageForTier(tier);
    if (pkg == null) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(content: Text(locale.t('subscription.offeringsUnavailable'))),
      );
      return;
    }
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;
    setState(() => _checkoutLoading = tier);
    try {
      final info = await RevenueCatService.purchasePackage(pkg);
      if (!mounted) return;
      if (info != null) {
        RevenueCatService.debugLogEntitlements(info);
        await _afterStorePurchase(token);
        if (!mounted) return;
        // Update active tier from fresh CustomerInfo
        if (mounted) {
          setState(() => _activeTier = RevenueCatService.getActiveTier(info));
        }
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
        if (mounted) {
          setState(() => _activeTier = RevenueCatService.getActiveTier(info));
        }
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
        _studioPackage?.storeProduct.priceString ??
        _enterprisePackage?.storeProduct.priceString;
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
                        if (!_hasPaidPlan) ...[
                          _PlanCard(
                            title: locale.t(
                              subscriptionPlanTitleKey(
                                SubscriptionPlanTier.solo,
                              ),
                            ),
                            tagline: locale.t(
                              subscriptionPlanTaglineKey(
                                SubscriptionPlanTier.solo,
                              ),
                            ),
                            priceLabel: locale.t('subscription.soloFreePrice'),
                            showPricePeriod: false,
                            features: subscriptionPlanFeatureLabels(
                              locale,
                              SubscriptionPlanTier.solo,
                            ),
                            highlighted: false,
                            showActiveBadge: true,
                          ),
                          const SizedBox(height: 20),
                          _PlanCard(
                            title: locale.t(
                              subscriptionPlanTitleKey(
                                SubscriptionPlanTier.studio,
                              ),
                            ),
                            tagline: locale.t(
                              subscriptionPlanTaglineKey(
                                SubscriptionPlanTier.studio,
                              ),
                            ),
                            priceLabel:
                                _studioPackage?.storeProduct.priceString ??
                                locale.t('subscription.studioFallbackPrice'),
                            features: subscriptionPlanFeatureLabels(
                              locale,
                              SubscriptionPlanTier.studio,
                            ),
                            subscribeLabel: locale.t(
                              'subscription.subscribeToStudioBtn',
                            ),
                            isLoading: _checkoutLoading == 'studio',
                            onSubscribe: () => _handleSelectPlan('studio'),
                          ),
                          const SizedBox(height: 20),
                          _PlanCard(
                            title: locale.t(
                              subscriptionPlanTitleKey(
                                SubscriptionPlanTier.enterprise,
                              ),
                            ),
                            tagline: locale.t(
                              subscriptionPlanTaglineKey(
                                SubscriptionPlanTier.enterprise,
                              ),
                            ),
                            priceLabel:
                                _enterprisePackage?.storeProduct.priceString ??
                                locale.t(
                                  'subscription.enterpriseFallbackPrice',
                                ),
                            features: subscriptionPlanFeatureLabels(
                              locale,
                              SubscriptionPlanTier.enterprise,
                            ),
                            subscribeLabel: locale.t(
                              'subscription.subscribeToEnterpriseBtn',
                            ),
                            isLoading: _checkoutLoading == 'enterprise',
                            onSubscribe: () => _handleSelectPlan('enterprise'),
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
                              style: _subscriptionButtonTextStyle(),
                            ),
                          ),
                        ] else ...[
                          _ProStatusCard(
                            priceLabel: _proPriceDisplay(),
                            periodLabel: locale.t('subscription.perOneMonth'),
                            nextPaymentDate:
                                _nextPaymentDateLabel(context) ?? '—',
                            activeLabel: locale.t('profile.active'),
                            planTitle: locale.t(
                              subscriptionPlanTitleKey(_activePlanTier),
                            ),
                            tagline: locale.t(
                              subscriptionPlanTaglineKey(_activePlanTier),
                            ),
                            nextPaymentLabel: locale.t(
                              'subscription.nextPayment',
                            ),
                          ),
                          const SizedBox(height: 12),
                          _ProWhatsIncludedCard(
                            title: locale.t('subscription.whatsIncluded'),
                            features: subscriptionPlanFeatureLabels(
                              locale,
                              _activePlanTier,
                            ),
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
                                style: _subscriptionButtonTextStyle(),
                              ),
                            ),
                          ),
                        ],
                        if (!AppConfig.isRevenueCatEnabled && !kReleaseMode)
                          Padding(
                            padding: const EdgeInsets.only(top: 16),
                            child: Text(
                              locale.t('subscription.storeNotConfigured'),
                              style: TextStyle(
                                fontSize: 12.sp,
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
                      style: TextStyle(
                        fontSize: 24.sp,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      tagline,
                      style: TextStyle(
                        fontSize: 14.sp,
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
                  style: TextStyle(
                    fontSize: 12.sp,
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
                        style: TextStyle(
                          fontSize: 22.sp,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary500,
                          letterSpacing: -0.3,
                        ),
                      ),
                      Text(
                        periodLabel,
                        style: TextStyle(
                          fontSize: 13.sp,
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
                        style: TextStyle(
                          fontSize: 13.sp,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      Text(
                        nextPaymentDate,
                        style: TextStyle(
                          fontSize: 16.sp,
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
            style: TextStyle(
              fontSize: 16.sp,
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
                                  style: TextStyle(
                                    fontSize: 13.sp,
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

class _PlanFeatureRow extends StatelessWidget {
  const _PlanFeatureRow({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
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
              label,
              style: TextStyle(
                fontSize: 14.sp,
                height: 1.35,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  final String title;
  final String tagline;
  final String priceLabel;
  final List<String> features;
  final bool showPricePeriod;
  final bool highlighted;
  final bool showActiveBadge;
  final String? subscribeLabel;
  final VoidCallback? onSubscribe;
  final bool isLoading;

  const _PlanCard({
    required this.title,
    required this.tagline,
    required this.priceLabel,
    required this.features,
    this.showPricePeriod = true,
    this.highlighted = true,
    this.showActiveBadge = false,
    this.subscribeLabel,
    this.onSubscribe,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    final locale = context.read<LocaleProvider>();

    final decoration = highlighted
        ? BoxDecoration(
            color: AppColors.backgroundPrimary,
            border: Border.all(
              color: AppColors.primary500.withValues(alpha: 0.5),
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary500.withValues(alpha: 0.1),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          )
        : _subscriptionCardDecoration();

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: decoration,
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
                      title,
                      style: TextStyle(
                        fontSize: 24.sp,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      tagline,
                      style: TextStyle(
                        fontSize: 14.sp,
                        height: 1.25,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              if (showActiveBadge)
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
                    locale.t('profile.active').toUpperCase(),
                    style: TextStyle(
                      fontSize: 11.sp,
                      fontWeight: FontWeight.bold,
                      color: _activeBadgeFg,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            priceLabel,
            style: TextStyle(
              fontSize: 26.sp,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
              letterSpacing: -0.5,
            ),
          ),
          if (showPricePeriod) ...[
            const SizedBox(height: 4),
            Text(
              locale.t('subscription.perMonthShort'),
              style: TextStyle(
                fontSize: 14.sp,
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
          const SizedBox(height: 20),
          ...features.map((f) => _PlanFeatureRow(label: f)),
          if (onSubscribe != null) ...[
            const SizedBox(height: 12),
            const SubscriptionLegalDisclosure(),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: AuthFormStyles.buttonHeight,
              child: FilledButton(
                onPressed: isLoading ? null : onSubscribe,
                style: AuthFormStyles.primaryButtonStyle(),
                child: isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text(
                        subscribeLabel ?? '',
                        style: _subscriptionButtonTextStyle(),
                      ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              locale.t('subscription.noLongTerm'),
              style: TextStyle(fontSize: 12.sp, color: AppColors.textTertiary),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }
}
