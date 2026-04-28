import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../models/subscription.dart';
import '../services/auth_service.dart';
import '../services/subscription_api_service.dart';
import '../utils/show_api_error.dart';

const int _priceMonthlyVnd = 349000;
const int _priceAnnualVnd = 3490000;
const int _price12MonthsVnd = _priceMonthlyVnd * 12;
const int _saveAnnualPercent = 17;

String _formatVnd(int amount) {
  final s = amount.toString().replaceAllMapped(
    RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
    (m) => '${m[1]} ',
  );
  return '$s ₫';
}

List<String> _featureLabels(LocaleProvider locale) => [
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
  bool _loading = true;
  String? _checkoutLoading; // 'monthly' | 'annual'
  String _billingInterval = 'monthly';

  @override
  void initState() {
    super.initState();
    _load();
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
      setState(() {
        _subscription = sub;
        _loading = false;
      });
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
                        Text(
                          locale.t('subscription.manageTitle'),
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          locale.t('subscription.manageSubtitle'),
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 20),
                        _CurrentPlanCard(isPro: _isPro),
                        const SizedBox(height: 16),
                        if (!_isPro) ...[
                          _BillingToggle(
                            billingInterval: _billingInterval,
                            onChanged: (v) =>
                                setState(() => _billingInterval = v),
                          ),
                          const SizedBox(height: 16),
                          _PlanCard(
                            isAnnual: _billingInterval == 'annual',
                            onSubscribe: () =>
                                _handleSelectPlan(_billingInterval),
                            checkoutLoading: _checkoutLoading,
                            formatVnd: _formatVnd,
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
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
  final ValueChanged<String> onChanged;

  const _BillingToggle({
    required this.billingInterval,
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
                            '-$_saveAnnualPercent%',
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
  final bool isAnnual;
  final VoidCallback onSubscribe;
  final String? checkoutLoading;
  final String Function(int) formatVnd;

  const _PlanCard({
    required this.isAnnual,
    required this.onSubscribe,
    required this.formatVnd,
    this.checkoutLoading,
  });

  @override
  Widget build(BuildContext context) {
    final price = isAnnual ? _priceAnnualVnd : _priceMonthlyVnd;
    final perLabel = isAnnual ? 'год' : 'мес';

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
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.primary500,
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Text(
              'Популярный выбор',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Pro',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Расширенные функции для роста вашей студии',
            style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          if (isAnnual)
            Text(
              formatVnd(_price12MonthsVnd),
              style: const TextStyle(
                fontSize: 20,
                color: AppColors.textTertiary,
                decoration: TextDecoration.lineThrough,
              ),
            ),
          Text(
            '${formatVnd(price)} / $perLabel',
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          ..._featureLabels(context.read<LocaleProvider>()).map(
            (f) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.check_circle,
                    size: 20,
                    color: AppColors.primary500,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      f,
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
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
                    ? context.read<LocaleProvider>().t('common.loading')
                    : context.read<LocaleProvider>().t(
                        'subscription.subscribe',
                      ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            context.read<LocaleProvider>().t('subscription.noLongTerm'),
            style: const TextStyle(fontSize: 12, color: AppColors.textTertiary),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
