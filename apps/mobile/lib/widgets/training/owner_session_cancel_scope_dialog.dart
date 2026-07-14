import 'package:flutter/material.dart';
import '../common/henzo_modal.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import 'owner_session_scope_option_button.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Which sessions to mark cancelled.
enum OwnerSessionCancelScope {
  /// Only the selected session.
  single,

  /// This session and every later ACTIVE session for the same training.
  thisAndFollowing,
}

/// Result of the cancel dialog: the chosen scope plus an optional note shown
/// to enrolled clients.
class OwnerSessionCancelResult {
  const OwnerSessionCancelResult({required this.scope, this.note});

  final OwnerSessionCancelScope scope;
  final String? note;
}

Future<OwnerSessionCancelResult?> showOwnerSessionCancelScopeDialog(
  BuildContext context,
) async {
  final tr = context.read<LocaleProvider>().t;
  final noteController = TextEditingController();
  String? noteValue() {
    final t = noteController.text.trim();
    return t.isEmpty ? null : t;
  }

  final result = await showHenzoDialog<OwnerSessionCancelResult>(
    context: context,
    builder: (ctx) {
      final maxW = MediaQuery.sizeOf(ctx).width - 32;
      return Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 16),
        backgroundColor: AppColors.backgroundPrimary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: maxW > 400 ? 400 : maxW),
          child: SingleChildScrollView(
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
                          tr('ownerSession.cancelChooseScopeTitle'),
                          style: TextStyle(
                            fontSize: 18.sp,
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
                    tr('ownerSession.cancelChooseScopeMessage'),
                    style: TextStyle(
                      fontSize: 13.sp,
                      height: 1.35,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: TextField(
                      controller: noteController,
                      maxLines: 3,
                      minLines: 2,
                      maxLength: 500,
                      textInputAction: TextInputAction.newline,
                      style: TextStyle(
                        fontSize: 14.sp,
                        color: AppColors.textPrimary,
                      ),
                      decoration: InputDecoration(
                        labelText: tr('ownerSession.cancelNoteLabel'),
                        hintText: tr('ownerSession.cancelNoteHint'),
                        alignLabelWithHint: true,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  OwnerSessionScopeOptionButton(
                    label: tr('ownerSession.cancelThisSessionOnly'),
                    onTap: () => Navigator.of(ctx).pop(
                      OwnerSessionCancelResult(
                        scope: OwnerSessionCancelScope.single,
                        note: noteValue(),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  OwnerSessionScopeOptionButton(
                    label: tr('ownerSession.cancelFollowingSessions'),
                    onTap: () => Navigator.of(ctx).pop(
                      OwnerSessionCancelResult(
                        scope: OwnerSessionCancelScope.thisAndFollowing,
                        note: noteValue(),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    },
  );
  noteController.dispose();
  return result;
}
