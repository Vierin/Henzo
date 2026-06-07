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

/// Карточка сотрудника / владельца.
class StaffPersonTile extends StatelessWidget {
  const StaffPersonTile({
    super.key,
    required this.name,
    this.secondaryLine = '',
    this.role,
    this.emailLine,
    this.badge,
    this.photoUrl,
    this.avatarRadius = 36,
    this.backgroundColor = AppColors.backgroundPrimary,
    this.borderSide,
    this.trailing,
    this.onTap,
  });

  final String name;
  /// Используется только если [role] == null (owner tile).
  final String secondaryLine;
  final String? role;
  final String? emailLine;
  /// Виджет-бейдж, размещается над [trailing] справа.
  final Widget? badge;
  final String? photoUrl;
  final double avatarRadius;
  final Color backgroundColor;
  final BorderSide? borderSide;
  final Widget? trailing;
  final VoidCallback? onTap;

  static const double _cardRadius = 12;

  @override
  Widget build(BuildContext context) {
    final hasRight = badge != null || trailing != null;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: backgroundColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_cardRadius),
          side: borderSide ?? BorderSide.none,
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(_cardRadius),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                StaffPersonAvatar(
                  displayName: name,
                  photoUrl: photoUrl,
                  radius: avatarRadius,
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
                        style: TextStyle(
                          fontSize: 15.sp,
                          fontWeight: FontWeight.w600,
                          letterSpacing: -0.3,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      if (role != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          role!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13.sp,
                            fontWeight: FontWeight.w500,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                      if (emailLine != null && emailLine!.isNotEmpty) ...[
                        const SizedBox(height: 1),
                        Text(
                          emailLine!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12.sp,
                            color: AppColors.textSecondary,
                            letterSpacing: -0.1,
                          ),
                        ),
                      ],
                      if (role == null && secondaryLine.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Text(
                          secondaryLine,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13.sp,
                            fontWeight: FontWeight.w400,
                            letterSpacing: -0.2,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (hasRight) ...[
                  const SizedBox(width: 8),
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      ?badge,
                      if (badge != null && trailing != null)
                        const SizedBox(height: 6),
                      ?trailing,
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
