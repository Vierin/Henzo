import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../utils/color_hex.dart';
import '../../utils/formatters.dart';
import '../../widgets/auth/auth_form_styles.dart';

/// Shown after a successful client self-booking (mockup: ticket + actions).
class ClassBookingConfirmationScreen extends StatelessWidget {
  factory ClassBookingConfirmationScreen.fromMaps({
    required Map<String, dynamic> session,
    Map<String, dynamic>? studio,
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
    final durationMin = (training['duration'] as num?)?.toInt() ?? 60;
    final endsAt = parseApiDateTime(session['endsAt']) ??
        startsAt.add(Duration(minutes: durationMin));
    final trainerName = (trainer['name'] ?? '').toString().trim();
    final ownerName = (owner['name'] ?? '').toString().trim();
    final locName = (session['locationName'] ?? '').toString().trim();
    final studioName = (studio?['name'] ?? 'Studio').toString();
    final studioAddress = (studio?['address'] ?? '').toString().trim();
    final accent =
        parseHexColor(cat['chip_bg_hex']?.toString()) ??
        parseHexColor(training['displayColor']?.toString()) ??
        AppColors.primary500;
    return ClassBookingConfirmationScreen(
      classTitle: (training['name'] ?? 'Class').toString(),
      trainerName: trainerName.isNotEmpty ? trainerName : ownerName,
      locationTitle: locName.isNotEmpty ? locName : studioName,
      studioAddress: studioAddress.isNotEmpty ? studioAddress : null,
      startsAt: startsAt,
      endsAt: endsAt,
      durationMin: durationMin,
      price: (training['price'] as num?)?.toDouble(),
      accent: accent,
      latitude: (studio?['latitude'] as num?)?.toDouble(),
      longitude: (studio?['longitude'] as num?)?.toDouble(),
    );
  }

  const ClassBookingConfirmationScreen({
    super.key,
    required this.classTitle,
    required this.trainerName,
    required this.locationTitle,
    required this.startsAt,
    required this.endsAt,
    required this.durationMin,
    required this.accent,
    this.studioAddress,
    this.price,
    this.latitude,
    this.longitude,
  });

  final String classTitle;
  final String trainerName;
  final String locationTitle;
  final String? studioAddress;
  final DateTime startsAt;
  final DateTime endsAt;
  final int durationMin;
  final Color accent;
  final double? price;
  final double? latitude;
  final double? longitude;

  static const _weekdays = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ];

  static const _monthsShort = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];

  String get _headerDateLine {
    final day = _weekdays[startsAt.weekday - 1];
    final month = _monthsShort[startsAt.month - 1];
    return '$day, ${startsAt.day} $month · ${formatTime24(startsAt)}';
  }

  String get _gridDate => DateFormat('EEE, MMM d').format(startsAt);

  String get _gridTime => '${formatTime24(startsAt)} · ($durationMin min)';

  String get _costLabel {
    if (price != null && price! > 0) {
      return '${formatVnd(price!)} VND';
    }
    return 'Free';
  }

  String _shareMessage() {
    final buf = StringBuffer()
      ..writeln('Join me for $classTitle!')
      ..writeln(_headerDateLine);
    if (trainerName.trim().isNotEmpty) {
      buf.writeln('with ${trainerName.trim()}');
    }
    if (locationTitle.trim().isNotEmpty) {
      buf.writeln(locationTitle.trim());
    }
    final address = studioAddress?.trim();
    if (address != null && address.isNotEmpty) buf.writeln(address);
    return buf.toString().trim();
  }

  Future<void> _shareBooking() async {
    await Share.share(_shareMessage());
  }

  Future<void> _openCalendar(BuildContext context) async {
    String fmtUtc(DateTime d) =>
        DateFormat("yyyyMMdd'T'HHmmss'Z'").format(d.toUtc());
    final loc = [
      if (locationTitle.trim().isNotEmpty) locationTitle.trim(),
      if (studioAddress?.trim().isNotEmpty == true) studioAddress!.trim(),
    ].join(', ');
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
              : locationTitle.trim())
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

  void _copyAddress(BuildContext context) {
    final address = studioAddress?.trim();
    if (address == null || address.isEmpty) return;
    Clipboard.setData(ClipboardData(text: address));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Address copied')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.interTextTheme(Theme.of(context).textTheme);

    return Theme(
      data: Theme.of(context).copyWith(textTheme: textTheme),
      child: Scaffold(
        backgroundColor: AppColors.backgroundBrand,
        body: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
                        IconButton(
                          onPressed: _shareBooking,
                          style: IconButton.styleFrom(
                            foregroundColor: AppColors.textTertiary,
                          ),
                          icon: const Icon(Icons.ios_share_rounded, size: 22),
                        ),
                      ],
                    ),
                    Text(
                      'Confirmed',
                      style: textTheme.titleSmall?.copyWith(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: EdgeInsets.fromLTRB(
                    kScreenPaddingHorizontal,
                    16,
                    kScreenPaddingHorizontal,
                    48 + MediaQuery.paddingOf(context).bottom,
                  ),
                  child: Column(
                    children: [
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
                        style: textTheme.labelLarge?.copyWith(
                          color: AppColors.textSecondary,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.6,
                        ),
                      ),
                      const SizedBox(height: 28),
                      _BookingTicketCard(
                        accent: accent,
                        classTitle: classTitle,
                        gridDate: _gridDate,
                        gridTime: _gridTime,
                        trainerName: trainerName,
                        costLabel: _costLabel,
                        locationTitle: locationTitle,
                        studioAddress: studioAddress,
                        onCopyAddress: studioAddress?.trim().isNotEmpty == true
                            ? () => _copyAddress(context)
                            : null,
                        onAddToCalendar: () => _openCalendar(context),
                        onDirections: () => _openDirections(context),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: FilledButton(
                          onPressed: _shareBooking,
                          style: AuthFormStyles.primaryButtonStyle(),
                          child: const Text(
                            'Invite your friend',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
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
    required this.accent,
    required this.classTitle,
    required this.gridDate,
    required this.gridTime,
    required this.trainerName,
    required this.costLabel,
    required this.locationTitle,
    required this.studioAddress,
    required this.onAddToCalendar,
    required this.onDirections,
    this.onCopyAddress,
  });

  final Color accent;
  final String classTitle;
  final String gridDate;
  final String gridTime;
  final String trainerName;
  final String costLabel;
  final String locationTitle;
  final String? studioAddress;
  final VoidCallback onAddToCalendar;
  final VoidCallback onDirections;
  final VoidCallback? onCopyAddress;

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
            padding: const EdgeInsets.fromLTRB(20, 22, 20, 18),
            child: Text(
              classTitle,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
                height: 1.15,
                letterSpacing: -0.3,
              ),
            ),
          ),
          const _TicketPerforation(),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
            child: Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: _AccentMetaCell(
                        accent: accent,
                        svgAsset: 'assets/icons/icon-calendar.svg',
                        label: gridDate,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _AccentMetaCell(
                        accent: accent,
                        icon: Icons.schedule_rounded,
                        label: gridTime,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: _AccentMetaCell(
                        accent: accent,
                        svgAsset: 'assets/icons/icon-profile-large.svg',
                        svgSize: 14,
                        label: trainerName.isNotEmpty ? trainerName : '—',
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _AccentMetaCell(
                        accent: accent,
                        svgAsset: 'assets/icons/icon-card.svg',
                        label: costLabel,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _LocationRow(
                  accent: accent,
                  title: locationTitle,
                  address: studioAddress,
                  onCopyAddress: onCopyAddress,
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          const _TicketPerforation(),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 22),
            child: Row(
              children: [
                Expanded(
                  child: _TicketActionButton(
                    onPressed: onAddToCalendar,
                    icon: Icons.calendar_month_outlined,
                    label: 'Add to calendar',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _TicketActionButton(
                    onPressed: onDirections,
                    icon: Icons.place_outlined,
                    label: 'Get directions',
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TicketActionButton extends StatelessWidget {
  const _TicketActionButton({
    required this.onPressed,
    required this.icon,
    required this.label,
  });

  final VoidCallback onPressed;
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return FilledButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 18),
      label: Text(
        label,
        style: const TextStyle(
          fontWeight: FontWeight.w600,
          fontSize: 13,
        ),
      ),
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.primary500,
        foregroundColor: AppColors.textInverse,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(15),
        ),
      ),
    );
  }
}

class _AccentMetaCell extends StatelessWidget {
  const _AccentMetaCell({
    required this.accent,
    required this.label,
    this.icon,
    this.svgAsset,
    this.svgSize = 18,
  }) : assert(icon != null || svgAsset != null);

  final Color accent;
  final String label;
  final IconData? icon;
  final String? svgAsset;
  final double svgSize;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(color: accent, shape: BoxShape.circle),
          alignment: Alignment.center,
          child: svgAsset != null
              ? SvgPicture.asset(
                  svgAsset!,
                  width: svgSize,
                  height: svgSize,
                  fit: BoxFit.contain,
                  excludeFromSemantics: true,
                  colorFilter: const ColorFilter.mode(
                    AppColors.textPrimary,
                    BlendMode.srcIn,
                  ),
                )
              : Icon(icon, size: 16, color: AppColors.textPrimary),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: AppColors.textPrimary,
              height: 1.3,
            ),
          ),
        ),
      ],
    );
  }
}

class _LocationRow extends StatelessWidget {
  const _LocationRow({
    required this.accent,
    required this.title,
    required this.address,
    this.onCopyAddress,
  });

  final Color accent;
  final String title;
  final String? address;
  final VoidCallback? onCopyAddress;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(color: accent, shape: BoxShape.circle),
          alignment: Alignment.center,
          child: const Icon(
            Icons.place_outlined,
            size: 16,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                  height: 1.25,
                ),
              ),
              if (address != null && address!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        address!,
                        style: const TextStyle(
                          fontSize: 13,
                          height: 1.35,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                    if (onCopyAddress != null)
                      InkWell(
                        onTap: onCopyAddress,
                        borderRadius: BorderRadius.circular(6),
                        child: Padding(
                          padding: const EdgeInsets.only(left: 8),
                          child: SvgPicture.asset(
                            'assets/icons/icon-copy.svg',
                            width: 16,
                            height: 16,
                            fit: BoxFit.contain,
                            excludeFromSemantics: true,
                            colorFilter: const ColorFilter.mode(
                              AppColors.textTertiary,
                              BlendMode.srcIn,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ],
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
              painter: _DashedDividerPainter(color: AppColors.borderPrimary),
            ),
          ),
          const Positioned(left: -14, top: 2, child: _TicketNotch()),
          const Positioned(right: -14, top: 2, child: _TicketNotch()),
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
