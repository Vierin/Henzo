import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Capacity ring + summary; optional Add button (owner session detail).
class SessionCapacityCard extends StatelessWidget {
  const SessionCapacityCard({
    super.key,
    required this.accent,
    required this.enrolled,
    required this.capacity,
    this.waitlistCount = 0,
    this.onAddPressed,
  });

  final Color accent;
  final int enrolled;
  final int capacity;
  final int waitlistCount;
  final VoidCallback? onAddPressed;

  @override
  Widget build(BuildContext context) {
    final tr = context.watch<LocaleProvider>().t;
    final cap = capacity;
    final fillRatio = cap > 0 ? (enrolled / cap).clamp(0.0, 1.0) : 0.0;
    final pct = cap > 0 ? (fillRatio * 100).round() : 0;
    final spotsLeft = cap > 0 ? (cap - enrolled).clamp(0, cap) : 0;

    return Container(
      padding: const EdgeInsets.fromLTRB(15, 11, 15, 11),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(20),
      ),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            SizedBox(
              width: 64,
              height: 64,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox.expand(
                    child: CircularProgressIndicator(
                      value: fillRatio,
                      strokeWidth: 6,
                      backgroundColor: accent.withValues(alpha: 0.22),
                      color: accent,
                      strokeCap: StrokeCap.round,
                    ),
                  ),
                  Text(
                    '$pct%',
                    style: TextStyle(
                      fontSize: 16.sp,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                      letterSpacing: -0.5,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    tr('ownerSession.capacityLabel'),
                    style: TextStyle(
                      fontSize: 13.sp,
                      fontWeight: FontWeight.w500,
                      letterSpacing: -0.3,
                      color: AppColors.textPrimary.withValues(alpha: 0.4),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    tr('ownerSession.bookedSummary')
                        .replaceAll('{current}', '$enrolled')
                        .replaceAll('{max}', '$cap'),
                    style: TextStyle(
                      fontSize: 15.sp,
                      letterSpacing: -0.3,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    waitlistCount > 0
                        ? tr('ownerSession.capacityWaitlistLine')
                            .replaceAll('{spots}', '$spotsLeft')
                            .replaceAll('{waitlist}', '$waitlistCount')
                        : tr('ownerSession.spotsLeftLine')
                            .replaceAll('{spots}', '$spotsLeft'),
                    style: TextStyle(
                      fontSize: 11.sp,
                      letterSpacing: -0.3,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textPrimary.withValues(alpha: 0.4),
                    ),
                  ),
                ],
              ),
            ),
            if (onAddPressed != null) ...[
              const SizedBox(width: 10),
              FilledButton.icon(
                onPressed: onAddPressed,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary500,
                  foregroundColor: AppColors.textInverse,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                icon: const Icon(Icons.add, size: 20),
                label: Text(tr('ownerSession.add')),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
