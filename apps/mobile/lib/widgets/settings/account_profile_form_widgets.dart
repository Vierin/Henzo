import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import '../../widgets/auth/auth_form_styles.dart';

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
        style: const TextStyle(
          fontSize: 12,
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
                            style: const TextStyle(
                              fontSize: 32,
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
                style: const TextStyle(
                  fontSize: 15,
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
                style: const TextStyle(
                  fontSize: 16,
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
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}
