import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../widgets/auth/auth_form_styles.dart';
import '../../widgets/common/henzo_modal.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Shared with owner [AccountSettingsScreen] and client personal data.
const Color kAccountDangerPurple = Color(0xFF5141A8);
const Color kAccountAvatarPink = Color(0xFFF5D4D0);

class AccountSectionLabel extends StatelessWidget {
  const AccountSectionLabel({required this.text, super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 12),
      child: Text(
        text.toUpperCase(),
        style: TextStyle(
          fontSize: 12.sp,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.4,
          color: AppColors.textSecondary,
        ),
      ),
    );
  }
}

class AccountPhotoCard extends StatelessWidget {
  const AccountPhotoCard({
    required this.avatarUrl,
    required this.initials,
    required this.isUploading,
    required this.addLabel,
    required this.changeLabel,
    required this.onTap,
    super.key,
  });

  final String? avatarUrl;
  final String initials;
  final bool isUploading;
  final String addLabel;
  final String changeLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final hasPhoto = avatarUrl != null && avatarUrl!.isNotEmpty;
    final label = hasPhoto ? changeLabel : addLabel;

    return Material(
      color: AppColors.backgroundPrimary,
      borderRadius: BorderRadius.circular(AuthFormStyles.fieldBorderRadius),
      child: InkWell(
        onTap: isUploading ? null : onTap,
        borderRadius: BorderRadius.circular(AuthFormStyles.fieldBorderRadius),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(0, 15, 0, 12),
          child: Column(
            children: [
              Stack(
                alignment: Alignment.center,
                children: [
                  CircleAvatar(
                    radius: 52,
                    backgroundColor: kAccountAvatarPink,
                    backgroundImage:
                        hasPhoto ? NetworkImage(avatarUrl!) : null,
                    child: hasPhoto
                        ? null
                        : Text(
                            initials,
                            style: TextStyle(
                              fontSize: 32.sp,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                  ),
                  if (isUploading)
                    const SizedBox(
                      width: 104,
                      height: 104,
                      child: ColoredBox(
                        color: Color(0x66FFFFFF),
                        child: Center(
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: AppColors.primary500,
                          ),
                        ),
                      ),
                    )
                  else
                    Positioned(
                      right: 0,
                      bottom: 0,
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: AppColors.primary500,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppColors.backgroundPrimary,
                            width: 2.5,
                          ),
                        ),
                        child: const Icon(
                          Icons.camera_alt_outlined,
                          size: 16,
                          color: Colors.white,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                label,
                style: TextStyle(
                  fontSize: 15.sp,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class AccountPrimaryButton extends StatelessWidget {
  const AccountPrimaryButton({
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    super.key,
  });

  final String label;
  final VoidCallback onPressed;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: AuthFormStyles.buttonHeight,
      child: FilledButton(
        onPressed: isLoading ? null : onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary500,
          foregroundColor: AppColors.textInverse,
          disabledBackgroundColor: AppColors.primary500.withValues(
            alpha: 0.5,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(
              AuthFormStyles.fieldBorderRadius,
            ),
          ),
        ),
        child: isLoading
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : Text(
                label,
                style: TextStyle(
                  fontSize: 16.sp,
                  fontWeight: FontWeight.w600,
                ),
              ),
      ),
    );
  }
}

class AccountDangerButton extends StatelessWidget {
  const AccountDangerButton({
    required this.label,
    required this.onPressed,
    super.key,
  });

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: AuthFormStyles.buttonHeight,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: kAccountDangerPurple,
          foregroundColor: AppColors.textInverse,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(
              AuthFormStyles.fieldBorderRadius,
            ),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}

const _deleteAccountDialogRadius = 14.0;

/// Returns `true` when the user confirms account deletion.
Future<bool?> showDeleteAccountConfirmDialog(BuildContext context) {
  final locale = context.read<LocaleProvider>();

  return showHenzoDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (dialogContext) {
      final screenWidth = MediaQuery.sizeOf(dialogContext).width;
      final dialogWidth = (screenWidth - 40).clamp(340.0, 380.0);

      return Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 20),
        backgroundColor: AppColors.backgroundPrimary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_deleteAccountDialogRadius),
        ),
        child: SizedBox(
          width: dialogWidth,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 22, 24, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  locale.t('profileForm.deleteAccount'),
                  style: TextStyle(
                    fontSize: 20.sp,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  locale.t('profileForm.deleteAccountConfirm'),
                  style: TextStyle(
                    fontSize: 15.sp,
                    height: 1.4,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.of(dialogContext).pop(false),
                      child: Text(locale.t('common.cancel')),
                    ),
                    const SizedBox(width: 8),
                    FilledButton(
                      onPressed: () =>
                          Navigator.of(dialogContext).pop(true),
                      style: FilledButton.styleFrom(
                        backgroundColor: kAccountDangerPurple,
                      ),
                      child: Text(locale.t('profileForm.deleteAccount')),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
    },
  );
}
