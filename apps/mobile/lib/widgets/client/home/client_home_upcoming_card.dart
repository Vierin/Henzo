import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:intl/intl.dart';

import '../../../constants/colors.dart';
import '../../../constants/layout.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class ClientHomeUpcomingCard extends StatelessWidget {
  const ClientHomeUpcomingCard({
    super.key,
    required this.startsAt,
    required this.className,
    required this.studioName,
    this.trainerName,
    this.onTap,
  });

  final DateTime startsAt;
  final String className;
  final String studioName;
  final String? trainerName;
  final VoidCallback? onTap;

  static const _cardRadius = 18.0;
  static const _dateBoxSize = 65.0;
  static const _dateBoxRadius = 12.0;

  @override
  Widget build(BuildContext context) {
    final local = startsAt.toLocal();
    const dayLabel = 'TODAY';
    final timeLabel = DateFormat('H:mm').format(local);

    return Padding(
      padding: screenPaddingH(),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(_cardRadius),
          onTap: onTap,
          child: Ink(
            decoration: BoxDecoration(
              color: AppColors.primary500,
              borderRadius: BorderRadius.circular(_cardRadius),
            ),
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  width: _dateBoxSize,
                  height: _dateBoxSize,
                  decoration: BoxDecoration(
                    color: const Color(0xE6FFFFFF),
                    borderRadius: BorderRadius.circular(_dateBoxRadius),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        dayLabel,
                        style: TextStyle(
                          fontSize: 11.sp,
                          color: AppColors.textSecondary,
                          letterSpacing: -0.3,
                          height: 1.1,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        timeLabel,
                        style: TextStyle(
                          fontSize: 20.sp,
                          color: AppColors.textPrimary,
                          height: 1.1,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 17),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          SvgPicture.asset(
                            'assets/icons/icon-pin-white.svg',
                            width: 10,
                            height: 14,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              studioName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 14.sp,
                                fontWeight: FontWeight.w400,
                                color: Colors.white,
                                height: 1.1,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        className,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 24.sp,
                          fontWeight: FontWeight.w500,
                          color: Colors.white,
                          height: 1.15,
                        ),
                      ),
                      if (trainerName != null && trainerName!.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            SvgPicture.asset(
                              'assets/icons/icon-profile.svg',
                              width: 11,
                              height: 13,
                              colorFilter: const ColorFilter.mode(
                                Colors.white,
                                BlendMode.srcIn,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                trainerName!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 14.sp,
                                  fontWeight: FontWeight.w400,
                                  color: Colors.white,
                                  height: 1.2,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                SvgPicture.asset(
                  'assets/icons/icon-chevron-right.svg',
                  width: 9,
                  height: 14,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
