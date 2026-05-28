import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../constants/colors.dart';

/// Bottom tab item — same look as owner [MainShell] nav.
class ShellNavItem extends StatelessWidget {
  static const inactiveIconAndLabel = AppColors.brandText;

  const ShellNavItem({
    super.key,
    required this.svgAsset,
    required this.label,
    required this.isSelected,
    required this.onTap,
    this.inactiveIconColor,
    this.inactiveLabelColor,
  });

  final String svgAsset;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  final Color? inactiveIconColor;
  final Color? inactiveLabelColor;

  @override
  Widget build(BuildContext context) {
    final inactiveColor = inactiveIconColor ?? inactiveIconAndLabel;
    final inactiveLabel = inactiveLabelColor ?? inactiveColor;
    final iconColor = isSelected ? AppColors.textInverse : inactiveColor;
    final textColor = isSelected ? AppColors.textInverse : inactiveLabel;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
        child: SizedBox(
          height: 62,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SvgPicture.asset(
                svgAsset,
                width: 20,
                height: 20,
                colorFilter: ColorFilter.mode(iconColor, BlendMode.srcIn),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w400,
                  color: textColor,
                  height: 1,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
