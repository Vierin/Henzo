import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../constants/colors.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/color_hex.dart';

String ownerDailyScheduleTrainerLabel(
  OwnerTrainingSession session,
  String? ownerFallback,
) {
  final raw = session.trainerName.trim();
  if (raw.isNotEmpty && !_isPlaceholderTrainerName(raw)) {
    return raw;
  }
  final f = ownerFallback?.trim();
  if (f != null && f.isNotEmpty) return f;
  return '—';
}

bool _isPlaceholderTrainerName(String value) {
  final t = value.trim();
  if (t.isEmpty) return true;
  if (t == '-' || t == '—') return true;
  if (t == '\u2013' || t == '\u2014') return true; // en dash, em dash
  final lower = t.toLowerCase();
  if (lower == 'n/a' || lower == 'tbd' || lower == 'none') return true;
  return false;
}

/// Карточка слота в дневном расписании (как на дашборде).
class OwnerDailyScheduleSessionCard extends StatelessWidget {
  const OwnerDailyScheduleSessionCard({
    super.key,
    required this.session,
    required this.subtitleLabel,
    this.showLocationPin = false,
    this.trainerLine,
    this.onBookAgain,
    this.dimPastSessions = true,
    this.trailingPriceLabel,
    this.showSubtitleLeadingIcon = true,
    required this.onTap,
  });

  final OwnerTrainingSession session;
  final String subtitleLabel;
  final bool showLocationPin;

  /// Shown under [subtitleLabel] when [showLocationPin] (location row).
  final String? trainerLine;

  /// When set, right column shows «Book again» instead of capacity/fill.
  final VoidCallback? onBookAgain;

  /// When false, past sessions keep full opacity (e.g. Passes history).
  final bool dimPastSessions;

  /// When non-null, right column shows price only (Explore list).
  final String? trailingPriceLabel;

  /// Pin / person icon before [subtitleLabel]; set false for studio-name line.
  final bool showSubtitleLeadingIcon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final s = session;
    final cap = s.capacity;
    final enrolled = s.enrolledCount;
    final progress = cap > 0 ? (enrolled / cap).clamp(0.0, 1.0) : 0.0;
    final fillLabel = cap > 0 ? '$enrolled/$cap' : '$enrolled';
    final isPast = s.endsAt.isBefore(DateTime.now());
    final accent =
        parseHexColor(s.trainingDisplayColorHex) ?? AppColors.primary500;
    final duration = s.endsAt.difference(s.startsAt).inMinutes;
    final startLabel = MaterialLocalizations.of(context).formatTimeOfDay(
      TimeOfDay.fromDateTime(s.startsAt.toLocal()),
      alwaysUse24HourFormat: true,
    );

    Color progressColor = accent;
    if (progress < 0.5) {
      progressColor = const Color(0xFFE26152);
    } else if (progress < 1.0) {
      progressColor = const Color(0xFFB7D356);
    }

    final trainerRowText = trainerLine?.trim() ?? '';
    final priceText = trailingPriceLabel?.trim() ?? '';

    final card = Container(
          margin: const EdgeInsets.only(bottom: 10),
          clipBehavior: Clip.hardEdge,
          decoration: BoxDecoration(
            color: AppColors.backgroundPrimary,
            borderRadius: BorderRadius.circular(14),
          ),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(width: 4, decoration: BoxDecoration(color: accent)),
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 14, 0, 14),
                  child: SizedBox(
                    width: 56,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        Text(
                          startLabel,
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w600,
                            height: 1,
                            letterSpacing: -0.3,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        Text(
                          '$duration min',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFFA4A4A4),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Container(width: 1, color: accent),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 14, 12, 14),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          s.trainingName,
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            height: 1,
                            letterSpacing: -0.3,
                            color: AppColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (subtitleLabel.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (showSubtitleLeadingIcon) ...[
                                if (showLocationPin) ...[
                                  Padding(
                                    padding: const EdgeInsets.only(top: 1),
                                    child: SvgPicture.asset(
                                      'assets/icons/icon-pin.svg',
                                      width: 11,
                                      height: 15,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                ] else ...[
                                  Padding(
                                    padding: const EdgeInsets.only(top: 1),
                                    child: Icon(
                                      Icons.person_outline,
                                      size: 13,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                  const SizedBox(width: 3),
                                ],
                              ],
                              Flexible(
                                child: Text(
                                  subtitleLabel,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w400,
                                    color: AppColors.textSecondary,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                        if (trainerRowText.isNotEmpty) ...[
                          const SizedBox(height: 3),
                          Row(
                            children: [
                              Icon(
                                Icons.person_outline,
                                size: 13,
                                color: AppColors.textSecondary,
                              ),
                              const SizedBox(width: 3),
                              Expanded(
                                child: Text(
                                  trainerRowText,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w400,
                                    color: AppColors.textSecondary,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: EdgeInsets.fromLTRB(
                    0,
                    14,
                    onBookAgain != null && priceText.isEmpty ? 8 : 14,
                    14,
                  ),
                  child: priceText.isNotEmpty
                      ? Center(
                          child: Text(
                            priceText,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: accent,
                              height: 1.1,
                            ),
                          ),
                        )
                      : onBookAgain != null
                          ? Center(
                              child: TextButton(
                                onPressed: onBookAgain,
                                style: TextButton.styleFrom(
                                  backgroundColor: AppColors.primary500,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 8,
                                  ),
                                  minimumSize: Size.zero,
                                  tapTargetSize:
                                      MaterialTapTargetSize.shrinkWrap,
                                ),
                                child: const Text(
                                  'Book again',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppColors.backgroundPrimary,
                                    fontWeight: FontWeight.w700,
                                    height: 1.15,
                                  ),
                                ),
                              ),
                            )
                          : Column(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  fillLabel,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w500,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                SizedBox(
                                  width: 52,
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(999),
                                    child: LinearProgressIndicator(
                                      minHeight: 4,
                                      value: progress,
                                      backgroundColor: AppColors.borderPrimary,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        progressColor,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                ),
              ],
            ),
          ),
        );

    final wrapped = dimPastSessions && isPast
        ? Opacity(opacity: 0.65, child: card)
        : card;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: wrapped,
    );
  }
}
