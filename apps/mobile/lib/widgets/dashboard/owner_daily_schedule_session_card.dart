import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../constants/colors.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/color_hex.dart';
import '../../utils/formatters.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

String ownerDailyScheduleTrainerLabel(
  OwnerTrainingSession session,
  String? ownerFallback,
) {
  final raw = session.trainerName.trim();
  if (raw.isNotEmpty && !isPlaceholderScheduleTrainerName(raw)) {
    return raw;
  }
  final f = ownerFallback?.trim();
  if (f != null && f.isNotEmpty) return f;
  return '—';
}

Widget _scheduleLocationPin() {
  return Padding(
    padding: const EdgeInsets.only(top: 1),
    child: SvgPicture.asset('assets/icons/icon-pin.svg', width: 11, height: 15),
  );
}

Widget _scheduleTrainerIcon() {
  return Padding(
    padding: const EdgeInsets.only(top: 1),
    child: SvgPicture.asset(
      'assets/icons/icon-profile.svg',
      width: 11,
      height: 13,
      colorFilter: const ColorFilter.mode(Color(0xFF4D39A8), BlendMode.srcIn),
    ),
  );
}

String? scheduleTrainerLineOrNull(
  OwnerTrainingSession session,
  String? ownerFallback,
) {
  final label = ownerDailyScheduleTrainerLabel(session, ownerFallback);
  return isPlaceholderScheduleTrainerName(label) ? null : label;
}

/// Trainer on [trainerLine] only; subtitle holds location (pin) or studio.
({
  String subtitleLabel,
  bool showLocationPin,
  bool showSubtitleLeadingIcon,
  String? trainerLine,
})
layoutOwnerSessionCardRows({
  required OwnerTrainingSession session,
  required String subtitleLabel,
  required bool showLocationPin,
  String? ownerTrainerFallback,
}) {
  final trainerLine = scheduleTrainerLineOrNull(session, ownerTrainerFallback);
  var label = subtitleLabel;
  if (!showLocationPin &&
      trainerLine != null &&
      label.trim() == trainerLine.trim()) {
    label = '';
  }
  return (
    subtitleLabel: label,
    showLocationPin: showLocationPin,
    showSubtitleLeadingIcon: showLocationPin,
    trainerLine: trainerLine,
  );
}

bool isPlaceholderScheduleTrainerName(String value) {
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
    this.bookActionLabel = 'Book again',
    this.bookActionLoading = false,
    this.isBooked = false,
    this.onLeaveReview,
    this.leaveReviewLabel = 'Leave review',
    this.leaveReviewLoading = false,
    this.showDateAboveTime = false,
    this.onCancelBooking,
    this.cancelActionLabel = 'Cancel',
    this.cancelActionLoading = false,
    this.dimPastSessions = true,
    this.trailingPriceLabel,
    this.trailingPriceColor,
    this.showSubtitleLeadingIcon = true,
    required this.onTap,
  });

  final OwnerTrainingSession session;
  final String subtitleLabel;
  final bool showLocationPin;

  /// Shown under [subtitleLabel] when [showLocationPin] (location row).
  final String? trainerLine;

  /// When set, right column shows [bookActionLabel] instead of capacity/fill.
  final VoidCallback? onBookAgain;
  final String bookActionLabel;
  final bool bookActionLoading;
  final bool isBooked;

  final VoidCallback? onLeaveReview;
  final String leaveReviewLabel;
  final bool leaveReviewLoading;

  /// Client bookings: small `dd.MM.yy` above start time.
  final bool showDateAboveTime;

  final VoidCallback? onCancelBooking;
  final String cancelActionLabel;
  final bool cancelActionLoading;

  /// When false, past sessions keep full opacity (e.g. Passes history).
  final bool dimPastSessions;

  /// When non-null, right column shows price only (Explore list).
  final String? trailingPriceLabel;

  /// Price text color; defaults to training accent when null.
  final Color? trailingPriceColor;

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
    final priceColor = trailingPriceColor ?? accent;
    final hasBookAction = isBooked || onBookAgain != null || bookActionLoading;
    final hasReviewAction = onLeaveReview != null || leaveReviewLoading;
    final hasCancelAction = onCancelBooking != null || cancelActionLoading;
    final showPriceAboveBook = priceText.isNotEmpty && hasBookAction;
    final trailingInset =
        (hasBookAction || hasReviewAction || hasCancelAction) &&
            !showPriceAboveBook
        ? 8.0
        : 14.0;

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
              padding: const EdgeInsets.fromLTRB(12, 10, 0, 10),
              child: SizedBox(
                width: 56,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (showDateAboveTime) ...[
                      Text(
                        formatBookingCardDate(s.startsAt),
                        style: TextStyle(
                          fontSize: 11.sp,
                          fontWeight: FontWeight.w600,
                          height: 1,
                          color: AppColors.textTertiary,
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],
                    Text(
                      startLabel,
                      style: TextStyle(
                        fontSize: 17.sp,
                        fontWeight: FontWeight.w600,
                        height: 1,
                        letterSpacing: -0.3,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '$duration min',
                      style: TextStyle(
                        fontSize: 11.sp,
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
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      s.trainingName,
                      style: TextStyle(
                        fontSize: 17.sp,
                        fontWeight: FontWeight.w700,
                        height: 1,
                        letterSpacing: -0.3,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (subtitleLabel.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (showSubtitleLeadingIcon) ...[
                            _scheduleLocationPin(),
                            const SizedBox(width: 4),
                          ],
                          Flexible(
                            child: Text(
                              subtitleLabel,
                              style: TextStyle(
                                fontSize: 14.sp,
                                fontWeight: FontWeight.w400,
                                color: AppColors.textPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                    if (trainerRowText.isNotEmpty) ...[
                      if (subtitleLabel.isNotEmpty) const SizedBox(height: 4),
                      Row(
                        children: [
                          _scheduleTrainerIcon(),
                          const SizedBox(width: 3),
                          Expanded(
                            child: Text(
                              trainerRowText,
                              style: TextStyle(
                                fontSize: 14.sp,
                                fontWeight: FontWeight.w400,
                                color: AppColors.textPrimary,
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
              padding: EdgeInsets.fromLTRB(0, 14, trailingInset, 14),
              child: showPriceAboveBook
                  ? Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          priceText,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 15.sp,
                            fontWeight: FontWeight.w800,
                            color: priceColor,
                            height: 1.1,
                          ),
                        ),
                        const SizedBox(height: 10),
                        _ScheduleTrailingActions(
                          bookLabel: bookActionLabel,
                          bookLoading: bookActionLoading,
                          onBook: onBookAgain,
                          reviewLabel: leaveReviewLabel,
                          reviewLoading: leaveReviewLoading,
                          onReview: onLeaveReview,
                          isBooked: isBooked,
                        ),
                      ],
                    )
                  : priceText.isNotEmpty
                  ? Center(
                      child: Text(
                        priceText,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 15.sp,
                          fontWeight: FontWeight.w800,
                          color: priceColor,
                          height: 1.1,
                        ),
                      ),
                    )
                  : hasBookAction || hasReviewAction
                  ? Center(
                      child: _ScheduleTrailingActions(
                        bookLabel: bookActionLabel,
                        bookLoading: bookActionLoading,
                        onBook: hasBookAction ? onBookAgain : null,
                        reviewLabel: leaveReviewLabel,
                        reviewLoading: leaveReviewLoading,
                        onReview: onLeaveReview,
                        isBooked: isBooked,
                      ),
                    )
                  : hasCancelAction
                  ? Center(
                      child: TextButton(
                        onPressed: cancelActionLoading ? null : onCancelBooking,
                        style: TextButton.styleFrom(
                          foregroundColor: AppColors.error500,
                          side: const BorderSide(color: AppColors.error500),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 15,
                            vertical: 8,
                          ),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: cancelActionLoading
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.error500,
                                ),
                              )
                            : Text(
                                cancelActionLabel,
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 13.sp,
                                  fontWeight: FontWeight.w700,
                                  height: 1.1,
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
                          style: TextStyle(
                            fontSize: 15.sp,
                            fontWeight: FontWeight.w500,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        SizedBox(
                          width: 55,
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

class _ScheduleTrailingActions extends StatelessWidget {
  const _ScheduleTrailingActions({
    required this.bookLabel,
    required this.bookLoading,
    required this.onBook,
    required this.reviewLabel,
    required this.reviewLoading,
    required this.onReview,
    this.isBooked = false,
  });

  final String bookLabel;
  final bool bookLoading;
  final VoidCallback? onBook;
  final String reviewLabel;
  final bool reviewLoading;
  final VoidCallback? onReview;
  final bool isBooked;

  @override
  Widget build(BuildContext context) {
    final showBook = isBooked || onBook != null || bookLoading;
    final showReview = onReview != null || reviewLoading;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (showBook)
          isBooked
              ? _BookedBadge()
              : _ScheduleBookButton(
                  label: bookLabel,
                  loading: bookLoading,
                  onPressed: onBook,
                ),
        if (showReview) ...[
          if (showBook) const SizedBox(height: 6),
          _ScheduleReviewButton(
            label: reviewLabel,
            loading: reviewLoading,
            onPressed: onReview,
          ),
        ],
      ],
    );
  }
}

class _BookedBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFE8F5E9),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFF81C784)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.check_rounded, size: 14, color: Color(0xFF388E3C)),
          SizedBox(width: 4),
          Text(
            'Booked',
            style: TextStyle(
              fontSize: 12.sp,
              fontWeight: FontWeight.w700,
              color: Color(0xFF388E3C),
              height: 1.1,
            ),
          ),
        ],
      ),
    );
  }
}

class _ScheduleReviewButton extends StatelessWidget {
  const _ScheduleReviewButton({
    required this.label,
    required this.loading,
    required this.onPressed,
  });

  final String label;
  final bool loading;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: loading ? null : onPressed,
      style: TextButton.styleFrom(
        foregroundColor: AppColors.primary500,
        side: const BorderSide(color: AppColors.primary500),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      child: loading
          ? const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.primary500,
              ),
            )
          : Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12.sp,
                fontWeight: FontWeight.w700,
                height: 1.15,
              ),
            ),
    );
  }
}

class _ScheduleBookButton extends StatelessWidget {
  const _ScheduleBookButton({
    required this.label,
    required this.loading,
    required this.onPressed,
  });

  final String label;
  final bool loading;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: loading ? null : onPressed,
      style: TextButton.styleFrom(
        backgroundColor: AppColors.primary500,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      child: loading
          ? const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.backgroundPrimary,
              ),
            )
          : Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12.sp,
                color: AppColors.backgroundPrimary,
                fontWeight: FontWeight.w700,
                height: 1.15,
              ),
            ),
    );
  }
}
