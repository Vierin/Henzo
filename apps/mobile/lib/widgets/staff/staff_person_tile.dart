import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

String staffPersonInitials(String name) {
  final parts = name
      .trim()
      .split(RegExp(r'\s+'))
      .where((p) => p.isNotEmpty)
      .take(2)
      .map((p) => p[0].toUpperCase())
      .join();
  if (parts.isNotEmpty) return parts;
  return '?';
}

class StaffPersonAvatar extends StatelessWidget {
  const StaffPersonAvatar({
    super.key,
    required this.displayName,
    this.photoUrl,
    this.radius = 26,
  });

  final String displayName;
  final String? photoUrl;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final url = photoUrl?.trim();
    if (url != null && url.isNotEmpty) {
      final size = radius * 2;
      return SizedBox(
        width: size,
        height: size,
        child: ClipOval(
          child: CachedNetworkImage(
            imageUrl: url,
            width: size,
            height: size,
            fit: BoxFit.cover,
            placeholder: (_, _) => ColoredBox(
              color: AppColors.primary100,
              child: Center(
                child: Text(
                  staffPersonInitials(displayName),
                  style: TextStyle(
                    fontSize: radius * 0.78,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary500,
                  ),
                ),
              ),
            ),
            errorWidget: (_, _, _) => ColoredBox(
              color: AppColors.primary100,
              child: Center(
                child: Text(
                  staffPersonInitials(displayName),
                  style: TextStyle(
                    fontSize: radius * 0.78,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary500,
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }
    return CircleAvatar(
      radius: radius,
      backgroundColor: AppColors.primary100,
      child: Text(
        staffPersonInitials(displayName),
        style: TextStyle(
          fontSize: radius * 0.78,
          fontWeight: FontWeight.w600,
          color: AppColors.primary500,
          height: 1,
        ),
      ),
    );
  }
}

/// Карточка сотрудника / владельца — layout как [ClientListTile].
class StaffPersonTile extends StatelessWidget {
  const StaffPersonTile({
    super.key,
    required this.name,
    required this.secondaryLine,
    this.photoUrl,
    this.trailing,
    this.onTap,
  });

  final String name;
  final String secondaryLine;
  final String? photoUrl;
  final Widget? trailing;
  final VoidCallback? onTap;

  static const double _cardRadius = 12;

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
                StaffPersonAvatar(
                  displayName: name,
                  photoUrl: photoUrl,
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
                      if (secondaryLine.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          secondaryLine,
                          maxLines: 2,
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
                    ],
                  ),
                ),
                if (trailing != null) ...[
                  const SizedBox(width: 8),
                  trailing!,
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
