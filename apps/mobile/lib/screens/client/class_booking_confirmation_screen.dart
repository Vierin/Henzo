import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../utils/formatters.dart';

/// Shown after a successful client self-booking (mockup: ticket + actions).
class ClassBookingConfirmationScreen extends StatelessWidget {
  factory ClassBookingConfirmationScreen.fromMaps({
    required Map<String, dynamic> session,
    Map<String, dynamic>? studio,
    int? spotNumber,
  }) {
    final training = session['training'] is Map
        ? Map<String, dynamic>.from(session['training'] as Map)
        : <String, dynamic>{};
    final trainer = session['trainer'] is Map
        ? Map<String, dynamic>.from(session['trainer'] as Map)
        : <String, dynamic>{};
    final owner = studio?['owner'] is Map
        ? Map<String, dynamic>.from(studio!['owner'] as Map)
        : <String, dynamic>{};
    final cat = training['trainingCategory'] is Map
        ? Map<String, dynamic>.from(training['trainingCategory'] as Map)
        : <String, dynamic>{};
    final startsAt = parseApiDateTime(session['startsAt']) ?? DateTime.now();
    final endsAt = parseApiDateTime(session['endsAt']) ??
        startsAt.add(
          Duration(
            minutes: (training['duration'] as num?)?.toInt() ?? 60,
          ),
        );
    final trainerName = (trainer['name'] ?? '').toString().trim();
    final ownerName = (owner['name'] ?? '').toString().trim();
    final locName = (session['locationName'] ?? '').toString().trim();
    final studioName = (studio?['name'] ?? 'Studio').toString();
    final locationLabel = locName.isNotEmpty
        ? locName
        : ((studio?['address'] ?? '').toString().trim().isNotEmpty
            ? (studio!['address'] ?? '').toString().trim()
            : studioName);
    return ClassBookingConfirmationScreen(
      classTitle: (training['name'] ?? 'Class').toString(),
      categoryLabel: (cat['name_en'] ?? '').toString(),
      trainerName:
          trainerName.isNotEmpty ? trainerName : ownerName,
      locationLabel: locationLabel,
      startsAt: startsAt,
      endsAt: endsAt,
      price: (training['price'] as num?)?.toDouble(),
      spotNumber: spotNumber,
      latitude: (studio?['latitude'] as num?)?.toDouble(),
      longitude: (studio?['longitude'] as num?)?.toDouble(),
      studioAddress: (studio?['address'] ?? '').toString(),
    );
  }

  const ClassBookingConfirmationScreen({
    super.key,
    required this.classTitle,
    required this.categoryLabel,
    required this.trainerName,
    required this.locationLabel,
    required this.startsAt,
    required this.endsAt,
    this.price,
    this.spotNumber,
    this.latitude,
    this.longitude,
    this.studioAddress,
  });

  final String classTitle;
  final String categoryLabel;
  final String trainerName;
  final String locationLabel;
  final DateTime startsAt;
  final DateTime endsAt;
  final double? price;
  final int? spotNumber;
  final double? latitude;
  final double? longitude;
  final String? studioAddress;

  String get _headerDateLine {
    final day = DateFormat('EEEE, MMMM d').format(startsAt);
    final time = formatTime24(startsAt);
    return '$day · $time';
  }

  String get _gridDate => DateFormat('EEE, MMM d').format(startsAt);

  String get _gridTime {
    final a = formatTime24(startsAt);
    final b = formatTime24(endsAt);
    return '$a — $b';
  }

  String get _spotLabel =>
      spotNumber != null && spotNumber! > 0 ? '#$spotNumber' : '—';

  String? get _costLabel =>
      price != null && price! > 0 ? formatVnd(price!) : null;

  Future<void> _openCalendar(BuildContext context) async {
    String fmtUtc(DateTime d) =>
        DateFormat("yyyyMMdd'T'HHmmss'Z'").format(d.toUtc());
    final loc = locationLabel.trim();
    final details = [
      if (trainerName.isNotEmpty) 'with $trainerName',
      if (loc.isNotEmpty) loc,
    ].join(' · ');
    final uri = Uri.parse(
      'https://calendar.google.com/calendar/render?action=TEMPLATE'
      '&text=${Uri.encodeComponent(classTitle)}'
      '&dates=${fmtUtc(startsAt)}/${fmtUtc(endsAt)}'
      '&details=${Uri.encodeComponent(details)}'
      '&location=${Uri.encodeComponent(loc)}',
    );
    if (!await canLaunchUrl(uri)) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open calendar')),
        );
      }
      return;
    }
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _openDirections(BuildContext context) async {
    final Uri uri;
    if (latitude != null && longitude != null) {
      uri = Uri.parse(
        'https://www.google.com/maps/search/?api=1'
        '&query=$latitude,$longitude',
      );
    } else {
      final q = (studioAddress?.trim().isNotEmpty == true
              ? studioAddress!.trim()
              : locationLabel.trim())
          .trim();
      if (q.isEmpty) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No address available')),
          );
        }
        return;
      }
      uri = Uri.parse(
        'https://www.google.com/maps/search/?api=1'
        '&query=${Uri.encodeComponent(q)}',
      );
    }
    if (!await canLaunchUrl(uri)) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open maps')),
        );
      }
      return;
    }
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.interTextTheme(Theme.of(context).textTheme);
    final cat = categoryLabel.trim().isEmpty
        ? 'CLASS'
        : categoryLabel.trim().toUpperCase();
    final trainerLine = [
      if (trainerName.trim().isNotEmpty) 'with ${trainerName.trim()}',
      if (locationLabel.trim().isNotEmpty) locationLabel.trim(),
    ].join(' · ');

    return Theme(
      data: Theme.of(context).copyWith(textTheme: textTheme),
      child: Scaffold(
        backgroundColor: AppColors.backgroundBrand,
        body: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: IconButton.styleFrom(
                        backgroundColor: AppColors.backgroundPrimary,
                        foregroundColor: AppColors.textPrimary,
                        shape: const CircleBorder(),
                      ),
                      icon: const Icon(Icons.close_rounded, size: 22),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: EdgeInsets.fromLTRB(
                    kScreenPaddingHorizontal,
                    8,
                    kScreenPaddingHorizontal,
                    48 + MediaQuery.paddingOf(context).bottom,
                  ),
                  child: Column(
                    children: [
                      Text(
                        'Confirmed',
                        style: textTheme.labelLarge?.copyWith(
                          color: AppColors.textTertiary,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.4,
                        ),
                      ),
                      const SizedBox(height: 20),
                      Container(
                        width: 88,
                        height: 88,
                        decoration: BoxDecoration(
                          color: AppColors.primary100,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.check_rounded,
                          size: 48,
                          color: AppColors.primary500,
                        ),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        'You\'re in!',
                        style: textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _headerDateLine,
                        textAlign: TextAlign.center,
                        style: textTheme.bodyLarge?.copyWith(
                          color: AppColors.textSecondary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 28),
                      _BookingTicketCard(
                        categoryLabel: cat,
                        classTitle: classTitle,
                        trainerLine: trainerLine,
                        gridDate: _gridDate,
                        gridTime: _gridTime,
                        spotLabel: _spotLabel,
                        costLabel: _costLabel,
                        onAddToCalendar: () => _openCalendar(context),
                        onDirections: () => _openDirections(context),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BookingTicketCard extends StatelessWidget {
  const _BookingTicketCard({
    required this.categoryLabel,
    required this.classTitle,
    required this.trainerLine,
    required this.gridDate,
    required this.gridTime,
    required this.spotLabel,
    required this.costLabel,
    required this.onAddToCalendar,
    required this.onDirections,
  });

  final String categoryLabel;
  final String classTitle;
  final String trainerLine;
  final String gridDate;
  final String gridTime;
  final String spotLabel;
  final String? costLabel;
  final VoidCallback onAddToCalendar;
  final VoidCallback onDirections;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(22),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 24,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary500,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    categoryLabel,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  classTitle,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                    height: 1.15,
                  ),
                ),
                if (trainerLine.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    trainerLine,
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppColors.textSecondary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const _TicketPerforation(),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _TicketInfoCell(
                        icon: Icons.calendar_today_outlined,
                        label: 'Date',
                        value: gridDate,
                      ),
                    ),
                    Expanded(
                      child: _TicketInfoCell(
                        icon: Icons.schedule_outlined,
                        label: 'Time',
                        value: gridTime,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _TicketInfoCell(
                        icon: Icons.person_outline_rounded,
                        label: 'Spot',
                        value: spotLabel,
                      ),
                    ),
                    Expanded(
                      child: _TicketInfoCell(
                        icon: Icons.payments_outlined,
                        label: 'Cost',
                        value: costLabel ?? 'Free',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: onAddToCalendar,
                        icon: const Icon(
                          Icons.calendar_month_outlined,
                          size: 18,
                          color: AppColors.primary500,
                        ),
                        label: const Text(
                          'Add to Calendar',
                          style: TextStyle(
                            color: AppColors.primary500,
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                        style: OutlinedButton.styleFrom(
                          backgroundColor: AppColors.primary50,
                          side: BorderSide.none,
                          padding: const EdgeInsets.symmetric(
                            vertical: 14,
                            horizontal: 8,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: onDirections,
                        icon: const Icon(
                          Icons.near_me_outlined,
                          size: 18,
                        ),
                        label: const Text(
                          'Directions',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.primary500,
                          foregroundColor: AppColors.textInverse,
                          padding: const EdgeInsets.symmetric(
                            vertical: 14,
                            horizontal: 8,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TicketPerforation extends StatelessWidget {
  const _TicketPerforation();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 28,
      child: Stack(
        alignment: Alignment.center,
        clipBehavior: Clip.none,
        children: [
          Positioned(
            left: 0,
            right: 0,
            top: 13,
            child: CustomPaint(
              size: const Size(double.infinity, 1),
              painter: _DashedDividerPainter(
                color: AppColors.borderPrimary,
              ),
            ),
          ),
          const Positioned(
            left: -14,
            top: 2,
            child: _TicketNotch(),
          ),
          const Positioned(
            right: -14,
            top: 2,
            child: _TicketNotch(),
          ),
        ],
      ),
    );
  }
}

class _TicketNotch extends StatelessWidget {
  const _TicketNotch();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 28,
      height: 28,
      decoration: const BoxDecoration(
        color: AppColors.backgroundBrand,
        shape: BoxShape.circle,
      ),
    );
  }
}

class _DashedDividerPainter extends CustomPainter {
  _DashedDividerPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.2;
    const dash = 6.0;
    const gap = 5.0;
    var x = 20.0;
    final y = size.height / 2;
    while (x < size.width - 20) {
      canvas.drawLine(Offset(x, y), Offset(x + dash, y), paint);
      x += dash + gap;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _TicketInfoCell extends StatelessWidget {
  const _TicketInfoCell({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: AppColors.primary500),
        const SizedBox(height: 6),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: AppColors.textTertiary,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
}
