import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../constants/colors.dart';
import '../constants/layout.dart';
import '../l10n/locale_provider.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/client_location_store.dart';
import '../utils/class_session_link.dart';
import '../utils/color_hex.dart';
import '../utils/formatters.dart';
import '../utils/load_error_message.dart';
import '../widgets/common/load_error_view.dart';
import '../services/client_schedule_store.dart';
import '../widgets/common/henzo_header_back_button.dart';
import '../widgets/public/cached_salon_network_image.dart';
import '../widgets/session_capacity_card.dart';
import 'client/class_booking_confirmation_screen.dart';
import 'public_studio_detail_screen.dart';

/// Icon circle (30) + gap (10) — aligns controls with address text.
const double _kClassDetailMetaTextInset = 40;

/// Client class detail — mock layout; accent = training category color.
class PublicClassDetailScreen extends StatefulWidget {
  const PublicClassDetailScreen({
    super.key,
    required this.studioId,
    required this.sessionId,
    required this.sessionStartsAtHint,
    this.distanceKm,
  });

  final String studioId;
  final String sessionId;
  final DateTime sessionStartsAtHint;
  final double? distanceKm;

  @override
  State<PublicClassDetailScreen> createState() =>
      _PublicClassDetailScreenState();
}

class _PublicClassDetailScreenState extends State<PublicClassDetailScreen> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _studio;
  Map<String, dynamic>? _session;
  bool _booking = false;
  bool _isBookedByMe = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final day = DateTime(
        widget.sessionStartsAtHint.year,
        widget.sessionStartsAtHint.month,
        widget.sessionStartsAtHint.day,
      );
      final from = day.toUtc().toIso8601String();
      final to = day.add(const Duration(days: 1)).toUtc().toIso8601String();
      final rawStudio = await ApiClient.get(
        '/studios/${widget.studioId}',
        null,
      );
      final rawSchedule = await ApiClient.get(
        '/studios/${widget.studioId}/schedule?from='
        '${Uri.encodeComponent(from)}&to='
        '${Uri.encodeComponent(to)}&limit=200',
        null,
      );
      if (!mounted) return;
      Map<String, dynamic>? studioMap;
      if (rawStudio is Map<String, dynamic>) {
        studioMap = rawStudio;
      }
      final list = rawSchedule is List
          ? rawSchedule
          : (rawSchedule is Map && rawSchedule['data'] is List
                ? rawSchedule['data'] as List
                : <dynamic>[]);
      Map<String, dynamic>? found;
      for (final row in list) {
        if (row is! Map) continue;
        final m = Map<String, dynamic>.from(row);
        if ((m['id'] ?? '').toString() == widget.sessionId) {
          found = m;
          break;
        }
      }
      var isBookedByMe = false;
      final token = context.read<AuthService>().accessToken;
      if (token != null &&
          token.isNotEmpty &&
          found != null &&
          widget.sessionId.isNotEmpty) {
        try {
          final enr = await ApiClient.get(
            '/studios/sessions/${widget.sessionId}/my-enrollment',
            token,
          );
          if (enr is Map) {
            isBookedByMe = enr['enrolled'] == true;
          }
        } catch (_) {}
      }
      if (!mounted) return;
      setState(() {
        _studio = studioMap;
        _session = found;
        _isBookedByMe = isBookedByMe;
        _loading = false;
        if (found == null) {
          _error = 'This class is no longer available.';
        }
      });
    } catch (e) {
      if (!mounted) return;
      final locale = context.read<LocaleProvider>();
      setState(() {
        _loading = false;
        _error = loadErrorMessage(locale, e);
      });
    }
  }

  Future<void> _shareClass({
    required String classTitle,
    required String? trainerName,
    required DateTime? startsAt,
    required String addressLine,
  }) async {
    final locale = context.read<LocaleProvider>();
    final auth = context.read<AuthService>();
    final inviterName = resolveShareInviterName(
      userName: auth.user?.name,
      userEmail: auth.user?.email,
      tr: locale.t,
    );
    final dateTimeLine = startsAt != null
        ? '${_formatClassHeaderDate(startsAt)} · ${formatTime24(startsAt)}'
        : '';
    final sessionLink = ClassSessionLink(
      studioId: widget.studioId,
      sessionId: widget.sessionId,
      startsAt: startsAt ?? widget.sessionStartsAtHint,
    );
    final message = buildClassSessionShareMessage(
      tr: locale.t,
      inviterName: inviterName,
      trainingName: classTitle,
      trainerName: trainerName,
      dateTimeLine: dateTimeLine,
      addressLine: addressLine,
      link: sessionLink.toShareUri(),
    );
    await Share.share(message, subject: classTitle);
  }

  Future<void> _book() async {
    final token = context.read<AuthService>().accessToken;
    final locale = context.read<LocaleProvider>();
    if (token == null || token.isEmpty) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(content: Text(locale.t('clientClassDetail.signInToBook'))),
      );
      return;
    }
    if (_booking) return;
    setState(() => _booking = true);
    try {
      final raw = await ApiClient.post(
        '/studios/sessions/${widget.sessionId}/book',
        token,
        body: const <String, dynamic>{},
      );
      if (!mounted) return;
      ClientScheduleStore.invalidate();
      final session = _session;
      if (session == null) return;
      await Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => ClassBookingConfirmationScreen.fromMaps(
            session: session,
            studio: _studio,
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      final locale = context.read<LocaleProvider>();
      if (isBookingAlreadyBookedError(e)) {
        setState(() => _isBookedByMe = true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(locale.t('clientClassDetail.alreadyBooked'))),
        );
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(bookingErrorMessage(locale, e))));
    } finally {
      if (mounted) setState(() => _booking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = _session;
    final trainingMap = session != null && session['training'] is Map
        ? Map<String, dynamic>.from(session['training'] as Map)
        : <String, dynamic>{};
    final cat = trainingMap['trainingCategory'] is Map
        ? Map<String, dynamic>.from(trainingMap['trainingCategory'] as Map)
        : <String, dynamic>{};
    final accent = _resolveCategoryAccent(trainingMap, cat);

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : session == null
            ? LoadErrorView(
                message: _error ?? 'Class not found.',
                onRetry: _load,
              )
            : _ClassDetailBody(
                studio: _studio,
                session: session,
                accent: accent,
                category: cat,
                distanceKm: widget.distanceKm,
                avgRating: _resolveStudioAvgRating(_studio),
                reviewCount: _resolveStudioReviewCount(_studio),
                onOpenStudio: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) =>
                          PublicStudioDetailScreen(studioId: widget.studioId),
                    ),
                  );
                },
                onShare: () {
                  final training = trainingMap;
                  final startsAt = parseApiDateTime(session['startsAt']);
                  final trainer = session['trainer'] is Map
                      ? Map<String, dynamic>.from(session['trainer'] as Map)
                      : <String, dynamic>{};
                  final owner = _studio?['owner'] is Map
                      ? Map<String, dynamic>.from(_studio!['owner'] as Map)
                      : <String, dynamic>{};
                  final instructor =
                      (trainer['name'] ?? '').toString().trim().isNotEmpty
                      ? (trainer['name'] ?? '').toString().trim()
                      : (owner['name'] ?? '').toString().trim();
                  final address = (_studio?['address'] ?? '').toString().trim();
                  _shareClass(
                    classTitle: (training['name'] ?? 'Class').toString(),
                    trainerName: instructor.isNotEmpty ? instructor : null,
                    startsAt: startsAt,
                    addressLine: address,
                  );
                },
                onBook: _book,
                booking: _booking,
                isBookedByMe: _isBookedByMe,
              ),
      ),
    );
  }
}

Color _resolveCategoryAccent(
  Map<String, dynamic> training,
  Map<String, dynamic> category,
) {
  return parseHexColor(category['chip_bg_hex']?.toString()) ??
      parseHexColor(training['displayColor']?.toString()) ??
      AppColors.primary500;
}

Color _resolveCategoryLabelColor(Map<String, dynamic> category, Color accent) {
  return parseHexColor(category['chip_fg_hex']?.toString()) ??
      AppColors.textPrimary;
}

String _formatClassHeaderDate(DateTime d) {
  const weekdays = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ];
  const months = [
    'JANUARY',
    'FEBRUARY',
    'MARCH',
    'APRIL',
    'MAY',
    'JUNE',
    'JULY',
    'AUGUST',
    'SEPTEMBER',
    'OCTOBER',
    'NOVEMBER',
    'DECEMBER',
  ];
  return '${weekdays[d.weekday - 1]}, ${d.day} ${months[d.month - 1]}';
}

String _categoryLabel(Map<String, dynamic> cat, String localeCode) {
  return _localizedField(
    map: cat,
    localeCode: localeCode,
    enKey: 'name_en',
    ruKey: 'name_ru',
    viKey: 'name_vn',
  );
}

String _localizedField({
  required Map<String, dynamic> map,
  required String localeCode,
  required String enKey,
  required String ruKey,
  required String viKey,
  String? fallbackKey,
}) {
  final en = (map[enKey] ?? '').toString().trim();
  final ru = (map[ruKey] ?? '').toString().trim();
  final vi = (map[viKey] ?? '').toString().trim();
  final fallback = fallbackKey != null
      ? (map[fallbackKey] ?? '').toString().trim()
      : '';
  return switch (localeCode) {
    'vi' => vi.isNotEmpty ? vi : (en.isNotEmpty ? en : fallback),
    'ru' => ru.isNotEmpty ? ru : (en.isNotEmpty ? en : fallback),
    _ => en.isNotEmpty ? en : (ru.isNotEmpty ? ru : fallback),
  };
}

double _resolveStudioAvgRating(Map<String, dynamic>? studio) {
  if (studio == null) return 0;
  final fromField =
      (studio['avgRating'] as num?)?.toDouble() ??
      (studio['rating'] as num?)?.toDouble();
  if (fromField != null && fromField > 0) return fromField;
  if (studio['reviews'] is! List) return 0;
  var sum = 0.0;
  var n = 0;
  for (final r in studio['reviews'] as List) {
    if (r is! Map) continue;
    final v = (r['rating'] as num?)?.toDouble();
    if (v == null) continue;
    sum += v;
    n++;
  }
  return n == 0 ? 0 : sum / n;
}

int _resolveStudioReviewCount(Map<String, dynamic>? studio) {
  if (studio == null) return 0;
  var count = (studio['reviewCount'] as num?)?.toInt() ?? 0;
  if (count > 0) return count;
  if (studio['_count'] is Map) {
    final c = Map<String, dynamic>.from(studio['_count'] as Map);
    count =
        (c['Review'] as num?)?.toInt() ??
        (c['reviews'] as num?)?.toInt() ??
        count;
  }
  if (count == 0 && studio['reviews'] is List) {
    count = (studio['reviews'] as List).length;
  }
  return count;
}

Future<void> _openDirections({
  required BuildContext context,
  required Map<String, dynamic>? studio,
  required String locationLabel,
}) async {
  final lat = (studio?['latitude'] as num?)?.toDouble();
  final lng = (studio?['longitude'] as num?)?.toDouble();
  final Uri uri;
  if (lat != null && lng != null) {
    uri = Uri.parse(
      'https://www.google.com/maps/search/?api=1&query=$lat,$lng',
    );
  } else {
    final q =
        ((studio?['address'] ?? '').toString().trim().isNotEmpty
                ? (studio!['address'] ?? '').toString().trim()
                : locationLabel.trim())
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

class _ClassDetailBody extends StatelessWidget {
  const _ClassDetailBody({
    required this.studio,
    required this.session,
    required this.accent,
    required this.category,
    required this.distanceKm,
    required this.avgRating,
    required this.reviewCount,
    required this.onOpenStudio,
    required this.onShare,
    required this.onBook,
    required this.booking,
    required this.isBookedByMe,
  });

  final Map<String, dynamic>? studio;
  final Map<String, dynamic> session;
  final Color accent;
  final Map<String, dynamic> category;
  final double? distanceKm;
  final double avgRating;
  final int reviewCount;
  final VoidCallback onOpenStudio;
  final VoidCallback onShare;
  final VoidCallback onBook;
  final bool booking;
  final bool isBookedByMe;

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final localeCode = locale.localeCode;
    final tr = locale.t;
    final training = session['training'] is Map
        ? Map<String, dynamic>.from(session['training'] as Map)
        : <String, dynamic>{};
    final trainer = session['trainer'] is Map
        ? Map<String, dynamic>.from(session['trainer'] as Map)
        : <String, dynamic>{};
    final owner = studio?['owner'] is Map
        ? Map<String, dynamic>.from(studio!['owner'] as Map)
        : <String, dynamic>{};
    final startsAt = parseApiDateTime(session['startsAt']);
    final endsAt = parseApiDateTime(session['endsAt']);
    final cap = (session['capacity'] as num?)?.toInt() ?? 0;
    final booked = (session['bookedCount'] as num?)?.toInt() ?? 0;
    final waitlist = (session['waitlistCount'] as num?)?.toInt() ?? 0;
    final classTitle = (training['name'] ?? 'Class').toString();
    final catLabel = _categoryLabel(category, localeCode);
    final chipFg = _resolveCategoryLabelColor(category, accent);
    final locName = (session['locationName'] ?? '').toString().trim();
    final studioName = (studio?['name'] ?? 'Studio').toString();
    final address = (studio?['address'] ?? '').toString().trim();
    final logoUrl = (studio?['logoUrl'] ?? '').toString();
    final initials = studioName.isEmpty
        ? '?'
        : studioName
              .split(RegExp(r'\s+'))
              .where((p) => p.isNotEmpty)
              .take(2)
              .map((p) => p[0].toUpperCase())
              .join();
    final durationMin =
        (training['duration'] as num?)?.toInt() ??
        ((startsAt != null && endsAt != null)
            ? endsAt.difference(startsAt).inMinutes
            : null);
    final instructorName = (trainer['name'] ?? '').toString().trim().isNotEmpty
        ? (trainer['name'] ?? '').toString().trim()
        : (owner['name'] ?? '').toString().trim();
    final trainingDescription = _localizedField(
      map: training,
      localeCode: localeCode,
      enKey: 'descriptionEn',
      ruKey: 'descriptionRu',
      viKey: 'descriptionVi',
      fallbackKey: 'description',
    );

    final timeLabel = startsAt != null
        ? '${formatTime24(startsAt)}'
              '${durationMin != null ? ' · ($durationMin min)' : ''}'
        : '—';

    final dateLabel = startsAt != null ? _formatClassHeaderDate(startsAt) : '';

    final locationTitle = locName.isNotEmpty ? locName : studioName;
    final locStore = context.watch<ClientLocationStore>();
    final apiDistanceKm =
        distanceKm ?? (studio?['distance'] as num?)?.toDouble();
    final studioLat =
        (studio?['latitude'] as num?)?.toDouble() ??
        (studio?['lat'] as num?)?.toDouble();
    final studioLng =
        (studio?['longitude'] as num?)?.toDouble() ??
        (studio?['lng'] as num?)?.toDouble() ??
        (studio?['lon'] as num?)?.toDouble();
    final resolvedKm = resolveStudioDistanceKm(
      apiDistanceKm: apiDistanceKm,
      clientLat: locStore.lat,
      clientLon: locStore.lon,
      studioLat: studioLat,
      studioLng: studioLng,
    );
    final distanceText = formatBrowseStudioDistanceLabel(resolvedKm);
    final distanceLabel =
        distanceText.isEmpty ? null : distanceText;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 4, 12, 16),
          child: Row(
            children: [
              HenzoHeaderBackButton(
                onPressed: () => Navigator.of(context).pop(),
              ),
              const Expanded(
                child: Text(
                  'Class',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              FilledButton.icon(
                onPressed: onShare,
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
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(
              kScreenPaddingHorizontal,
              0,
              kScreenPaddingHorizontal,
              120,
            ),
            children: [
              _StudioHeroBanner(
                accent: accent,
                studioName: studioName,
                logoUrl: logoUrl,
                initials: initials,
                avgRating: avgRating,
                reviewCount: reviewCount,
                distanceLabel: distanceLabel,
                onTap: onOpenStudio,
              ),
              const SizedBox(height: 15),
              _ClassInfoCard(
                accent: accent,
                categoryLabel: catLabel,
                categoryFg: chipFg,
                dateLabel: dateLabel,
                classTitle: classTitle,
                timeLabel: timeLabel,
                instructorName: instructorName,
                locationTitle: locationTitle,
                address: address,
                onGetDirections: () => _openDirections(
                  context: context,
                  studio: studio,
                  locationLabel: locationTitle,
                ),
                onCopyAddress: address.isEmpty
                    ? null
                    : () {
                        Clipboard.setData(ClipboardData(text: address));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Address copied')),
                        );
                      },
              ),
              const SizedBox(height: 15),
              SessionCapacityCard(
                accent: accent,
                enrolled: booked,
                capacity: cap,
                waitlistCount: waitlist,
              ),
              if (trainingDescription.isNotEmpty) ...[
                const SizedBox(height: 28),
                Text(
                  tr('clientClassDetail.descriptionSectionLabel'),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -0.3,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 12),
                _TrainingDescriptionCard(body: trainingDescription),
              ],
            ],
          ),
        ),
        if (startsAt != null)
          _BookBar(
            startsAt: startsAt,
            onBook: onBook,
            booking: booking,
            isBookedByMe: isBookedByMe,
            canBook: !isBookedByMe && (cap == 0 || booked < cap),
          ),
      ],
    );
  }
}

class _StudioHeroBanner extends StatelessWidget {
  const _StudioHeroBanner({
    required this.accent,
    required this.studioName,
    required this.logoUrl,
    required this.initials,
    required this.avgRating,
    required this.reviewCount,
    required this.distanceLabel,
    required this.onTap,
  });

  final Color accent;
  final String studioName;
  final String logoUrl;
  final String initials;
  final double avgRating;
  final int reviewCount;
  final String? distanceLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: accent,
      borderRadius: BorderRadius.circular(14),
      elevation: 0,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(4),
          child: Row(
            children: [
              Expanded(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _StudioAvatarBadge(
                      logoUrl: logoUrl,
                      initials: initials,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            studioName,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          if (distanceLabel != null) ...[
                            const SizedBox(height: 4),
                            Text(
                              distanceLabel!,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w400,
                                color: Color(0x663F3F3F),
                                height: 1.1,
                              ),
                            ),
                          ],
                          if (avgRating > 0 || reviewCount > 0) ...[
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                if (avgRating > 0) ...[
                                  const Icon(
                                    Icons.star_rounded,
                                    size: 16,
                                    color: AppColors.textPrimary,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    avgRating.toStringAsFixed(1),
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                ],
                                if (reviewCount > 0) ...[
                                  const SizedBox(width: 8),
                                  Text(
                                    '$reviewCount reviews',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                width: 30,
                height: 30,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: SvgPicture.asset(
                  'assets/icons/icon-arrow-wide.svg',
                  width: 15,
                  height: 8,
                  fit: BoxFit.contain,
                  excludeFromSemantics: true,
                  colorFilter: const ColorFilter.mode(
                    AppColors.textPrimary,
                    BlendMode.srcIn,
                  ),
                ),
              ),
              const SizedBox(width: 8),
            ],
          ),
        ),
      ),
    );
  }
}

class _ClassInfoCard extends StatelessWidget {
  const _ClassInfoCard({
    required this.accent,
    required this.categoryLabel,
    required this.categoryFg,
    required this.dateLabel,
    required this.classTitle,
    required this.timeLabel,
    required this.instructorName,
    required this.locationTitle,
    required this.address,
    required this.onGetDirections,
    this.onCopyAddress,
  });

  final Color accent;
  final String categoryLabel;
  final Color categoryFg;
  final String dateLabel;
  final String classTitle;
  final String timeLabel;
  final String instructorName;
  final String locationTitle;
  final String address;
  final VoidCallback onGetDirections;
  final VoidCallback? onCopyAddress;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              if (categoryLabel.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: accent,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    categoryLabel,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      letterSpacing: -0.3,
                      color: categoryFg,
                    ),
                  ),
                ),
              if (categoryLabel.isNotEmpty && dateLabel.isNotEmpty)
                const SizedBox(width: 17),
              if (dateLabel.isNotEmpty)
                Flexible(
                  child: Text(
                    dateLabel,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.3,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 24),
          Text(
            classTitle,
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w600,
              height: 1.15,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: _ClassMetaItem(
                  accent: accent,
                  icon: Icons.schedule_rounded,
                  label: timeLabel,
                ),
              ),
              if (instructorName.isNotEmpty) ...[
                const SizedBox(width: 14),
                Expanded(
                  child: _ClassMetaItem(
                    accent: accent,
                    svgAsset: 'assets/icons/icon-profile-large.svg',
                    svgSize: 14,
                    label: instructorName,
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 12),
          _DetailIconRow(
            accent: accent,
            icon: Icons.place_outlined,
            title: locationTitle,
            emphasizeTitle: true,
            subtitle: address.isNotEmpty ? address : null,
            onCopyAddress: onCopyAddress,
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.only(left: _kClassDetailMetaTextInset),
            child: Align(
              alignment: Alignment.centerLeft,
              child: FilledButton(
                onPressed: onGetDirections,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary500,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(999),
                  ),
                  textStyle: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                child: const Text('Get directions'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StudioAvatarBadge extends StatelessWidget {
  const _StudioAvatarBadge({required this.logoUrl, required this.initials});

  final String logoUrl;
  final String initials;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
      ),
      alignment: Alignment.center,
      child: logoUrl.isNotEmpty
          ? ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: CachedSalonNetworkImage(
                imageUrl: logoUrl,
                width: 40,
                height: 40,
                fit: BoxFit.cover,
              ),
            )
          : Text(
              initials,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
    );
  }
}

class _ClassMetaItem extends StatelessWidget {
  const _ClassMetaItem({
    required this.accent,
    this.icon,
    this.svgAsset,
    this.svgSize = 18,
    required this.label,
  }) : assert(icon != null || svgAsset != null);

  final Color accent;
  final IconData? icon;
  final String? svgAsset;
  final double svgSize;
  final String label;

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
                  colorFilter: const ColorFilter.mode(
                    AppColors.textPrimary,
                    BlendMode.srcIn,
                  ),
                )
              : Icon(icon, size: 16, color: AppColors.textPrimary),
        ),
        const SizedBox(width: 10),
        Flexible(
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w400,
              letterSpacing: -0.3,
              color: AppColors.textPrimary,
              height: 1.2,
            ),
          ),
        ),
      ],
    );
  }
}

class _DetailIconRow extends StatelessWidget {
  const _DetailIconRow({
    required this.accent,
    this.icon,
    this.svgAsset,
    this.svgSize = 20,
    required this.title,
    this.subtitle,
    this.emphasizeTitle = false,
    this.onCopyAddress,
  }) : assert(icon != null || svgAsset != null);

  final Color accent;
  final IconData? icon;
  final String? svgAsset;
  final double svgSize;
  final String title;
  final String? subtitle;
  final bool emphasizeTitle;
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
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: emphasizeTitle
                      ? FontWeight.w600
                      : FontWeight.w500,
                  color: emphasizeTitle
                      ? AppColors.textPrimary
                      : AppColors.textSecondary,
                  height: 1.25,
                ),
              ),
              if (subtitle != null && subtitle!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        subtitle!,
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

class _TrainingDescriptionCard extends StatelessWidget {
  const _TrainingDescriptionCard({required this.body});

  final String body;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text(
        body,
        style: const TextStyle(
          fontSize: 14,
          height: 1.45,
          color: AppColors.textSecondary,
        ),
      ),
    );
  }
}

class _BookBar extends StatelessWidget {
  const _BookBar({
    required this.startsAt,
    required this.onBook,
    required this.booking,
    required this.isBookedByMe,
    required this.canBook,
  });

  final DateTime startsAt;
  final VoidCallback onBook;
  final bool booking;
  final bool isBookedByMe;
  final bool canBook;

  @override
  Widget build(BuildContext context) {
    final started = startsAt.isBefore(DateTime.now());
    final label = started
        ? 'Class has started'
        : isBookedByMe
        ? 'You are booked'
        : 'Book class';

    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(
        kScreenPaddingHorizontal,
        12,
        kScreenPaddingHorizontal,
        12 + MediaQuery.paddingOf(context).bottom,
      ),
      decoration: const BoxDecoration(color: AppColors.backgroundSecondary),
      child: FilledButton(
        onPressed: (!canBook || started || booking) ? null : onBook,
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary500,
          disabledBackgroundColor: AppColors.primary500.withValues(alpha: 0.45),
          disabledForegroundColor: Colors.white70,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
        child: booking
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : Text(
                label,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
      ),
    );
  }
}
