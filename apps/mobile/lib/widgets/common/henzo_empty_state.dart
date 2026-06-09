import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../constants/colors.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Стандартный empty-state: иконка + текст.
/// Используется в Clients, Staff, Calendar и других экранах.
class HenzoEmptyState extends StatelessWidget {
  const HenzoEmptyState({
    super.key,
    required this.message,
    this.icon,
    this.svgAsset,
    this.iconColor,
    this.iconSize = 64,
    this.subtitle,
    this.action,
  });

  final String message;
  final IconData? icon;
  final String? svgAsset;
  final Color? iconColor;
  final double iconSize;
  final String? subtitle;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (svgAsset != null) ...[
            SvgPicture.asset(
              svgAsset!,
              width: iconSize,
              height: iconSize,
              colorFilter: ColorFilter.mode(
                iconColor ?? AppColors.textSecondary,
                BlendMode.srcIn,
              ),
            ),
            const SizedBox(height: 16),
          ] else if (icon != null) ...[
            Icon(
              icon,
              size: iconSize,
              color: iconColor ?? AppColors.textSecondary,
            ),
            const SizedBox(height: 16),
          ],
          Text(
            message,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 16.sp,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(
              subtitle!,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13.sp,
                color: AppColors.textTertiary,
              ),
            ),
          ],
          if (action != null) ...[
            const SizedBox(height: 20),
            action!,
          ],
        ],
      ),
    );
  }
}
