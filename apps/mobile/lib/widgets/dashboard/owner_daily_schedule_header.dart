import 'package:flutter/material.dart';

import '../../constants/colors.dart';

/// «DAILY SCHEDULE» и опционально «See all ›» (только дашборд).
class OwnerDailyScheduleHeader extends StatelessWidget {
  const OwnerDailyScheduleHeader({
    super.key,
    this.onSeeAll,
  });

  final VoidCallback? onSeeAll;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Expanded(
          child: Text(
            'DAILY SCHEDULE',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w500,
              letterSpacing: -0.8,
              color: AppColors.textPrimary,
            ),
          ),
        ),
        if (onSeeAll != null)
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: onSeeAll,
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'See all',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: AppColors.primary500,
                  ),
                ),
                SizedBox(width: 1),
                Icon(
                  Icons.chevron_right,
                  size: 18,
                  color: AppColors.primary500,
                ),
              ],
            ),
          ),
      ],
    );
  }
}
