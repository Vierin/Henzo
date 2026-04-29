import 'package:flutter/material.dart';

import '../../constants/colors.dart';

class ClassScheduleCard extends StatelessWidget {
  const ClassScheduleCard({
    super.key,
    required this.timeLabel,
    required this.durationMin,
    required this.className,
    required this.trainerName,
    required this.priceLabel,
    required this.onBook,
    this.bookedCount,
    this.capacity,
    this.isBooking = false,
  });

  final String timeLabel;
  final int? durationMin;
  final String className;
  final String trainerName;
  final String? priceLabel;
  final VoidCallback? onBook;
  final int? bookedCount;
  final int? capacity;
  final bool isBooking;

  @override
  Widget build(BuildContext context) {
    final hasCapacity = capacity != null && capacity! > 0;
    final safeBooked = bookedCount ?? 0;
    final fillRatio = hasCapacity ? (safeBooked / capacity!).clamp(0.0, 1.0) : 0.0;
    final isFull = hasCapacity && safeBooked >= capacity!;
    final canBook = !isBooking && !isFull && onBook != null;

    return Container(
      color: AppColors.backgroundPrimary,
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 82,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  timeLabel,
                  style: const TextStyle(
                    fontSize: 28 / 1.6,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                if (durationMin != null)
                  Text(
                    '($durationMin min)',
                    style: const TextStyle(color: AppColors.textSecondary),
                  ),
              ],
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  className,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 20 / 1.6,
                    color: AppColors.textPrimary,
                  ),
                ),
                if (trainerName.trim().isNotEmpty)
                  Text(
                    trainerName,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 13,
                    ),
                  ),
                if (hasCapacity) ...[
                  const SizedBox(height: 6),
                  Text(
                    '$safeBooked/$capacity spots',
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      minHeight: 6,
                      value: fillRatio,
                      backgroundColor: AppColors.neutral200,
                      valueColor:
                          const AlwaysStoppedAnimation<Color>(AppColors.primary500),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (priceLabel != null && priceLabel!.isNotEmpty)
                Text(
                  priceLabel!,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary500,
                    fontSize: 26 / 1.6,
                  ),
                ),
              const SizedBox(height: 8),
              SizedBox(
                height: 36,
                child: OutlinedButton(
                  onPressed: canBook ? onBook : null,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary500,
                    side: const BorderSide(color: AppColors.primary500),
                  ),
                  child: Text(isBooking ? '...' : (isFull ? 'Full' : 'Book')),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
