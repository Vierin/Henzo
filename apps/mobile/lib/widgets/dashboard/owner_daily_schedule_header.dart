import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// «DAILY SCHEDULE» и опционально «See all ›» (только дашборд).
class OwnerDailyScheduleHeader extends StatelessWidget {
  const OwnerDailyScheduleHeader({
    super.key,
    this.onSeeAll,
  });

  final VoidCallback? onSeeAll;

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    return Row(
      children: [
        Expanded(
          child: Text(
            locale.t('dashboard.dailySchedule'),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 16.sp,
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
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  locale.t('dashboard.seeAll'),
                  style: TextStyle(
                    fontSize: 16.sp,
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
