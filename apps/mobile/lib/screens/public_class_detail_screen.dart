import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../constants/layout.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../utils/color_hex.dart';
import '../utils/formatters.dart';
import '../widgets/public/cached_salon_network_image.dart';
import 'public_studio_detail_screen.dart';

/// Public class detail (client Explore / home). No bell, no «what to bring»,
/// trainer block without rating / follow.
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
      setState(() {
        _studio = studioMap;
        _session = found;
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

  String _weekdayShort(DateTime d) {
    const w = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return w[d.weekday - 1];
  }

  String _locationLetter(String? name) {
    final t = name?.trim() ?? '';
    if (t.isEmpty) return 'S';
    return t.substring(0, 1).toUpperCase();
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
      await ApiClient.post(
        '/studios/sessions/${widget.sessionId}/book',
        token,
        body: const <String, dynamic>{},
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Booking confirmed')),
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
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
    final accent = parseHexColor(trainingMap['displayColor']?.toString()) ??
        AppColors.primary500;

    return Scaffold(
      backgroundColor: AppColors.backgroundBrand,
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
                    avgRating: _studio != null && _studio!['reviews'] is List
                        ? _avgRating(_studio!['reviews'] as List)
                        : 0,
                    reviewCount:
                        _studio != null && _studio!['reviews'] is List
                            ? (_studio!['reviews'] as List).length
                            : 0,
                    distanceKm: widget.distanceKm,
                    onOpenStudio: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => PublicStudioDetailScreen(
                            studioId: widget.studioId,
                          ),
                        ),
                      );
                    },
                    weekdayShort: _weekdayShort,
                    locationLetter: _locationLetter,
                    onBook: _book,
                    booking: _booking,
                  ),
      ),
    );
  }
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
    required this.avgRating,
    required this.reviewCount,
    required this.distanceKm,
    required this.onOpenStudio,
    required this.weekdayShort,
    required this.locationLetter,
    required this.onBook,
    required this.booking,
  });

  final Map<String, dynamic>? studio;
  final Map<String, dynamic> session;
  final Color accent;
  final double avgRating;
  final int reviewCount;
  final double? distanceKm;
  final VoidCallback onOpenStudio;
  final String Function(DateTime d) weekdayShort;
  final String Function(String? name) locationLetter;
  final VoidCallback onBook;
  final bool booking;

  @override
  Widget build(BuildContext context) {
    final training = session['training'] is Map
        ? Map<String, dynamic>.from(session['training'] as Map)
        : <String, dynamic>{};
    final trainer = session['trainer'] is Map
        ? Map<String, dynamic>.from(session['trainer'] as Map)
        : <String, dynamic>{};
    final startsAt =
        DateTime.tryParse((session['startsAt'] ?? '').toString())?.toLocal();
    final endsAt =
        DateTime.tryParse((session['endsAt'] ?? '').toString())?.toLocal();
    final durationMin = training['duration'] != null
        ? (training['duration'] as num).toInt()
        : (startsAt != null && endsAt != null
              ? endsAt.difference(startsAt).inMinutes
              : 60);
    final cap = (session['capacity'] as num?)?.toInt() ?? 0;
    final booked = (session['bookedCount'] as num?)?.toInt() ?? 0;
    final left = cap > 0 ? (cap - booked).clamp(0, cap) : 0;
    final price = (training['price'] as num?)?.toDouble();
    final classTitle = (training['name'] ?? 'Class').toString();
    String desc = '';
    for (final k in [
      'description',
      'descriptionEn',
      'descriptionVi',
      'descriptionRu',
    ]) {
      final v = training[k]?.toString().trim() ?? '';
      if (v.isNotEmpty) {
        desc = v;
        break;
      }
    }
    final locName = (session['locationName'] ?? '').toString().trim();
    final studioName =
        (studio?['name'] ?? 'Studio').toString();
    final logoUrl = (studio?['logoUrl'] ?? '').toString();
    final cat = training['trainingCategory'] is Map
        ? Map<String, dynamic>.from(
            training['trainingCategory'] as Map,
          )
        : <String, dynamic>{};
    final chipBg = parseHexColor(cat['chip_bg_hex']?.toString());
    final chipFg = parseHexColor(cat['chip_fg_hex']?.toString());
    final catLabel = (cat['name_en'] ?? '').toString().trim();
    final trainerName = (trainer['name'] ?? '').toString().trim();
    final initials = trainerName.isEmpty
        ? '?'
        : trainerName
            .split(RegExp(r'\s+'))
            .where((p) => p.isNotEmpty)
            .take(2)
            .map((p) => p[0].toUpperCase())
            .join();

    final distLabel = distanceKm != null
        ? '${distanceKm!.toStringAsFixed(1)} km'
        : '';

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 4, 8, 8),
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
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              const SizedBox(width: 48),
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
              _StudioRow(
                studioName: studioName,
                logoUrl: logoUrl,
                avgRating: avgRating,
                reviewCount: reviewCount,
                distLabel: distLabel,
                onViewStudio: onOpenStudio,
              ),
              const SizedBox(height: 20),
              if (catLabel.isNotEmpty)
                Align(
                  alignment: Alignment.centerLeft,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: chipBg ?? AppColors.primary100,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      catLabel.toUpperCase(),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.6,
                        color: chipFg ?? AppColors.primary700,
                      ),
                    ),
                  ),
                ),
              if (catLabel.isNotEmpty) const SizedBox(height: 10),
              Text(
                classTitle,
                style: GoogleFonts.fraunces(
                  fontSize: 28,
                  fontWeight: FontWeight.w600,
                  height: 1.15,
                  color: AppColors.textPrimary,
                ),
              ),
              if (desc.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  desc,
                  style: const TextStyle(
                    fontSize: 15,
                    height: 1.45,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
              const SizedBox(height: 20),
              _InfoGrid(
                accent: accent,
                durationMin: durationMin,
                locationLetter: locationLetter(
                  locName.isNotEmpty ? locName : studioName,
                ),
                capacity: cap,
              ),
              const SizedBox(height: 16),
              if (trainerName.isNotEmpty)
                _TrainerCard(
                  name: trainerName,
                  initials: initials,
                ),
              if (trainerName.isNotEmpty) const SizedBox(height: 16),
              _SpotsCard(
                accent: accent,
                booked: booked,
                capacity: cap,
                left: left,
              ),
            ],
          ),
        ),
        if (startsAt != null)
          _BookBar(
            accent: accent,
            startsAt: startsAt,
            weekdayShort: weekdayShort,
            priceLabel: price != null ? formatVnd(price) : null,
            onBook: onBook,
            booking: booking,
            canBook: cap == 0 || booked < cap,
          ),
      ],
    );
  }
}

class _StudioRow extends StatelessWidget {
  const _StudioRow({
    required this.studioName,
    required this.logoUrl,
    required this.avgRating,
    required this.reviewCount,
    required this.distLabel,
    required this.onViewStudio,
  });

  final String studioName;
  final String logoUrl;
  final double avgRating;
  final int reviewCount;
  final String distLabel;
  final VoidCallback onViewStudio;

  @override
  Widget build(BuildContext context) {
    final meta = StringBuffer();
    if (avgRating > 0) {
      meta.write(avgRating.toStringAsFixed(1));
    }
    if (reviewCount > 0) {
      if (meta.isNotEmpty) meta.write(' • ');
      meta.write('$reviewCount reviews');
    }
    if (distLabel.isNotEmpty) {
      if (meta.isNotEmpty) meta.write(' • ');
      meta.write(distLabel);
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        CircleAvatar(
          radius: 26,
          backgroundColor: AppColors.primary100,
          child: logoUrl.isNotEmpty
              ? ClipOval(
                  child: CachedSalonNetworkImage(
                    imageUrl: logoUrl,
                    width: 52,
                    height: 52,
                    fit: BoxFit.cover,
                  ),
                )
              : Text(
                  studioName.isNotEmpty
                      ? studioName[0].toUpperCase()
                      : '?',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary600,
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
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              if (meta.isNotEmpty)
                Text(
                  meta.toString(),
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
            ],
          ),
        ),
        TextButton(
          onPressed: onViewStudio,
          style: TextButton.styleFrom(
            foregroundColor: AppColors.textPrimary,
            backgroundColor: AppColors.backgroundPrimary,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            side: const BorderSide(color: AppColors.borderPrimary),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          child: const Text(
            'View studio',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
          ),
        ),
      ],
    );
  }
}

class _InfoGrid extends StatelessWidget {
  const _InfoGrid({
    required this.accent,
    required this.durationMin,
    required this.locationLetter,
    required this.capacity,
  });

  final Color accent;
  final int durationMin;
  final String locationLetter;
  final int capacity;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _InfoTile(
            icon: Icons.schedule_rounded,
            value: '$durationMin',
            caption: 'minutes',
            accent: accent,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _InfoTile(
            icon: Icons.place_outlined,
            value: locationLetter,
            caption: 'location',
            accent: accent,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _InfoTile(
            icon: Icons.people_outline,
            value: capacity > 0 ? '$capacity' : '—',
            caption: 'capacity',
            accent: accent,
          ),
        ),
      ],
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({
    required this.icon,
    required this.value,
    required this.caption,
    required this.accent,
  });

  final IconData icon;
  final String value;
  final String caption;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(10, 14, 10, 14),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderPrimary),
      ),
      child: Column(
        children: [
          Icon(icon, size: 20, color: accent),
          const SizedBox(height: 8),
          Text(
            value,
            style: GoogleFonts.fraunces(
              fontSize: 22,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          Text(
            caption,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _TrainerCard extends StatelessWidget {
  const _TrainerCard({required this.name, required this.initials});

  final String name;
  final String initials;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderPrimary),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: AppColors.primary100,
            child: Text(
              initials,
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                color: AppColors.primary700,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'TEACHES',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1,
                    color: AppColors.textSecondary.withValues(alpha: 0.85),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
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

class _SpotsCard extends StatelessWidget {
  const _SpotsCard({
    required this.accent,
    required this.booked,
    required this.capacity,
    required this.left,
  });

  final Color accent;
  final int booked;
  final int capacity;
  final int left;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderPrimary),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'SPOTS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.8,
                  color: AppColors.textSecondary,
                ),
              ),
              const Spacer(),
              Text(
                capacity > 0 ? '$left of $capacity left' : 'Open',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          if (capacity > 0) ...[
            const SizedBox(height: 14),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: List.generate(capacity, (i) {
                final filled = i < booked;
                return Container(
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: filled ? accent : Colors.transparent,
                    border: Border.all(
                      color: filled ? accent : AppColors.borderPrimary,
                      width: 1.5,
                    ),
                  ),
                );
              }),
            ),
          ],
        ],
      ),
    );
  }
}

class _BookBar extends StatelessWidget {
  const _BookBar({
    required this.accent,
    required this.startsAt,
    required this.weekdayShort,
    required this.priceLabel,
    required this.onBook,
    required this.booking,
    required this.canBook,
  });

  final Color accent;
  final DateTime startsAt;
  final String Function(DateTime d) weekdayShort;
  final String? priceLabel;
  final VoidCallback onBook;
  final bool booking;
  final bool canBook;

  @override
  Widget build(BuildContext context) {
    final day = weekdayShort(startsAt);
    final t = formatTime24(startsAt);
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
          color: AppColors.backgroundPrimary,
          border: Border(
            top: BorderSide(color: AppColors.borderPrimary),
          ),
        ),
        child: FilledButton(
          onPressed: (!canBook || started || booking) ? null : onBook,
          style: FilledButton.styleFrom(
            backgroundColor: accent,
            foregroundColor: AppColors.backgroundPrimary,
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
                          : 'Book $day • $t',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
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
                    color: AppColors.backgroundPrimary,
                  ),
                )
              else
                const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Confirm',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
                    SizedBox(width: 4),
                    Icon(Icons.chevron_right_rounded, size: 22),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}
