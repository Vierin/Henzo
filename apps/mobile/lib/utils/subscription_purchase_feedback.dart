import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../l10n/locale_provider.dart';
import '../services/api_client.dart';
import '../widgets/common/henzo_snackbar.dart';
import 'load_error_message.dart';
import 'subscription_plan_features.dart';

void showSubscriptionPurchaseSuccess(
  BuildContext context, {
  required SubscriptionPlanTier tier,
}) {
  final locale = context.read<LocaleProvider>();
  final planName = locale.t(subscriptionPlanTitleKey(tier));
  showHenzaSnackBar(
    context,
    variant: HenzoSnackBarVariant.success,
    message: locale
        .t('subscription.purchaseSuccess')
        .replaceAll('{plan}', planName),
    detail: locale.t('subscription.purchaseSuccessBody'),
  );
}

void showSubscriptionPurchaseError(BuildContext context, Object error) {
  final locale = context.read<LocaleProvider>();
  final detail = _purchaseErrorDetail(locale, error);
  showHenzaSnackBar(
    context,
    variant: HenzoSnackBarVariant.error,
    message: locale.t('subscription.purchaseFailed'),
    detail: detail,
  );
}

void showSubscriptionPurchaseWarning(
  BuildContext context, {
  required String messageKey,
  String? detailKey,
}) {
  final locale = context.read<LocaleProvider>();
  showHenzaSnackBar(
    context,
    variant: HenzoSnackBarVariant.warning,
    message: locale.t(messageKey),
    detail: detailKey != null ? locale.t(detailKey) : null,
  );
}

String _purchaseErrorDetail(LocaleProvider locale, Object error) {
  if (error is ApiException && error.message.isNotEmpty) {
    return error.message;
  }
  if (isTransientNetworkError(error)) {
    return locale.t('errors.network');
  }
  if (error is PlatformException && (error.message?.isNotEmpty ?? false)) {
    return error.message!;
  }
  return locale.t('subscription.purchaseFailedHint');
}
