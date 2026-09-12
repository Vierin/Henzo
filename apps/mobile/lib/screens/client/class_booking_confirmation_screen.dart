
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:provider/provider.dart';
import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../utils/class_session_link.dart';
import '../../utils/google_maps_link.dart';
import '../../utils/share_utils.dart';
import '../../utils/color_hex.dart';
import '../../utils/formatters.dart';
import '../../utils/currency_format.dart';
import '../../widgets/auth/auth_form_styles.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Shown after a successful client self-booking (mockup: ticket + actions).
class ClassBookingConfirmationScreen extends StatelessWidget {
  factory ClassBookingConfirmationScreen.fromMaps({
    required Map<String, dynamic> session,
    Map<String, dynamic>? studio,
    String? studioId,
    String? sessionId,
  }) {
    final training = session['training'] is Map
        ? Map<String, dynamic>.from(session['training'] as Map)
        : <String, dynamic>{};
    final trainer = session['trainer'] is Map
        ? Map<String, dynamic>.from(session['trainer'] as Map)
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
    final locName = (session['locationName'] ?? '').toString().trim();
    final studioName = (studio?['name'] ?? 'Studio').toString();
    final studioAddress = (studio?['address'] ?? '').toString().trim();
    final accent = _resolveCategoryAccent(training, cat);
    final accentIcon = _resolveCategoryIconColor(cat, accent);
    return ClassBookingConfirmationScreen(
      classTitle: (training['name'] ?? 'Class').toString(),
      trainerName: trainerName,
      locationTitle: locName.isNotEmpty ? locName : studioName,
      studioAddress: studioAddress.isNotEmpty ? studioAddress : null,
      startsAt: startsAt,
      endsAt: endsAt,
      durationMin: durationMin,
      price: (training['price'] as num?)?.toDouble(),
      currency: (studio?['currency'] ?? 'EUR').toString(),
      accent: accent,
      accentIcon: accentIcon,
      latitude: (studio?['latitude'] as num?)?.toDouble(),
      longitude: (studio?['longitude'] as num?)?.toDouble(),
      studioId: studioId ?? (studio?['id'] ?? '').toString(),
      sessionId: sessionId ?? (session['id'] ?? '').toString(),
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
    this.currency = 'EUR',
    this.latitude,
    this.longitude,
    this.studioId,
    this.sessionId,
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
  final String currency;
  final double? latitude;
  final double? longitude;
  final String? studioId;
  final String? sessionId;

  String _headerDateLine(String localeCode) =>
      '${formatCalendarWeekdayDayMonthUpper(startsAt, localeCode)} · '
      '${formatTime24(startsAt)}';

  String _gridDate(String localeCode) {
    final weekday = formatCalendarWeekdayShort(startsAt, localeCode);
    final monthDay = DateFormat('MMM d', localeCode).format(startsAt);
    return '$weekday, $monthDay';
  }

  String _durationMuted(LocaleProvider locale) {
    final suffix = locale.t('addTraining.durationSuffix');
    return ' · ($durationMin $suffix)';
  }

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

  String _costPrimary(LocaleProvider locale) {
    if (price != null && price! > 0) {
      final parts = formatMoneyParts(price!, currency);
      return parts.$1;
    }
    return locale.t('common.free');
  }

  String? get _costMuted {
    if (price != null && price! > 0) {
      final parts = formatMoneyParts(price!, currency);
      return parts.$2;
    }
    return null;
  }

  String _shareMessage(LocaleProvider locale) {
    final sid = studioId;
    final sesId = sessionId;
    final buf = StringBuffer()
      ..writeln(
        locale
            .t('clientBooking.shareForClass')
            .replaceAll('{class}', classTitle),
      )
      ..writeln('📅 ${_headerDateLine(locale.localeCode)}');
    if (trainerName.trim().isNotEmpty) {
      buf.writeln('👤 ${trainerName.trim()}');
    }
    if (locationTitle.trim().isNotEmpty) {
      buf.writeln(locationTitle.trim());
    }
    final locationBlock = formatShareLocationBlock(
      address: studioAddress,
      latitude: latitude,
      longitude: longitude,
    );
    if (locationBlock.isNotEmpty) {
      buf.writeln(locationBlock);
    }
    if (sid != null && sid.isNotEmpty && sesId != null && sesId.isNotEmpty) {
      final link = ClassSessionLink(
        studioId: sid,
        sessionId: sesId,
        startsAt: startsAt,
      );
      buf
        ..writeln()
        ..writeln('🔗 ${locale.t('clientClassDetail.shareJoinMe')}')
        ..write(link.toShareUri().toString());
    }
    return buf.toString().trim();
  }

  Future<void> _shareBooking(BuildContext context) async {
    final locale = context.read<LocaleProvider>();
    await Share.share(
      _shareMessage(locale),
      subject: classTitle,
      sharePositionOrigin: shareOrigin(context),
    );
  }

  Future<void> _openCalendar(BuildContext context) async {
    final locale = context.read<LocaleProvider>();
    String fmtUtc(DateTime d) =>
        DateFormat("yyyyMMdd'T'HHmmss'Z'").format(d.toUtc());
    final loc = [
      if (locationTitle.trim().isNotEmpty) locationTitle.trim(),
      if (studioAddress?.trim().isNotEmpty == true) studioAddress!.trim(),
    ].join(', ');
    final details = [
      if (trainerName.isNotEmpty)
        locale
            .t('clientBooking.calendarWithTrainer')
            .replaceAll('{trainer}', trainerName),
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
          SnackBar(content: Text(context.read<LocaleProvider>().t('common.couldNotOpenCalendar'))),
        );
      }
      return;
    }
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _openDirections(BuildContext context) async {
    final q = studioAddress?.trim().isNotEmpty == true
        ? studioAddress!.trim()
        : locationTitle.trim();
    final uri = googleMapsSearchUri(
      address: q,
      latitude: latitude,
      longitude: longitude,
    );
    if (uri == null) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(context.read<LocaleProvider>().t('common.noAddressAvailable'))));
      }
      return;
    }
    if (!await canLaunchUrl(uri)) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(context.read<LocaleProvider>().t('common.couldNotOpenMaps'))));
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
    ).showSnackBar(SnackBar(content: Text(context.read<LocaleProvider>().t('common.addressCopied'))));
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
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
                          onPressed: () => _shareBooking(context),
                          icon: SvgPicture.asset(
                            'assets/icons/icon-share.svg',
                            width: 16,
                            height: 12,
                            fit: BoxFit.contain,
                            excludeFromSemantics: true,
                            colorFilter: ColorFilter.mode(
                              Colors.white,
                              BlendMode.srcIn,
                            ),
                          ),
                          label: Text(locale.t('common.share')),
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
                            textStyle: TextStyle(
                              fontSize: 14.sp,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                    Text(
                      locale.t('clientBooking.confirmed'),
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
                        title: locale.t('clientBooking.youreIn'),
                        titleStyle: wixTextTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          fontSize: 39.sp,
                          color: AppColors.textPrimary,
                          letterSpacing: -0.5,
                        ),
                        dateLine: _headerDateLine(locale.localeCode),
                        dateStyle: wixTextTheme.labelLarge?.copyWith(
                          color: AppColors.textPrimary,
                          fontSize: 14.sp,
                          fontWeight: FontWeight.w500,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 28),
                      _BookingTicketCard(
                        accent: accent,
                        accentIcon: accentIcon,
                        classTitle: classTitle,
                        gridDate: _gridDate(locale.localeCode),
                        gridTimePrimary: formatTime24(startsAt),
                        gridTimeMuted: _durationMuted(locale),
                        trainerName: trainerName,
                        costPrimary: _costPrimary(locale),
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
                          onPressed: () => _shareBooking(context),
                          style: AuthFormStyles.primaryButtonStyle(),
                          child: Text(
                            locale.t('clientBooking.inviteFriends'),
                            style: TextStyle(
                              fontSize: 16.sp,
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
    required this.title,
    required this.titleStyle,
    required this.dateLine,
    required this.dateStyle,
  });

  final String title;
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
                  title,
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
              style: TextStyle(
                fontSize: 24.sp,
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
                    label: context
                        .read<LocaleProvider>()
                        .t('clientBooking.addToCalendar'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _TicketActionButton(
                    onPressed: onDirections,
                    svgAsset: 'assets/icons/icon-pin-simple.svg',
                    iconWidth: 10,
                    iconHeight: 14,
                    label: context.read<LocaleProvider>().t('common.getDirections'),
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
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
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
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14.sp,
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
    fontSize: 13.sp,
    fontWeight: FontWeight.w500,
    color: AppColors.textPrimary,
    height: 1.3,
  );

  static TextStyle _labelMuted(BuildContext context) => GoogleFonts.inter(
    fontSize: 13.sp,
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
                style: TextStyle(
                  fontSize: 14.sp,
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
                        style: TextStyle(
                          fontSize: 13.sp,
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
  const _DashedDividerPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.2;
    const dash = 6.0;
    const gap = 5.0;
    const lineInset = 0.0;
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
      oldDelegate.color != color;
}
