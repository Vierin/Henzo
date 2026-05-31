import 'package:flutter/material.dart';
import '../common/henzo_modal.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import 'owner_session_scope_option_button.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// What to update when opening the owner session edit screen.
enum OwnerSessionEditScope {
  /// Only the selected [TrainingSession].
  single,

  /// Same [Training] template id: this session and every later ACTIVE session.
  thisAndFollowing,
}

Future<OwnerSessionEditScope?> showOwnerSessionEditScopeDialog(
  BuildContext context,
) {
  final tr = context.read<LocaleProvider>().t;
  return showHenzoDialog<OwnerSessionEditScope>(
    context: context,
    builder: (ctx) {
      final maxW = MediaQuery.sizeOf(ctx).width - 32;
      return Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 16),
        backgroundColor: AppColors.backgroundPrimary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: maxW > 400 ? 400 : maxW),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 12, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        tr('ownerSession.editScopeDialogTitle'),
                        style: TextStyle(
                          fontSize: 22.sp,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(ctx).pop(),
                      icon: const Icon(
                        Icons.close,
                        color: AppColors.textSecondary,
                      ),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(
                        minWidth: 36,
                        minHeight: 36,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  tr('ownerSession.editScopeTemplateNote'),
                  style: TextStyle(
                    fontSize: 13.sp,
                    height: 1.35,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 16),
                OwnerSessionScopeOptionButton(
                  label: tr('ownerSession.editScopeThisOnly'),
                  onTap: () =>
                      Navigator.of(ctx).pop(OwnerSessionEditScope.single),
                ),
                const SizedBox(height: 10),
                OwnerSessionScopeOptionButton(
                  label: tr('ownerSession.editScopeFollowing'),
                  onTap: () => Navigator.of(
                    ctx,
                  ).pop(OwnerSessionEditScope.thisAndFollowing),
                ),
              ],
            ),
          ),
        ),
      );
    },
  );
}
