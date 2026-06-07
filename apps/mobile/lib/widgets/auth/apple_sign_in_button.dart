import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import 'auth_form_styles.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class AppleSignInButton extends StatelessWidget {
  const AppleSignInButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: AuthFormStyles.buttonHeight,
      child: OutlinedButton.icon(
        onPressed: isLoading ? null : onPressed,
        icon: isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(
                Icons.apple,
                size: 34,
                color: AppColors.textPrimary,
              ),
        label: Text(
          label,
          style: TextStyle(
            fontSize: 16.sp,
            fontWeight: FontWeight.w500,
            color: AppColors.textPrimary,
          ),
        ),
        style: AuthFormStyles.googleButtonStyle(),
      ),
    );
  }
}
