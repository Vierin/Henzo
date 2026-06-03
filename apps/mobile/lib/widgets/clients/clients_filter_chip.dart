import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class ClientsFilterChip extends StatelessWidget {
  const ClientsFilterChip({
    super.key,
    required this.count,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final int count;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final inverse = isSelected;
    final labelStyle = TextStyle(
      fontSize: 14.sp,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.3,
      height: 1.1,
      color: inverse ? AppColors.textInverse : AppColors.textSecondary,
    );
    final countStyle = TextStyle(
      fontSize: 14.sp,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.3,
      height: 1.1,
      fontFeatures: const [FontFeature.tabularFigures()],
      color: inverse
          ? AppColors.textInverse.withValues(alpha: 0.5)
          : AppColors.textPrimary.withValues(alpha: 0.5),
    );

    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(15),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(15),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: inverse ? AppColors.primary500 : AppColors.backgroundPrimary,
            borderRadius: BorderRadius.circular(15),
            border: Border.all(
              color: inverse ? AppColors.primary500 : AppColors.borderPrimary,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(label, style: labelStyle),
              const SizedBox(width: 6),
              Text('$count', style: countStyle),
            ],
          ),
        ),
      ),
    );
  }
}
