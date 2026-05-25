import 'dart:math' as math;

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
    final endsAt =
        parseApiDateTime(session['endsAt']) ??
        startsAt.add(Duration(minutes: durationMin));
    final trainerName = (trainer['name'] ?? '').toString().trim();
    final ownerName = (owner['name'] ?? '').toString().trim();
    final locName = (session['locationName'] ?? '').toString().trim();
    final studioName = (studio?['name'] ?? 'Studio').toString();
    final studioAddress = (studio?['address'] ?? '').toString().trim();
    final accent = _resolveCategoryAccent(training, cat);
    final accentIcon = _resolveCategoryIconColor(cat, accent);
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
      accentIcon: accentIcon,
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
    required this.accentIcon,
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
  final Color accentIcon;
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

  static Color _resolveCategoryAccent(
    Map<String, dynamic> training,
    Map<String, dynamic> category,
  ) {
    return parseHexColor(category['chip_bg_hex']?.toString()) ??
        parseHexColor(category['chipBgHex']?.toString()) ??
        parseHexColor(training['categoryChipBgHex']?.toString()) ??
        parseHexColor(training['displayColor']?.toString()) ??
        AppColors.neutral500;
  }

  static Color _resolveCategoryIconColor(
    Map<String, dynamic> category,
    Color accent,
  ) {
    return parseHexColor(category['chip_fg_hex']?.toString()) ??
        parseHexColor(category['chipFgHex']?.toString()) ??
        (accent.computeLuminance() > 0.55
            ? AppColors.textPrimary
            : AppColors.textInverse);
  }

  String get _costPrimary {
    if (price != null && price! > 0) return formatVnd(price!);
    return 'Free';
  }

  String? get _costMuted => price != null && price! > 0 ? ' VND' : null;

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
      final q =
          (studioAddress?.trim().isNotEmpty == true
                  ? studioAddress!.trim()
                  : locationTitle.trim())
              .trim();
      if (q.isEmpty) {
        if (context.mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('No address available')));
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
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Could not open maps')));
      }
      return;
    }
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  void _copyAddress(BuildContext context) {
    final address = studioAddress?.trim();
    if (address == null || address.isEmpty) return;
    Clipboard.setData(ClipboardData(text: address));
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Address copied')));
  }

  @override
  Widget build(BuildContext context) {
    final wixTextTheme = Theme.of(context).textTheme;
    final ticketTextTheme = GoogleFonts.interTextTheme(wixTextTheme);

    return Theme(
      data: Theme.of(context).copyWith(textTheme: ticketTextTheme),
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
                        FilledButton.icon(
                          onPressed: _shareBooking,
                          icon: SvgPicture.asset(
                            'assets/icons/icon-share.svg',
                            width: 16,
                            height: 12,
                            fit: BoxFit.contain,
                            excludeFromSemantics: true,
                            colorFilter: const ColorFilter.mode(
                              Colors.white,
                              BlendMode.srcIn,
                            ),
                          ),
                          label: const Text('Share'),
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.primary500,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(18),
                            ),
                            textStyle: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                    Text(
                      'Confirmed',
                      style: ticketTextTheme.titleSmall?.copyWith(
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
                      _BookingConfirmationHero(
                        titleStyle: wixTextTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          fontSize: 39,
                          color: AppColors.textPrimary,
                          letterSpacing: -0.5,
                        ),
                        dateLine: _headerDateLine,
                        dateStyle: wixTextTheme.labelLarge?.copyWith(
                          color: AppColors.textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 28),
                      _BookingTicketCard(
                        accent: accent,
                        accentIcon: accentIcon,
                        classTitle: classTitle,
                        gridDate: _gridDate,
                        gridTimePrimary: formatTime24(startsAt),
                        gridTimeMuted: ' · ($durationMin min)',
                        trainerName: trainerName,
                        costPrimary: _costPrimary,
                        costMuted: _costMuted,
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
                            'Invite friends',
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

/// Hero: centered title + rocket/cloud above the “in!” (mockup).
class _BookingConfirmationHero extends StatelessWidget {
  const _BookingConfirmationHero({
    required this.titleStyle,
    required this.dateLine,
    required this.dateStyle,
  });

  final TextStyle? titleStyle;
  final String dateLine;
  final TextStyle? dateStyle;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.topCenter,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 52),
            child: Column(
              children: [
                Text(
                  'You\'re in!',
                  textAlign: TextAlign.center,
                  style: titleStyle,
                ),
                const SizedBox(height: 8),
                Text(dateLine, textAlign: TextAlign.center, style: dateStyle),
              ],
            ),
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Center(
              child: Padding(
                padding: const EdgeInsets.only(left: 155),
                child: const _RocketOnCloudBadge(),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RocketOnCloudBadge extends StatelessWidget {
  const _RocketOnCloudBadge();

  static const _cloudWidth = 96.0;
  static const _rocketSize = 32.0;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: _cloudWidth,
      height: 64,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.bottomCenter,
        children: [
          Image.asset(
            'assets/cloud.webp',
            width: _cloudWidth,
            fit: BoxFit.contain,
          ),
          Positioned(
            top: 6,
            child: Transform.rotate(
              angle: 0,
              child: Image.asset(
                'assets/icons/icon-rocket.png',
                width: _rocketSize,
                height: _rocketSize,
                fit: BoxFit.contain,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BookingTicketCard extends StatelessWidget {
  const _BookingTicketCard({
    required this.accent,
    required this.accentIcon,
    required this.classTitle,
    required this.gridDate,
    required this.gridTimePrimary,
    required this.gridTimeMuted,
    required this.trainerName,
    required this.costPrimary,
    this.costMuted,
    required this.locationTitle,
    required this.studioAddress,
    required this.onAddToCalendar,
    required this.onDirections,
    this.onCopyAddress,
  });

  final Color accent;
  final Color accentIcon;
  final String classTitle;
  final String gridDate;
  final String gridTimePrimary;
  final String gridTimeMuted;
  final String trainerName;
  final String costPrimary;
  final String? costMuted;
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
            padding: const EdgeInsets.fromLTRB(12, 22, 12, 15),
            child: Text(
              classTitle,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
                height: 1.1,
                letterSpacing: -0.3,
              ),
            ),
          ),
          const _TicketDashedDivider(),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 17, 12, 7),
            child: Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: _AccentMetaCell(
                        accent: accent,
                        iconColor: accentIcon,
                        svgAsset: 'assets/icons/icon-calendar.svg',
                        label: gridDate,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _AccentMetaCell(
                        accent: accent,
                        iconColor: accentIcon,
                        icon: Icons.schedule_rounded,
                        svgSize: 16,
                        label: gridTimePrimary,
                        mutedSuffix: gridTimeMuted,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      child: _AccentMetaCell(
                        accent: accent,
                        iconColor: accentIcon,
                        svgAsset: 'assets/icons/icon-profile-large.svg',
                        svgSize: 14,
                        label: trainerName.isNotEmpty ? trainerName : '—',
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _AccentMetaCell(
                        accent: accent,
                        iconColor: accentIcon,
                        svgSize: 12,
                        svgAsset: 'assets/icons/icon-card.svg',
                        label: costPrimary,
                        mutedSuffix: costMuted,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const _TicketSideNotches(),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 7, 12, 17),
            child: _LocationRow(
              accent: accent,
              iconColor: accentIcon,
              title: locationTitle,
              address: studioAddress,
              onCopyAddress: onCopyAddress,
            ),
          ),
          const _TicketDashedDivider(),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 17, 12, 17),
            child: Row(
              children: [
                Expanded(
                  child: _TicketActionButton(
                    onPressed: onAddToCalendar,
                    svgAsset: 'assets/icons/icon-calendar.svg',
                    iconWidth: 13,
                    iconHeight: 12,
                    label: 'Add to calendar',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _TicketActionButton(
                    onPressed: onDirections,
                    svgAsset: 'assets/icons/icon-pin-simple.svg',
                    iconWidth: 10,
                    iconHeight: 14,
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
    required this.svgAsset,
    required this.label,
    required this.iconWidth,
    required this.iconHeight,
  });

  final VoidCallback onPressed;
  final String svgAsset;
  final String label;
  final double iconWidth;
  final double iconHeight;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.primary500,
        foregroundColor: AppColors.textInverse,
        padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SvgPicture.asset(
            svgAsset,
            width: iconWidth,
            height: iconHeight,
            fit: BoxFit.contain,
            excludeFromSemantics: true,
            colorFilter: const ColorFilter.mode(
              AppColors.textInverse,
              BlendMode.srcIn,
            ),
          ),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14,
                color: AppColors.textInverse,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AccentMetaCell extends StatelessWidget {
  const _AccentMetaCell({
    required this.accent,
    required this.iconColor,
    required this.label,
    this.mutedSuffix,
    this.icon,
    this.svgAsset,
    this.svgSize = 14,
  }) : assert(icon != null || svgAsset != null);

  static TextStyle _labelPrimary(BuildContext context) => GoogleFonts.inter(
    fontSize: 13,
    fontWeight: FontWeight.w500,
    color: AppColors.textPrimary,
    height: 1.3,
  );

  static TextStyle _labelMuted(BuildContext context) => GoogleFonts.inter(
    fontSize: 13,
    fontWeight: FontWeight.w400,
    color: AppColors.textPrimary.withValues(alpha: 0.4),
    height: 1.3,
  );

  final Color accent;
  final Color iconColor;
  final String label;
  final String? mutedSuffix;
  final IconData? icon;
  final String? svgAsset;
  final double svgSize;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
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
                  colorFilter: ColorFilter.mode(iconColor, BlendMode.srcIn),
                )
              : Icon(icon, size: 16, color: iconColor),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: mutedSuffix == null
              ? Text(label, style: _labelPrimary(context))
              : Text.rich(
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  TextSpan(
                    children: [
                      TextSpan(text: label, style: _labelPrimary(context)),
                      TextSpan(text: mutedSuffix, style: _labelMuted(context)),
                    ],
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
    required this.iconColor,
    required this.title,
    required this.address,
    this.onCopyAddress,
  });

  final Color accent;
  final Color iconColor;
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
          child: SvgPicture.asset(
            'assets/icons/icon-pin-simple.svg',
            width: 10,
            height: 14,
            fit: BoxFit.contain,
            excludeFromSemantics: true,
            colorFilter: ColorFilter.mode(iconColor, BlendMode.srcIn),
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
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary,
                  height: 1.25,
                ),
              ),
              if (address != null && address!.isNotEmpty) ...[
                const SizedBox(height: 2),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        address!,
                        style: const TextStyle(
                          fontSize: 13,
                          height: 1.3,
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

/// Ticket tear line color (mockup).
const _kTicketDashColor = Color(0xFFF4DCBA);

class _TicketDashedDivider extends StatelessWidget {
  const _TicketDashedDivider();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      height: 12,
      child: Center(
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 0),
          child: CustomPaint(
            size: Size(double.infinity, 1),
            painter: _DashedDividerPainter(color: _kTicketDashColor),
          ),
        ),
      ),
    );
  }
}

/// Side semicircle cutouts only — between meta grid and location block.
class _TicketSideNotches extends StatelessWidget {
  const _TicketSideNotches();

  static const _notchDiameter = 24.0;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: _notchDiameter,
      child: Stack(
        alignment: Alignment.center,
        clipBehavior: Clip.none,
        children: [
          const Positioned(
            left: -_notchDiameter / 2,
            top: 0,
            child: _TicketSideNotch(),
          ),
          const Positioned(
            right: -_notchDiameter / 2,
            top: 0,
            child: _TicketSideNotch(),
          ),
        ],
      ),
    );
  }
}

class _TicketSideNotch extends StatelessWidget {
  const _TicketSideNotch();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: _TicketSideNotches._notchDiameter,
      height: _TicketSideNotches._notchDiameter,
      decoration: const BoxDecoration(
        color: AppColors.backgroundBrand,
        shape: BoxShape.circle,
      ),
    );
  }
}

class _DashedDividerPainter extends CustomPainter {
  const _DashedDividerPainter({required this.color, this.lineInset = 20});

  final Color color;
  final double lineInset;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.2;
    const dash = 6.0;
    const gap = 5.0;
    var x = lineInset;
    final y = size.height / 2;
    final end = size.width - lineInset;
    while (x < end) {
      canvas.drawLine(Offset(x, y), Offset(x + dash, y), paint);
      x += dash + gap;
    }
  }

  @override
  bool shouldRepaint(covariant _DashedDividerPainter oldDelegate) =>
      oldDelegate.color != color || oldDelegate.lineInset != lineInset;
}
