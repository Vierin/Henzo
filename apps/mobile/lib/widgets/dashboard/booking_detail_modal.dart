import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../models/booking.dart';
import '../../services/cache/studio_cache.dart';
import '../../utils/currency_format.dart';
import '../common/henzo_modal.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class BookingDetailModal {
  static void show(
    BuildContext context, {
    required Booking booking,
    bool showActions = false,
    Function(Booking)? onEdit,
    Function(String)? onCancel,
    Function(String)? onConfirm,
    Function(String)? onReject,
  }) {
    showHenzoModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _BookingDetailContent(
        booking: booking,
        showActions: showActions,
        onEdit: onEdit,
        onCancel: onCancel,
        onConfirm: onConfirm,
        onReject: onReject,
      ),
    );
  }
}

class _BookingDetailContent extends StatelessWidget {
  const _BookingDetailContent({
    required this.booking,
    required this.showActions,
    this.onEdit,
    this.onCancel,
    this.onConfirm,
    this.onReject,
  });

  final Booking booking;
  final bool showActions;
  final Function(Booking)? onEdit;
  final Function(String)? onCancel;
  final Function(String)? onConfirm;
  final Function(String)? onReject;

  @override
  Widget build(BuildContext context) {
    final tr = context.read<LocaleProvider>().t;
    final bottom = MediaQuery.paddingOf(context).bottom;
    final maxH = MediaQuery.sizeOf(context).height * 0.82;

    return SafeArea(
      top: false,
      child: Container(
        decoration: const BoxDecoration(
          color: AppColors.backgroundPrimary,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 10),
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.borderPrimary,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                kScreenPaddingHorizontal,
                12,
                kScreenPaddingHorizontal,
                8,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      tr('booking.detailsTitle'),
                      style: TextStyle(
                        fontSize: 17.sp,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.3,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => Navigator.of(context).pop(),
                      customBorder: const CircleBorder(),
                      child: const Padding(
                        padding: EdgeInsets.all(6),
                        child: Icon(
                          Icons.close,
                          size: 22,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            ConstrainedBox(
              constraints: BoxConstraints(maxHeight: maxH),
              child: SingleChildScrollView(
                  padding: EdgeInsets.fromLTRB(
                    kScreenPaddingHorizontal,
                    4,
                    kScreenPaddingHorizontal,
                    16 + bottom,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Align(
                        alignment: Alignment.centerLeft,
                        child: _BookingDetailStatusBadge(
                          status: booking.status,
                        ),
                      ),
                      const SizedBox(height: 14),
                      _BookingDetailsCard(
                        children: [
                          _BookingDetailRow(
                            label: tr('booking.sectionClient'),
                            primary: booking.user?.name ??
                                tr('booking.unknownClient'),
                            secondary: [
                              if (booking.user?.email != null &&
                                  booking.user!.email!.trim().isNotEmpty)
                                booking.user!.email!.trim(),
                              if (booking.user?.phone != null &&
                                  booking.user!.phone!.trim().isNotEmpty)
                                booking.user!.phone!.trim(),
                            ],
                          ),
                          _BookingDetailRow(
                            label: tr('booking.sectionService'),
                            primary: booking.service?.name ??
                                tr('booking.unknownService'),
                            secondary: [
                              if (booking.service?.duration != null)
                                tr('booking.duration').replaceAll(
                                  '{n}',
                                  '${booking.service!.duration}',
                                ),
                              if (booking.service?.price != null)
                                tr('booking.price').replaceAll(
                                  '{amount}',
                                  formatMoney(
                                    booking.service!.price!,
                                    context.read<StudioCache>().studio?.currency,
                                  ),
                                ),
                            ],
                          ),
                          _BookingDetailRow(
                            label: tr('booking.sectionDateTime'),
                            primary: DateFormat('dd.MM.yyyy')
                                .format(booking.dateTime.toLocal()),
                            secondary: [
                              DateFormat('HH:mm')
                                  .format(booking.dateTime.toLocal()),
                            ],
                          ),
                          _BookingDetailRow(
                            label: tr('booking.sectionTrainer'),
                            primary: booking.staff != null &&
                                    booking.staff!.name.trim().isNotEmpty
                                ? booking.staff!.name.trim()
                                : tr('booking.noTrainer'),
                            showDivider: booking.notes != null &&
                                booking.notes!.trim().isNotEmpty,
                          ),
                          if (booking.notes != null &&
                              booking.notes!.trim().isNotEmpty)
                            _BookingDetailRow(
                              label: tr('booking.sectionNotes'),
                              primary: booking.notes!.trim(),
                              showDivider: false,
                            ),
                        ],
                      ),
                      if (showActions) ...[
                        const SizedBox(height: 16),
                        _BookingDetailActions(
                          booking: booking,
                          onEdit: onEdit,
                          onCancel: onCancel,
                          onConfirm: onConfirm,
                          onReject: onReject,
                          onClose: () => Navigator.of(context).pop(),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _BookingDetailsCard extends StatelessWidget {
  const _BookingDetailsCard({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.backgroundSecondary,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: children,
      ),
    );
  }
}

class _BookingDetailRow extends StatelessWidget {
  const _BookingDetailRow({
    required this.label,
    required this.primary,
    this.secondary = const [],
    this.showDivider = true,
  });

  final String label;
  final String primary;
  final List<String> secondary;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label.toUpperCase(),
                style: TextStyle(
                  fontSize: 11.sp,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.35,
                  color: AppColors.textTertiary,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                primary,
                style: TextStyle(
                  fontSize: 15.sp,
                  fontWeight: FontWeight.w600,
                  height: 1.25,
                  color: AppColors.textPrimary,
                ),
              ),
              for (final line in secondary)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    line,
                    style: TextStyle(
                      fontSize: 13.sp,
                      height: 1.3,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
            ],
          ),
        ),
        if (showDivider)
          const Divider(
            height: 1,
            thickness: 1,
            color: AppColors.borderPrimary,
            indent: 14,
            endIndent: 14,
          ),
      ],
    );
  }
}

class _BookingDetailStatusBadge extends StatelessWidget {
  const _BookingDetailStatusBadge({required this.status});

  final BookingStatus status;

  @override
  Widget build(BuildContext context) {
    final tr = context.read<LocaleProvider>().t;
    final (bg, fg, label) = switch (status) {
      BookingStatus.pending => (
        const Color(0xFFFEF3C7),
        const Color(0xFFD97706),
        tr('bookings.statusPending'),
      ),
      BookingStatus.confirmed => (
        const Color(0xFFD1FAE5),
        const Color(0xFF059669),
        tr('bookings.statusConfirmed'),
      ),
      BookingStatus.completed => (
        const Color(0xFFDBEAFE),
        const Color(0xFF2563EB),
        tr('bookings.statusCompleted'),
      ),
      BookingStatus.canceled => (
        const Color(0xFFFEE2E2),
        const Color(0xFFDC2626),
        tr('bookings.statusCancelled'),
      ),
      BookingStatus.noShow => (
        const Color(0xFFFED7AA),
        const Color(0xFFEA580C),
        tr('bookings.statusNoShow'),
      ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12.sp,
          fontWeight: FontWeight.w600,
          color: fg,
        ),
      ),
    );
  }
}

class _BookingDetailActions extends StatelessWidget {
  const _BookingDetailActions({
    required this.booking,
    this.onEdit,
    this.onCancel,
    this.onConfirm,
    this.onReject,
    required this.onClose,
  });

  final Booking booking;
  final Function(Booking)? onEdit;
  final Function(String)? onCancel;
  final Function(String)? onConfirm;
  final Function(String)? onReject;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final tr = context.read<LocaleProvider>().t;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (booking.status == BookingStatus.pending)
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: () {
                    onConfirm?.call(booking.id);
                    onClose();
                  },
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.success500,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(tr('booking.confirm')),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  onPressed: () {
                    onReject?.call(booking.id);
                    onClose();
                  },
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.error500,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(tr('booking.reject')),
                ),
              ),
            ],
          ),
        if (booking.status == BookingStatus.pending) const SizedBox(height: 10),
        if (booking.status == BookingStatus.confirmed ||
            booking.status == BookingStatus.pending)
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: () {
                    onEdit?.call(booking);
                    onClose();
                  },
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary500,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(tr('booking.edit')),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  onPressed: () async {
                    final confirmed = await showHenzoDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: Text(tr('booking.cancelBooking')),
                        content: Text(tr('booking.cancelConfirm')),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, false),
                            child: Text(tr('common.no')),
                          ),
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, true),
                            style: TextButton.styleFrom(
                              foregroundColor: AppColors.error500,
                            ),
                            child: Text(tr('common.yes')),
                          ),
                        ],
                      ),
                    );
                    if (confirmed == true) {
                      onCancel?.call(booking.id);
                      if (context.mounted) onClose();
                    }
                  },
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.neutral500,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(tr('booking.cancelBooking')),
                ),
              ),
            ],
          ),
      ],
    );
  }
}
