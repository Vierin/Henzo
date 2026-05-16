import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../constants/layout.dart';

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

  String get _minutesLabel {
    final diff = startsAt.toLocal().difference(DateTime.now());
    if (diff.isNegative) return 'NOW';
    final mins = diff.inMinutes;
    if (mins < 60) return 'IN $mins MIN';
    final h = diff.inHours;
    if (h < 24) return 'IN $h H';
    return DateFormat('MMM d').format(startsAt.toLocal()).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final local = startsAt.toLocal();
    final isToday = DateUtils.isSameDay(local, DateTime.now());
    final dayLabel =
        isToday ? 'TODAY' : DateFormat('EEE').format(local).toUpperCase();
    final timeLabel = DateFormat('H:mm').format(local);

    return Padding(
      padding: screenPaddingH(),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: onTap,
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: const LinearGradient(
                colors: [Color(0xFFF07A63), Color(0xFFE85D4A)],
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              ),
            ),
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Container(
                  width: 64,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Column(
                    children: [
                      Text(
                        dayLabel,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: Colors.white70,
                          letterSpacing: 0.4,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        timeLabel,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _minutesLabel,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: Colors.white70,
                          letterSpacing: 0.3,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$className · $studioName',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                          height: 1.2,
                        ),
                      ),
                      if (trainerName != null && trainerName!.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          'with $trainerName',
                          style: const TextStyle(
                            fontSize: 13,
                            color: Colors.white70,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: Colors.white,
                  size: 28,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
