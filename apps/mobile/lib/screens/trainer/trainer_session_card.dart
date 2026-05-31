import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

import '../../constants/colors.dart';
import '../../utils/color_hex.dart';
import '../../utils/formatters.dart';

class TrainerSessionCard extends StatelessWidget {
  const TrainerSessionCard({
    super.key,
    required this.session,
    required this.onTap,
  });

  final Map<String, dynamic> session;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final training = session['Training'] is Map
        ? Map<String, dynamic>.from(session['Training'] as Map)
        : <String, dynamic>{};
    final title = (training['name'] ?? 'Class').toString();
    final colorHex = training['displayColor']?.toString();
    final accent =
        parseHexColor(colorHex) ?? AppColors.primary500;

    final startsAt = parseApiDateTime(session['startsAt'] as String?);
    final endsAt = parseApiDateTime(session['endsAt'] as String?);
    final timeLabel = startsAt != null
        ? '${formatTime24(startsAt)}${endsAt != null ? ' – ${formatTime24(endsAt)}' : ''}'
        : '';

    final capacity = (session['capacity'] as num?)?.toInt() ?? 0;
    final booked = (session['bookedCount'] as num?)?.toInt() ?? 0;
    final spotsLabel = capacity > 0 ? '$booked/$capacity' : '$booked';

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 4,
                height: 48,
                decoration: BoxDecoration(
                  color: accent,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 15.sp,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    if (timeLabel.isNotEmpty)
                      Text(
                        timeLabel,
                        style: TextStyle(
                          fontSize: 12.sp,
                          color: AppColors.textSecondary,
                        ),
                      ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Icon(Icons.people_outline, size: 16, color: AppColors.textSecondary),
                  Text(
                    spotsLabel,
                    style: TextStyle(fontSize: 12.sp, color: AppColors.textSecondary),
                  ),
                ],
              ),
              const SizedBox(width: 4),
              const Icon(Icons.chevron_right_rounded, color: AppColors.textSecondary, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}
