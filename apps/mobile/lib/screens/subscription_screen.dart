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
import '../utils/subscription_purchase_feedback.dart';
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
  bool _statusLoading = true;
  bool _pricesLoading = true;
  String? _checkoutLoading; // 'studio' | 'enterprise'
  bool _restoreLoading = false;
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

  Future<void> _load({bool isRefresh = false}) async {
    final token = context.read<AuthService>().accessToken;
    if (token == null) {
      setState(() {
        _statusLoading = false;
        _pricesLoading = false;
      });
      return;
    }
    setState(() {
      if (!isRefresh) _statusLoading = true;
      _pricesLoading = true;
    });
    try {
      final sub = await SubscriptionApiService.getCurrent(token);

      if (mounted) {
        setState(() {
          _subscription = sub;
          _statusLoading = false;
        });
      }

      Package? studioPkg;
      Package? enterprisePkg;

      if (RevenueCatService.isConfigured) {
        final offerings = await RevenueCatService.fetchOfferings();
        studioPkg = RevenueCatService.packageForTier(offerings, 'studio');
        enterprisePkg = RevenueCatService.packageForTier(
          offerings,
          'enterprise',
        );
      }

      if (mounted) {
        setState(() {
          _studioPackage = studioPkg;
          _enterprisePackage = enterprisePkg;
          _pricesLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _statusLoading = false;
          _pricesLoading = false;
        });
      }
    }
  }

  bool get _hasPaidPlan {
    if (_statusLoading) return false;
    return subscriptionIsActivePaid(
      type: _subscription?.type,
      status: _subscription?.status,
    );
  }

  SubscriptionPlanTier get _activePlanTier {
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
      if (mounted) showSubscriptionPurchaseError(context, e);
      return;
    }
    if (!mounted) return;
    if (synced) {
      context
          .read<SubscriptionRefreshNotifier>()
          .notifySubscriptionMaybeChanged();
      await _load();
      if (!mounted) return;
      showSubscriptionPurchaseSuccess(
        context,
        tier: _activePlanTier,
      );
    } else {
      showSubscriptionPurchaseWarning(
        context,
        messageKey: 'subscription.purchaseSyncPending',
        detailKey: 'subscription.purchaseSyncPendingBody',
      );
    }
  }

  Package? _packageForTier(String tier) =>
      tier == 'enterprise' ? _enterprisePackage : _studioPackage;

  Future<void> _handleSelectPlan(String tier) async {
    if (!RevenueCatService.isConfigured) {
      showSubscriptionPurchaseWarning(
        context,
        messageKey: 'subscription.storeNotConfigured',
      );
      return;
    }
    final pkg = _packageForTier(tier);
    if (pkg == null) {
      showSubscriptionPurchaseWarning(
        context,
        messageKey: 'subscription.offeringsUnavailable',
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
        if (!RevenueCatService.hasActiveProEntitlement(info)) {
          showSubscriptionPurchaseWarning(
            context,
            messageKey: 'subscription.rcEntitlementNotLinked',
          );
        }
      }
    } catch (e) {
      if (mounted) showSubscriptionPurchaseError(context, e);
    } finally {
      if (mounted) setState(() => _checkoutLoading = null);
    }
  }

  Future<void> _restorePurchases() async {
    if (!RevenueCatService.isConfigured) {
      showSubscriptionPurchaseWarning(
        context,
        messageKey: 'subscription.storeNotConfigured',
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
          showSubscriptionPurchaseWarning(
            context,
            messageKey: 'subscription.restoreNothing',
          );
        }
      }
    } catch (e) {
      if (mounted) showSubscriptionPurchaseError(context, e);
    } finally {
      if (mounted) setState(() => _restoreLoading = false);
    }
  }

  Future<void> _openManageSubscription() async {
    final url = await RevenueCatService.managementUrl();
    await _openUrl(url);
  }

  String _proPriceDisplay() {
    final priceString = switch (_activePlanTier) {
      SubscriptionPlanTier.studio =>
        _studioPackage?.storeProduct.priceString,
      SubscriptionPlanTier.enterprise =>
        _enterprisePackage?.storeProduct.priceString,
      SubscriptionPlanTier.solo => null,
    };
    if (priceString != null && priceString.isNotEmpty) return priceString;
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
          body: RefreshIndicator(
                  onRefresh: () => _load(isRefresh: true),
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
                            isPriceLoading: _pricesLoading,
                            features: subscriptionPlanFeatureLabels(
                              locale,
                              SubscriptionPlanTier.studio,
                            ),
                            subscribeLabel: locale.t(
                              'subscription.subscribeToStudioBtn',
                            ),
                            isLoading: _checkoutLoading == 'studio',
                            onSubscribe: _pricesLoading
                                ? null
                                : () => _handleSelectPlan('studio'),
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
                            isPriceLoading: _pricesLoading,
                            features: subscriptionPlanFeatureLabels(
                              locale,
                              SubscriptionPlanTier.enterprise,
                            ),
                            subscribeLabel: locale.t(
                              'subscription.subscribeToEnterpriseBtn',
                            ),
                            isLoading: _checkoutLoading == 'enterprise',
                            onSubscribe: _pricesLoading
                                ? null
                                : () => _handleSelectPlan('enterprise'),
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
                            isPriceLoading: _pricesLoading,
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

class _PriceSkeleton extends StatefulWidget {
  const _PriceSkeleton({this.width = 140, this.height = 32});

  final double width;
  final double height;

  @override
  State<_PriceSkeleton> createState() => _PriceSkeletonState();
}

class _PriceSkeletonState extends State<_PriceSkeleton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            color: AppColors.textTertiary.withValues(
              alpha: 0.12 + _controller.value * 0.12,
            ),
            borderRadius: BorderRadius.circular(8),
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
  final bool isPriceLoading;
  final String periodLabel;
  final String nextPaymentLabel;
  final String nextPaymentDate;

  const _ProStatusCard({
    required this.planTitle,
    required this.tagline,
    required this.activeLabel,
    required this.priceLabel,
    this.isPriceLoading = false,
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
                      if (isPriceLoading)
                        const _PriceSkeleton(width: 120, height: 28)
                      else
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

class _PlanFeatureBullet extends StatelessWidget {
  const _PlanFeatureBullet({this.size = 6});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(top: size * 0.65),
      child: Container(
        width: size,
        height: size,
        decoration: const BoxDecoration(
          color: AppColors.primary500,
          shape: BoxShape.circle,
        ),
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
                              const _PlanFeatureBullet(),
                              const SizedBox(width: 8),
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
          const _PlanFeatureBullet(size: 7),
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
  final bool isPriceLoading;

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
    this.isPriceLoading = false,
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
          if (isPriceLoading)
            const Align(
              alignment: Alignment.centerLeft,
              child: _PriceSkeleton(width: 160, height: 34),
            )
          else
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
                onPressed:
                    isLoading || isPriceLoading ? null : onSubscribe,
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
