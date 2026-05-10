import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../models/subscription_checkout_outcome.dart';
import '../services/auth_service.dart';
import '../services/subscription_api_service.dart';
import '../services/subscription_refresh_notifier.dart';

/// Полноэкранное сообщение после возврата из браузера Stripe.
class SubscriptionCheckoutResultScreen extends StatefulWidget {
  const SubscriptionCheckoutResultScreen({super.key, required this.outcome});

  final SubscriptionCheckoutOutcome outcome;

  @override
  State<SubscriptionCheckoutResultScreen> createState() =>
      _SubscriptionCheckoutResultScreenState();
}

class _SubscriptionCheckoutResultScreenState
    extends State<SubscriptionCheckoutResultScreen> {
  bool _closing = false;

  Future<void> _finish() async {
    if (_closing) return;
    setState(() => _closing = true);
    final success = widget.outcome.kind == SubscriptionCheckoutOutcomeKind.success;
    final sessionId = widget.outcome.sessionId;
    final token = context.read<AuthService>().accessToken;
    final refresh = context.read<SubscriptionRefreshNotifier>();
    final nav = Navigator.of(context);

    if (success &&
        sessionId != null &&
        sessionId.isNotEmpty &&
        token != null &&
        token.isNotEmpty) {
      try {
        await SubscriptionApiService.syncCheckoutSession(token, sessionId);
      } catch (_) {
        // GET /current после notify всё подтянет.
      }
    }
    if (success) {
      refresh.notifySubscriptionMaybeChanged();
    }
    if (!mounted) return;
    nav.maybePop();
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final success = widget.outcome.kind == SubscriptionCheckoutOutcomeKind.success;

    final titleKey = success
        ? 'subscription.checkoutSuccessTitle'
        : 'subscription.checkoutCancelledTitle';
    final bodyKey = success
        ? 'subscription.checkoutSuccessBody'
        : 'subscription.checkoutCancelledBody';

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Align(
                alignment: Alignment.centerRight,
                child: IconButton(
                  icon: const Icon(Icons.close),
                  color: AppColors.textSecondary,
                  onPressed: _closing ? null : _finish,
                ),
              ),
              const Spacer(),
              Icon(
                success ? Icons.check_circle : Icons.info_outline_rounded,
                size: 72,
                color: success ? AppColors.primary500 : AppColors.textSecondary,
              ),
              const SizedBox(height: 24),
              Text(
                locale.t(titleKey),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                locale.t(bodyKey),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 15,
                  height: 1.4,
                  color: AppColors.textSecondary,
                ),
              ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _closing ? null : _finish,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary500,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: _closing
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(locale.t('subscription.checkoutDone')),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
