import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';

/// What to update when opening the owner session edit screen.
enum OwnerSessionEditScope {
  /// Only the selected [TrainingSession].
  single,

  /// Same [Training] template id: this session and every later ACTIVE session.
  thisAndFollowing,
}

/// Choose "this class only" vs "this and all future classes" (sessions only;
/// does not change the [Training] service template — use Services tab).
Future<OwnerSessionEditScope?> showOwnerSessionEditScopeDialog(
  BuildContext context,
) {
  final tr = context.read<LocaleProvider>().t;
  return showDialog<OwnerSessionEditScope>(
    context: context,
    builder: (ctx) {
      return AlertDialog(
        title: Text(tr('ownerSession.editScopeDialogTitle')),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              tr('ownerSession.editScopeTemplateNote'),
              style: TextStyle(
                fontSize: 13,
                height: 1.35,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: () =>
                  Navigator.of(ctx).pop(OwnerSessionEditScope.single),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.textPrimary,
                side: const BorderSide(color: AppColors.borderPrimary),
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 14,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tr('ownerSession.editScopeThisOnly'),
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      tr('ownerSession.editScopeThisOnlyHint'),
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.35,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: () => Navigator.of(
                ctx,
              ).pop(OwnerSessionEditScope.thisAndFollowing),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.textPrimary,
                side: const BorderSide(color: AppColors.borderPrimary),
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 14,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tr('ownerSession.editScopeFollowing'),
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      tr('ownerSession.editScopeFollowingHint'),
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.35,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(tr('common.cancel')),
          ),
        ],
      );
    },
  );
}
