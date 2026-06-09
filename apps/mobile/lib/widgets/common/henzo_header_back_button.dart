import 'package:flutter/material.dart';

import '../../constants/colors.dart';

/// White circle back control with iOS-style chevron for app headers.
class HenzoHeaderBackButton extends StatelessWidget {
  const HenzoHeaderBackButton({
    super.key,
    required this.onPressed,
    this.leadingPadding = 8,
  });

  final VoidCallback onPressed;
  final double leadingPadding;

  static const double size = 34;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(left: leadingPadding),
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

/// Standard AppBar leading when [Navigator.canPop].
Widget? henzoAppBarLeading(BuildContext context) {
  if (!Navigator.of(context).canPop()) return null;
  return HenzoHeaderBackButton(
    onPressed: () => Navigator.of(context).maybePop(),
  );
}
