import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../widgets/common/henzo_modal.dart';
import '../screens/subscription_screen.dart';
import '../services/api_client.dart';

bool isTrainerPlanLimitError(Object e) {
  if (e is! ApiException) return false;
  return e.errorCode == 'SOLO_TRAINER_LIMIT_EXCEEDED' ||
      e.errorCode == 'STUDIO_TRAINER_LIMIT_EXCEEDED' ||
      (e.statusCode == 403 &&
          (e.message.contains('SOLO_TRAINER') ||
              e.message.contains('STUDIO_TRAINER')));
}

bool isSessionPlanLimitError(Object e) {
  if (e is! ApiException) return false;
  return e.errorCode == 'SOLO_SESSION_LIMIT_EXCEEDED' ||
      e.errorCode == 'STUDIO_SESSION_LIMIT_EXCEEDED' ||
      (e.statusCode == 403 &&
          (e.message.contains('SOLO_SESSION') ||
              e.message.contains('STUDIO_SESSION')));
}

bool _isStudioLimitCode(String? code) =>
    code != null && code.startsWith('STUDIO_');

Future<void> showTrainerPlanLimitDialog(
  BuildContext context, {
  Object? error,
  bool offerUpgrade = false,
}) async {
  final locale = context.read<LocaleProvider>();
  final code = error is ApiException ? error.errorCode : null;
  final isStudio = _isStudioLimitCode(code);
  await showHenzoDialog<void>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(
        locale.t(
          isStudio
              ? 'subscription.studioTrainerLimitTitle'
              : 'subscription.soloTrainerLimitTitle',
        ),
      ),
      content: Text(
        locale.t(
          isStudio
              ? 'subscription.studioTrainerLimitBody'
              : 'subscription.soloTrainerLimitBody',
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: Text(
            offerUpgrade
                ? locale.t('common.cancel')
                : locale.t('common.ok'),
          ),
        ),
        if (offerUpgrade)
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const SubscriptionScreen(),
                ),
              );
            },
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary500,
            ),
            child: Text(
              locale.t(
                isStudio
                    ? 'subscription.upgradeToEnterprise'
                    : 'subscription.upgradeToStudio',
              ),
            ),
          ),
      ],
    ),
  );
}

Future<void> showSessionPlanLimitDialog(
  BuildContext context, {
  Object? error,
  bool offerUpgrade = false,
}) async {
  final locale = context.read<LocaleProvider>();
  final code = error is ApiException ? error.errorCode : null;
  final isStudio = _isStudioLimitCode(code);
  await showHenzoDialog<void>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(
        locale.t(
          isStudio
              ? 'subscription.studioClassLimitTitle'
              : 'subscription.soloClassLimitTitle',
        ),
      ),
      content: Text(
        locale.t(
          isStudio
              ? 'subscription.studioClassLimitBody'
              : 'subscription.soloClassLimitBody',
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: Text(
            offerUpgrade
                ? locale.t('common.cancel')
                : locale.t('common.ok'),
          ),
        ),
        if (offerUpgrade)
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const SubscriptionScreen(),
                ),
              );
            },
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary500,
            ),
            child: Text(
              locale.t(
                isStudio
                    ? 'subscription.upgradeToEnterprise'
                    : 'subscription.upgradeToStudio',
              ),
            ),
          ),
      ],
    ),
  );
}
