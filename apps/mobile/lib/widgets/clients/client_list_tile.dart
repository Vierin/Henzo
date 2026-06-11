import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class ClientListTile extends StatelessWidget {
  const ClientListTile({
    super.key,
    required this.name,
    required this.secondaryLine,
    required this.onTap,
  });

  final String name;
  final String secondaryLine;
  final VoidCallback onTap;

  static const double _cardRadius = 12;
  static const double _avatarRadius = 26;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(_cardRadius),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(_cardRadius),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                CircleAvatar(
                  radius: _avatarRadius,
                  backgroundColor: AppColors.primary100,
                  child: Text(
                    name.isNotEmpty ? name[0].toUpperCase() : '-',
                    style: TextStyle(
                      fontSize: 22.sp,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary500,
                      height: 1,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style:
                            theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w500,
                              fontSize: 16.sp,
                              letterSpacing: -0.3,
                              color: AppColors.textPrimary,
                            ) ??
                            TextStyle(
                              fontSize: 16.sp,
                              fontWeight: FontWeight.w500,
                              letterSpacing: -0.3,
                              color: AppColors.textPrimary,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        secondaryLine,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style:
                            theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w400,
                              fontSize: 14.sp,
                              letterSpacing: -0.2,
                              color: AppColors.textSecondary,
                            ) ??
                            TextStyle(
                              fontSize: 14.sp,
                              fontWeight: FontWeight.w400,
                              letterSpacing: -0.2,
                              color: AppColors.textSecondary,
                            ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(
                  Icons.chevron_right_rounded,
                  size: 22,
                  color: AppColors.primary500,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
