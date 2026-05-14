import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../constants/colors.dart';

class ClientListTile extends StatelessWidget {
  const ClientListTile({
    super.key,
    required this.name,
    required this.visitsCount,
    required this.onTap,
  });

  final String name;
  final int visitsCount;
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
                      fontSize: 22,
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
                      const SizedBox(height: 4),
                      Text(
                        'Визиты: $visitsCount',
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
                  ),
                ),
                const SizedBox(width: 12),
                const _ClientCardArrowButton(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ClientCardArrowButton extends StatelessWidget {
  const _ClientCardArrowButton();

  static const double _d = 30;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: _d,
      height: _d,
      child: DecoratedBox(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.primary500, width: 1),
        ),
        child: Center(
          child: SvgPicture.asset(
            'assets/icons/icon-arrow.svg',
            width: 14,
            height: 7,
            fit: BoxFit.contain,
            colorFilter: const ColorFilter.mode(
              AppColors.primary500,
              BlendMode.srcIn,
            ),
          ),
        ),
      ),
    );
  }
}
