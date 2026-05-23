import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../constants/colors.dart';
import '../constants/layout.dart';
import '../l10n/locale_provider.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../utils/color_hex.dart';
import '../utils/formatters.dart';
import '../services/client_schedule_store.dart';
import '../widgets/public/cached_salon_network_image.dart';
import 'client/class_booking_confirmation_screen.dart';
import 'public_studio_detail_screen.dart';

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
      final to = day
          .add(const Duration(days: 1))
          .toUtc()
          .toIso8601String();
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
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  double _avgRating(List reviews) {
    if (reviews.isEmpty) return 0;
    var sum = 0.0;
    var n = 0;
    for (final r in reviews) {
      if (r is! Map) continue;
      final v = (r['rating'] as num?)?.toDouble();
      if (v == null) continue;
      sum += v;
      n++;
    }
    return n == 0 ? 0 : sum / n;
  }

  Future<void> _shareClass({
    required String classTitle,
    required String studioName,
    required DateTime? startsAt,
  }) async {
    final when = startsAt != null
        ? '${_formatClassHeaderDate(startsAt)} ${formatTime24(startsAt)}'
        : '';
    await Share.share(
      '$classTitle\n$studioName${when.isNotEmpty ? '\n$when' : ''}',
    );
  }

  Future<void> _book() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(content: Text('Please sign in to book a class')),
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
      var spotNumber = (_session?['bookedCount'] as num?)?.toInt() ?? 0;
      if (raw is Map && raw['booking'] is Map) {
        final b = Map<String, dynamic>.from(raw['booking'] as Map);
        spotNumber = (b['bookedCount'] as num?)?.toInt() ?? spotNumber;
      }
      final session = _session;
      if (session == null) return;
      await Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => ClassBookingConfirmationScreen.fromMaps(
            session: session,
            studio: _studio,
            spotNumber: spotNumber > 0 ? spotNumber : null,
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      final msg = e.toString();
      final alreadyBooked = msg.contains('409') ||
          msg.toLowerCase().contains('already booked');
      if (alreadyBooked) {
        setState(() => _isBookedByMe = true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('You are already booked for this class')),
        );
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Booking failed: $e')),
      );
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
        ? Map<String, dynamic>.from(
            trainingMap['trainingCategory'] as Map,
          )
        : <String, dynamic>{};
    final accent = _resolveCategoryAccent(trainingMap, cat);

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : session == null
            ? _ErrorBody(
                message: _error ?? 'Class not found.',
                onRetry: _load,
              )
            : _ClassDetailBody(
                studio: _studio,
                session: session,
                accent: accent,
                category: cat,
                avgRating: _studio != null && _studio!['reviews'] is List
                    ? _avgRating(_studio!['reviews'] as List)
                    : 0,
                onOpenStudio: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => PublicStudioDetailScreen(
                        studioId: widget.studioId,
                      ),
                    ),
                  );
                },
                onShare: () {
                  final training = trainingMap;
                  final startsAt = parseApiDateTime(session['startsAt']);
                  _shareClass(
                    classTitle: (training['name'] ?? 'Class').toString(),
                    studioName: (_studio?['name'] ?? 'Studio').toString(),
                    startsAt: startsAt,
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

Color _resolveCategoryLabelColor(
  Map<String, dynamic> category,
  Color accent,
) {
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
  final en = (cat['name_en'] ?? '').toString().trim();
  final ru = (cat['name_ru'] ?? '').toString().trim();
  final vn = (cat['name_vn'] ?? '').toString().trim();
  return switch (localeCode) {
    'vi' => vn.isNotEmpty ? vn : en,
    'ru' => ru.isNotEmpty ? ru : en,
    _ => en.isNotEmpty ? en : ru,
  };
}

class _ErrorBody extends StatelessWidget {
  const _ErrorBody({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(kScreenPaddingHorizontal),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 12),
            FilledButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}

class _ClassDetailBody extends StatelessWidget {
  const _ClassDetailBody({
    required this.studio,
    required this.session,
    required this.accent,
    required this.category,
    required this.avgRating,
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
  final double avgRating;
  final VoidCallback onOpenStudio;
  final VoidCallback onShare;
  final VoidCallback onBook;
  final bool booking;
  final bool isBookedByMe;

  @override
  Widget build(BuildContext context) {
    final localeCode = context.watch<LocaleProvider>().localeCode;
    final training = session['training'] is Map
        ? Map<String, dynamic>.from(session['training'] as Map)
        : <String, dynamic>{};
    final startsAt = parseApiDateTime(session['startsAt']);
    final endsAt = parseApiDateTime(session['endsAt']);
    final cap = (session['capacity'] as num?)?.toInt() ?? 0;
    final booked = (session['bookedCount'] as num?)?.toInt() ?? 0;
    final left = cap > 0 ? (cap - booked).clamp(0, cap) : 0;
    final waitlist = (session['waitlistCount'] as num?)?.toInt() ?? 0;
    final price = (training['price'] as num?)?.toDouble();
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

    final timeLabel = startsAt != null && endsAt != null
        ? '${formatTime24(startsAt)} - ${formatTime24(endsAt)}'
        : startsAt != null
        ? formatTime24(startsAt)
        : '—';

    final dateLabel = startsAt != null
        ? _formatClassHeaderDate(startsAt)
        : '';

    final pct = cap > 0 ? (booked / cap).clamp(0.0, 1.0) : 0.0;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 4, 12, 8),
          child: Row(
            children: [
              IconButton(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
              ),
              const Expanded(
                child: Text(
                  'Class',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              TextButton(
                onPressed: onShare,
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.primary500,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                ),
                child: const Text(
                  'Share',
                  style: TextStyle(
                    fontSize: 15,
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
              100,
            ),
            children: [
              _StudioHeroBanner(
                accent: accent,
                studioName: studioName,
                logoUrl: logoUrl,
                initials: initials,
                avgRating: avgRating,
                onTap: onOpenStudio,
              ),
              const SizedBox(height: 12),
              _ClassInfoCard(
                accent: accent,
                categoryLabel: catLabel,
                categoryFg: chipFg,
                dateLabel: dateLabel,
                classTitle: classTitle,
                timeLabel: timeLabel,
                studioName: studioName,
                address: address,
                locationName: locName,
              ),
              const SizedBox(height: 12),
              _CapacityCard(
                accent: accent,
                percent: pct,
                booked: booked,
                capacity: cap,
                left: left,
                waitlist: waitlist,
              ),
            ],
          ),
        ),
        if (startsAt != null)
          _BookBar(
            accent: accent,
            startsAt: startsAt,
            priceLabel: price != null ? formatVnd(price) : null,
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
    required this.onTap,
  });

  final Color accent;
  final String studioName;
  final String logoUrl;
  final String initials;
  final double avgRating;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: accent,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: logoUrl.isNotEmpty
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: CachedSalonNetworkImage(
                          imageUrl: logoUrl,
                          width: 52,
                          height: 52,
                          fit: BoxFit.cover,
                        ),
                      )
                    : Text(
                        initials,
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: accent,
                        ),
                      ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      studioName,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    if (avgRating > 0) ...[
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const Icon(
                            Icons.star_rounded,
                            size: 16,
                            color: Colors.white,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            avgRating.toStringAsFixed(1),
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.chevron_right_rounded,
                  color: accent,
                  size: 26,
                ),
              ),
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
    required this.studioName,
    required this.address,
    required this.locationName,
  });

  final Color accent;
  final String categoryLabel;
  final Color categoryFg;
  final String dateLabel;
  final String classTitle;
  final String timeLabel;
  final String studioName;
  final String address;
  final String locationName;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(18),
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
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: accent,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    categoryLabel,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: categoryFg,
                    ),
                  ),
                ),
              const Spacer(),
              if (dateLabel.isNotEmpty)
                Text(
                  dateLabel,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.3,
                    color: AppColors.textSecondary,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            classTitle,
            style: GoogleFonts.fraunces(
              fontSize: 26,
              fontWeight: FontWeight.w600,
              height: 1.15,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          _DetailIconRow(
            accent: accent,
            icon: Icons.schedule_rounded,
            title: timeLabel,
          ),
          const SizedBox(height: 12),
          _DetailIconRow(
            accent: accent,
            icon: Icons.place_outlined,
            title: studioName,
            onTap: null,
          ),
          if (address.isNotEmpty || locationName.isNotEmpty) ...[
            const SizedBox(height: 12),
            _DetailIconRow(
              accent: accent,
              icon: Icons.place_outlined,
              title: locationName.isNotEmpty ? locationName : studioName,
              subtitle: address.isNotEmpty ? address : null,
            ),
          ],
        ],
      ),
    );
  }
}

class _DetailIconRow extends StatelessWidget {
  const _DetailIconRow({
    required this.accent,
    required this.icon,
    required this.title,
    this.subtitle,
    this.onTap,
  });

  final Color accent;
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final row = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: accent,
            shape: BoxShape.circle,
          ),
          child: Icon(icon, size: 20, color: Colors.white),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                  height: 1.25,
                ),
              ),
              if (subtitle != null && subtitle!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  subtitle!,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.35,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
    if (onTap == null) return row;
    return InkWell(onTap: onTap, borderRadius: BorderRadius.circular(12), child: row);
  }
}

class _CapacityCard extends StatelessWidget {
  const _CapacityCard({
    required this.accent,
    required this.percent,
    required this.booked,
    required this.capacity,
    required this.left,
    required this.waitlist,
  });

  final Color accent;
  final double percent;
  final int booked;
  final int capacity;
  final int left;
  final int waitlist;

  @override
  Widget build(BuildContext context) {
    final pctLabel = capacity > 0
        ? '${(percent * 100).round()}%'
        : '—';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 72,
            height: 72,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CircularProgressIndicator(
                  value: capacity > 0 ? percent : null,
                  strokeWidth: 6,
                  backgroundColor: AppColors.borderPrimary,
                  color: accent,
                ),
                Text(
                  pctLabel,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'CAPACITY',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  capacity > 0 ? '$booked of $capacity booked' : 'Open booking',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  capacity > 0
                      ? '$left spots left • $waitlist on waitlist'
                      : 'Unlimited spots',
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
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

class _BookBar extends StatelessWidget {
  const _BookBar({
    required this.accent,
    required this.startsAt,
    required this.priceLabel,
    required this.onBook,
    required this.booking,
    required this.isBookedByMe,
    required this.canBook,
  });

  final Color accent;
  final DateTime startsAt;
  final String? priceLabel;
  final VoidCallback onBook;
  final bool booking;
  final bool isBookedByMe;
  final bool canBook;

  @override
  Widget build(BuildContext context) {
    final started = startsAt.isBefore(DateTime.now());

    return Material(
      elevation: 12,
      color: Colors.transparent,
      child: Container(
        width: double.infinity,
        padding: EdgeInsets.fromLTRB(
          kScreenPaddingHorizontal,
          12,
          kScreenPaddingHorizontal,
          12 + MediaQuery.paddingOf(context).bottom,
        ),
        decoration: const BoxDecoration(
          color: AppColors.backgroundSecondary,
        ),
        child: FilledButton(
          onPressed: (!canBook || started || booking) ? null : onBook,
          style: FilledButton.styleFrom(
            backgroundColor: accent,
            disabledBackgroundColor: accent.withValues(alpha: 0.45),
            disabledForegroundColor: Colors.white70,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (priceLabel != null)
                      Text(
                        priceLabel!.toUpperCase(),
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.6,
                        ),
                      ),
                    Text(
                      started
                          ? 'Class has started'
                          : isBookedByMe
                          ? 'You are booked'
                          : 'Book this class',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              if (booking)
                const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              else if (isBookedByMe)
                const Icon(Icons.check_circle_outline, size: 24)
              else
                const Icon(Icons.chevron_right_rounded, size: 26),
            ],
          ),
        ),
      ),
    );
  }
}
