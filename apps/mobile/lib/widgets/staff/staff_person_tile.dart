import 'package:flutter/material.dart';

import '../../constants/colors.dart';

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
      return CircleAvatar(
        radius: radius,
        backgroundColor: AppColors.primary100,
        child: ClipOval(
          child: Image.network(
            url,
            width: radius * 2,
            height: radius * 2,
            fit: BoxFit.cover,
            errorBuilder: (_, _, _) => Center(
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
                              fontSize: 16,
                              letterSpacing: -0.3,
                              color: AppColors.textPrimary,
                            ) ??
                            const TextStyle(
                              fontSize: 16,
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
                                fontSize: 14,
                                letterSpacing: -0.2,
                                color: AppColors.textSecondary,
                              ) ??
                              const TextStyle(
                                fontSize: 14,
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
