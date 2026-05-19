import 'package:flutter/material.dart';

import '../../constants/colors.dart';

/// 30×30 white circle back control for owner settings headers.
class SettingsHeaderBackButton extends StatelessWidget {
  const SettingsHeaderBackButton({super.key, required this.onPressed});

  final VoidCallback onPressed;

  static const double size = 34;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 8),
      child: Center(
        child: SizedBox(
          width: size,
          height: size,
          child: Material(
            color: AppColors.backgroundPrimary,
            shape: const CircleBorder(),
            child: InkWell(
              onTap: onPressed,
              customBorder: const CircleBorder(),
              child: const Center(
                child: Icon(
                  Icons.arrow_back_ios_new,
                  size: 16,
                  color: AppColors.textPrimary,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
