import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../constants/colors.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

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
    this.badgeCount,
  });

  final String svgAsset;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  final Color? inactiveIconColor;
  final Color? inactiveLabelColor;
  final int? badgeCount;

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
              Stack(
                clipBehavior: Clip.none,
                children: [
                  SvgPicture.asset(
                    svgAsset,
                    width: 20,
                    height: 20,
                    colorFilter: ColorFilter.mode(iconColor, BlendMode.srcIn),
                  ),
                  if ((badgeCount ?? 0) > 0)
                    Positioned(
                      right: -7,
                      top: -6,
                      child: Container(
                        constraints: const BoxConstraints(
                          minWidth: 16,
                          minHeight: 16,
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        decoration: BoxDecoration(
                          color: AppColors.error500,
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                            color: isSelected
                                ? AppColors.primary500
                                : AppColors.backgroundPrimary,
                          ),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          (badgeCount ?? 0) > 99 ? '99+' : '${badgeCount ?? 0}',
                          style: TextStyle(
                            fontSize: 9.sp,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                            height: 1,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11.sp,
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
