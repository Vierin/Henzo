import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/cache/studio_public_detail_cache.dart';
import '../services/client_favorites_store.dart';
import '../utils/color_hex.dart';
import '../widgets/public/cached_salon_network_image.dart';
import 'public_studio_schedule_screen.dart';

class PublicStudioDetailScreen extends StatefulWidget {
  const PublicStudioDetailScreen({super.key, required this.studioId});

  final String studioId;

  @override
  State<PublicStudioDetailScreen> createState() => _PublicStudioDetailScreenState();
}

class _PublicStudioDetailScreenState extends State<PublicStudioDetailScreen> {
  bool _isLoading = true;
  bool _isFavoriteLoading = false;
  String? _error;
  Map<String, dynamic>? _studio;

  @override
  void initState() {
    super.initState();
    _loadStudio();
  }

  Future<void> _loadStudio() async {
    if (!mounted) return;
    final cached = StudioPublicDetailCache.get(widget.studioId);
    if (cached != null) {
      setState(() {
        _studio = cached;
        _isLoading = false;
        _error = null;
      });
      final token = context.read<AuthService>().accessToken;
      unawaited(context.read<ClientFavoritesStore>().sync(token, force: false));
    } else {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }
    try {
      final raw = await ApiClient.get('/studios/${widget.studioId}', null);
      if (!mounted) return;
      if (raw is Map<String, dynamic>) {
        StudioPublicDetailCache.put(widget.studioId, raw);
        setState(() {
          _studio = raw;
          _isLoading = false;
          _error = null;
        });
      } else {
        setState(() {
          if (_studio == null) _error = 'Invalid response';
          _isLoading = false;
        });
      }
      final token = context.read<AuthService>().accessToken;
      unawaited(context.read<ClientFavoritesStore>().sync(token, force: false));
    } catch (e) {
      if (!mounted) return;
      setState(() {
        if (_studio == null) _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _toggleFavorite() async {
    final studio = _studio;
    final studioId = (studio?['id'] ?? '').toString();
    if (studioId.isEmpty || studio == null || _isFavoriteLoading) return;
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;
    final favStore = context.read<ClientFavoritesStore>();
    final wasFavorite = favStore.isFavorite(studioId);
    setState(() => _isFavoriteLoading = true);
    if (wasFavorite) {
      favStore.removeLocal(studioId);
    } else {
      favStore.upsertStudioMap(Map<String, dynamic>.from(studio));
    }
    try {
      if (wasFavorite) {
        await ApiClient.delete('/auth/favorites/$studioId', token);
      } else {
        await ApiClient.post('/auth/favorites/$studioId', token, body: {
          'salonId': studioId,
        });
      }
    } catch (_) {
      if (!mounted) return;
      await favStore.sync(token, force: true);
    } finally {
      if (mounted) {
        setState(() => _isFavoriteLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final studio = _studio;
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null || studio == null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'Failed to load studio',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 16,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _error ?? 'Unknown error',
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: _loadStudio,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                )
              : _DetailContent(
                  studio: studio,
                  isFavoriteLoading: _isFavoriteLoading,
                  onToggleFavorite: _toggleFavorite,
                ),
    );
  }
}

class _DetailContent extends StatelessWidget {
  const _DetailContent({
    required this.studio,
    required this.isFavoriteLoading,
    required this.onToggleFavorite,
  });

  final Map<String, dynamic> studio;
  final bool isFavoriteLoading;
  final VoidCallback onToggleFavorite;

  int _extractBookingPeriodDays(Map<String, dynamic> studio) {
    const defaultDays = 14;
    const minDays = 1;
    const maxDays = 60;
    final reminderSettings = studio['reminderSettings'];
    if (reminderSettings is! Map) return defaultDays;
    final raw = reminderSettings['bookingPeriodDays'];
    int? days;
    if (raw is int) days = raw;
    if (raw is num) days = raw.toInt();
    if (raw is String) days = int.tryParse(raw);
    return (days ?? defaultDays).clamp(minDays, maxDays);
  }

  @override
  Widget build(BuildContext context) {
    final photos = studio['photos'];
    final photoUrl = photos is List && photos.isNotEmpty ? photos.first?.toString() : null;
    final name = (studio['name'] ?? 'Studio').toString();
    final address = (studio['address'] ?? '').toString();
    final description = (studio['description'] ?? '').toString();
    final phone = (studio['phone'] ?? '').toString();
    final email = (studio['email'] ?? '').toString();
    final website = (studio['website'] ?? '').toString();
    final instagram = (studio['instagram'] ?? '').toString();
    final reviews = studio['reviews'] is List ? studio['reviews'] as List : const [];
    final avgRating = _calcAverageRating(reviews);
    final upcomingClasses = studio['upcomingClasses'] is List
        ? studio['upcomingClasses'] as List
        : const [];
    final lat = (studio['latitude'] as num?)?.toDouble();
    final lon = (studio['longitude'] as num?)?.toDouble();

    return SafeArea(
      child: Stack(
        children: [
          ListView(
            padding: const EdgeInsets.fromLTRB(0, 0, 0, 96),
            children: [
              SizedBox(
                height: 240,
                width: double.infinity,
                child: photoUrl != null && photoUrl.isNotEmpty
                    ? CachedSalonNetworkImage(
                        imageUrl: photoUrl,
                        fit: BoxFit.cover,
                      )
                    : _photoFallback(),
              ),
              Transform.translate(
                offset: const Offset(0, -24),
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 12),
                  padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                  decoration: BoxDecoration(
                    color: AppColors.backgroundPrimary,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.borderPrimary),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x12000000),
                        blurRadius: 10,
                        offset: Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              name,
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                          Consumer<ClientFavoritesStore>(
                            builder: (context, fav, _) {
                              final sid =
                                  (studio['id'] ?? '').toString();
                              final isFavorite = fav.isFavorite(sid);
                              return Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  customBorder: const CircleBorder(),
                                  onTap: isFavoriteLoading
                                      ? null
                                      : onToggleFavorite,
                                  child: Padding(
                                    padding: const EdgeInsets.all(6),
                                    child: isFavoriteLoading
                                        ? const SizedBox(
                                            width: 18,
                                            height: 18,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              color: AppColors.textSecondary,
                                            ),
                                          )
                                        : Icon(
                                            isFavorite
                                                ? Icons.favorite
                                                : Icons.favorite_border,
                                            size: 22,
                                            color: isFavorite
                                                ? const Color(0xFFFF5D7A)
                                                : AppColors.textSecondary,
                                          ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                      if (address.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            const Icon(
                              Icons.location_on_outlined,
                              size: 16,
                              color: AppColors.textSecondary,
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                address,
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                      if (avgRating > 0) ...[
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            const Icon(
                              Icons.star_rounded,
                              size: 18,
                              color: Color(0xFFFFC940),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '${avgRating.toStringAsFixed(1)} (${reviews.length} reviews)',
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              if (description.isNotEmpty) ...[
                const Padding(
                  padding: EdgeInsets.fromLTRB(12, 0, 12, 6),
                  child: Text(
                    'Description',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                Container(
                  margin: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                  padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                  decoration: BoxDecoration(
                    color: AppColors.backgroundPrimary,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.borderPrimary),
                  ),
                  child: Text(
                    description,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 13,
                      height: 1.35,
                    ),
                  ),
                ),
              ],
              if (phone.isNotEmpty ||
                  email.isNotEmpty ||
                  website.isNotEmpty ||
                  instagram.isNotEmpty) ...[
                const Padding(
                  padding: EdgeInsets.fromLTRB(12, 0, 12, 6),
                  child: Text(
                    'Contacts',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                Container(
                  margin: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                  padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                  decoration: BoxDecoration(
                    color: AppColors.backgroundPrimary,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.borderPrimary),
                  ),
                  child: Column(
                    children: [
                      if (phone.isNotEmpty) _contactRow(Icons.call_outlined, phone),
                      if (email.isNotEmpty) _contactRow(Icons.email_outlined, email),
                      if (website.isNotEmpty)
                        _contactRow(Icons.language_outlined, website),
                      if (instagram.isNotEmpty)
                        _contactRow(Icons.alternate_email, instagram),
                    ],
                  ),
                ),
              ],
              if (lat != null && lon != null)
                Container(
                  margin: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                  height: 130,
                  clipBehavior: Clip.antiAlias,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.borderPrimary),
                  ),
                  child: IgnorePointer(
                    child: FlutterMap(
                      options: MapOptions(
                        initialCenter: LatLng(lat, lon),
                        initialZoom: 15.2,
                      ),
                      children: [
                        TileLayer(
                          urlTemplate:
                              'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                          subdomains: const ['a', 'b', 'c', 'd'],
                          retinaMode: true,
                          userAgentPackageName: 'com.henzo.mobile',
                        ),
                        MarkerLayer(
                          markers: [
                            Marker(
                              point: LatLng(lat, lon),
                              width: 24,
                              height: 24,
                              child: const Icon(
                                Icons.location_on,
                                color: AppColors.primary500,
                                size: 24,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              if (upcomingClasses.isNotEmpty) ...[
                const SizedBox(height: 12),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Row(
                    children: [
                      const Expanded(
                        child: Text(
                          'Upcoming classes',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      if (upcomingClasses.length > 3)
                        TextButton(
                          onPressed: () => _showAllClasses(context, upcomingClasses),
                          child: const Text('See all'),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                ...upcomingClasses.take(3).map((raw) {
                  final item =
                      raw is Map ? Map<String, dynamic>.from(raw) : <String, dynamic>{};
                  final training = item['training'] is Map<String, dynamic>
                      ? Map<String, dynamic>.from(item['training'] as Map)
                      : <String, dynamic>{};
                  final title = (training['name'] ?? 'Class').toString();
                  final trainer = item['trainer'] is Map<String, dynamic>
                      ? (item['trainer']['name'] ?? '').toString()
                      : '';
                  final start = DateTime.tryParse((item['startsAt'] ?? '').toString())
                      ?.toLocal();
                  final duration = (training['duration'] as num?)?.toInt();
                  final price = (training['price'] as num?)?.toDouble();
                  final accentColor = parseHexColor(
                    training['displayColor']?.toString(),
                  );
                  return Container(
                    margin: const EdgeInsets.fromLTRB(12, 0, 12, 8),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                    decoration: BoxDecoration(
                      color: AppColors.backgroundPrimary,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: accentColor ?? AppColors.borderPrimary,
                      ),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                title,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _formatClassDate(start),
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                              if (trainer.isNotEmpty)
                                Text(
                                  trainer,
                                  style: const TextStyle(
                                    color: AppColors.textSecondary,
                                    fontSize: 12,
                                  ),
                                ),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            if (duration != null)
                              Text(
                                '${duration}m',
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                            if (price != null)
                              Text(
                                _formatVnd(price),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ],
          ),
          Positioned(
            top: 8,
            left: 8,
            child: Material(
              color: Colors.black.withValues(alpha: 0.38),
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: () => Navigator.of(context).maybePop(),
                child: const Padding(
                  padding: EdgeInsets.all(8),
                  child: Icon(Icons.arrow_back, color: Colors.white),
                ),
              ),
            ),
          ),
          Positioned(
            left: 12,
            right: 12,
            bottom: 12,
            child: SizedBox(
              width: double.infinity,
              child: FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.textPrimary,
                  minimumSize: const Size.fromHeight(44),
                ),
                onPressed: () {
                  final bookingPeriodDays = _extractBookingPeriodDays(studio);
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => PublicStudioScheduleScreen(
                        studioId: (studio['id'] ?? '').toString(),
                        studioName: (studio['name'] ?? 'Studio').toString(),
                        bookingPeriodDays: bookingPeriodDays,
                      ),
                    ),
                  );
                },
                child: const Text('View schedule'),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _contactRow(IconData icon, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppColors.textSecondary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatClassDate(DateTime? dt) {
    if (dt == null) return 'Date TBD';
    String two(int v) => v.toString().padLeft(2, '0');
    return '${two(dt.day)}.${two(dt.month)} ${two(dt.hour)}:${two(dt.minute)}';
  }

  String _formatVnd(num value) {
    final digits = value.round().toString();
    final out = StringBuffer();
    for (int i = 0; i < digits.length; i++) {
      out.write(digits[i]);
      final left = digits.length - i - 1;
      if (left > 0 && left % 3 == 0) {
        out.write('.');
      }
    }
    return out.toString();
  }

  void _showAllClasses(BuildContext context, List<dynamic> classes) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      backgroundColor: AppColors.backgroundPrimary,
      builder: (ctx) {
        return SafeArea(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 6, 16, 16),
            itemCount: classes.length,
            itemBuilder: (_, index) {
              final raw = classes[index];
              final item =
                  raw is Map ? Map<String, dynamic>.from(raw) : <String, dynamic>{};
              final training = item['training'] is Map<String, dynamic>
                  ? Map<String, dynamic>.from(item['training'] as Map)
                  : <String, dynamic>{};
              final title = (training['name'] ?? 'Class').toString();
              final start = DateTime.tryParse((item['startsAt'] ?? '').toString())
                  ?.toLocal();
              return ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(title),
                subtitle: Text(_formatClassDate(start)),
              );
            },
          ),
        );
      },
    );
  }

  double _calcAverageRating(List<dynamic> reviews) {
    if (reviews.isEmpty) return 0;
    var sum = 0.0;
    var count = 0;
    for (final r in reviews) {
      if (r is! Map) continue;
      final rating = (r['rating'] as num?)?.toDouble();
      if (rating == null || rating <= 0) continue;
      sum += rating;
      count += 1;
    }
    if (count == 0) return 0;
    return sum / count;
  }

  Widget _photoFallback() {
    return Container(
      color: AppColors.secondary100,
      alignment: Alignment.center,
      child: const Icon(
        Icons.fitness_center,
        color: AppColors.primary500,
        size: 42,
      ),
    );
  }
}
