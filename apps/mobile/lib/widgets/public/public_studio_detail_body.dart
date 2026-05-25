import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../models/training_category_option.dart';
import '../../services/api_client.dart';
import '../../services/client_favorites_store.dart';
import '../../services/client_location_store.dart';
import '../../utils/formatters.dart';
import '../../utils/studio_description.dart';
import '../../widgets/common/henzo_header_back_button.dart';
import '../../widgets/public/cached_salon_network_image.dart';
import '../../screens/client_studio_reviews_screen.dart';
import '../../screens/public_studio_schedule_screen.dart';

/// Client studio profile body (browse → studio detail mock layout).
class PublicStudioDetailBody extends StatefulWidget {
  const PublicStudioDetailBody({
    super.key,
    required this.studio,
    required this.isFavoriteLoading,
    required this.onToggleFavorite,
  });

  final Map<String, dynamic> studio;
  final bool isFavoriteLoading;
  final VoidCallback onToggleFavorite;

  @override
  State<PublicStudioDetailBody> createState() => _PublicStudioDetailBodyState();
}

class _PublicStudioDetailBodyState extends State<PublicStudioDetailBody> {
  static const _categoryChipPalette = <(Color bg, Color fg)>[
    (Color(0xFFFFEB3B), Color(0xFF3F3F3F)),
    (Color(0xFFE91E8C), Colors.white),
    (Color(0xFF4D39A8), Colors.white),
    (Color(0xFF5BC0EB), Colors.white),
    (Color(0xFF8BC34A), Color(0xFF3F3F3F)),
  ];

  List<TrainingCategoryOption> _allCategories = [];
  final PageController _reviewPageController = PageController();
  int _reviewPageIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadCategories();
    _reviewPageController.addListener(_onReviewPage);
  }

  void _onReviewPage() {
    final i = _reviewPageController.page?.round() ?? 0;
    if (i != _reviewPageIndex && mounted) {
      setState(() => _reviewPageIndex = i);
    }
  }

  Future<void> _loadCategories() async {
    try {
      final raw = await ApiClient.get('/trainings/categories', null);
      if (!mounted) return;
      if (raw is! List) return;
      final list = <TrainingCategoryOption>[];
      for (final row in raw) {
        if (row is Map<String, dynamic>) {
          list.add(TrainingCategoryOption.fromJson(row));
        } else if (row is Map) {
          list.add(
            TrainingCategoryOption.fromJson(Map<String, dynamic>.from(row)),
          );
        }
      }
      setState(
        () => _allCategories = TrainingCategoryOption.withOtherLast(list),
      );
    } catch (_) {}
  }

  @override
  void dispose() {
    _reviewPageController.removeListener(_onReviewPage);
    _reviewPageController.dispose();
    super.dispose();
  }

  List<String> _studioPhotoUrls() {
    final photos = widget.studio['photos'];
    if (photos is! List) return [];
    final out = <String>[];
    for (final e in photos) {
      final u = e?.toString().trim() ?? '';
      if (u.isNotEmpty) out.add(u);
    }
    return out;
  }

  List<int> _studioCategoryIds() {
    final services = widget.studio['services'];
    if (services is! List) return [];
    final seen = <int>{};
    final ids = <int>[];
    for (final raw in services) {
      if (raw is! Map) continue;
      final id = (raw['trainingCategoryId'] as num?)?.toInt();
      if (id == null || !seen.add(id)) continue;
      ids.add(id);
    }
    return ids;
  }

  TrainingCategoryOption? _categoryById(int id) {
    for (final c in _allCategories) {
      if (c.id == id) return c;
    }
    return null;
  }

  String _categoryLabel(Map<String, dynamic> cat, String localeCode) {
    switch (localeCode) {
      case 'vi':
        final vn = (cat['nameVn'] ?? cat['name_vn'] ?? '').toString();
        if (vn.isNotEmpty) return vn;
      case 'ru':
        final ru = (cat['nameRu'] ?? cat['name_ru'] ?? '').toString();
        if (ru.isNotEmpty) return ru;
    }
    final en = (cat['nameEn'] ?? cat['name_en'] ?? '').toString();
    return en.isNotEmpty ? en : 'Category';
  }

  List<Map<String, dynamic>> _parsedReviews() {
    final raw = widget.studio['reviews'];
    if (raw is! List) return [];
    final out = <Map<String, dynamic>>[];
    for (final item in raw) {
      if (item is Map<String, dynamic>) {
        out.add(item);
      } else if (item is Map) {
        out.add(Map<String, dynamic>.from(item));
      }
    }
    out.sort((a, b) {
      final da = DateTime.tryParse((a['createdAt'] ?? '').toString());
      final db = DateTime.tryParse((b['createdAt'] ?? '').toString());
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return db.compareTo(da);
    });
    return out;
  }

  double _averageRating(List<Map<String, dynamic>> reviews) {
    if (reviews.isEmpty) return 0;
    var sum = 0.0;
    var n = 0;
    for (final r in reviews) {
      final rating = (r['rating'] as num?)?.toDouble();
      if (rating == null || rating <= 0) continue;
      sum += rating;
      n++;
    }
    return n == 0 ? 0 : sum / n;
  }

  int _extractBookingPeriodDays() {
    const defaultDays = 30;
    const minDays = 1;
    const maxDays = 60;
    final reminderSettings = widget.studio['reminderSettings'];
    if (reminderSettings is! Map) return defaultDays;
    final raw = reminderSettings['bookingPeriodDays'];
    int? days;
    if (raw is int) days = raw;
    if (raw is num) days = raw.toInt();
    if (raw is String) days = int.tryParse(raw);
    return (days ?? defaultDays).clamp(minDays, maxDays);
  }

  Future<void> _shareStudio(String name) async {
    await Share.share('Check out $name on Henzo');
  }

  double? _distanceKmFromClient(ClientLocationStore loc) {
    if (loc.lat == null || loc.lon == null) return null;
    final lat = (widget.studio['latitude'] as num?)?.toDouble();
    final lon = (widget.studio['longitude'] as num?)?.toDouble();
    if (lat == null || lon == null) return null;
    const d = Distance();
    final meters = d.as(
      LengthUnit.Meter,
      LatLng(loc.lat!, loc.lon!),
      LatLng(lat, lon),
    );
    return meters / 1000.0;
  }

  void _copyAddress(BuildContext context, String address) {
    Clipboard.setData(ClipboardData(text: address));
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Address copied')));
  }

  void _openSchedule() {
    final studio = widget.studio;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PublicStudioScheduleScreen(
          studioId: (studio['id'] ?? '').toString(),
          studioName: (studio['name'] ?? 'Studio').toString(),
          bookingPeriodDays: _extractBookingPeriodDays(),
          studioLocationCount: (studio['locationCount'] as num?)?.toInt() ?? 1,
        ),
      ),
    );
  }

  void _openAllReviews(List<Map<String, dynamic>> reviews, double avgRating) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ClientStudioReviewsScreen(
          studioName: (widget.studio['name'] ?? 'Studio').toString(),
          reviews: reviews,
          avgRating: avgRating,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final localeCode = locale.localeCode;
    final t = (String k) => locale.t('clientStudioDetail.$k');
    final seeAll = locale.t('clientHome.seeAll');
    final reviewsEmpty = locale.t('dashboard.reviewsEmpty');

    final studio = widget.studio;
    final photoUrls = _studioPhotoUrls();
    final name = (studio['name'] ?? 'Studio').toString();
    final address = (studio['address'] ?? '').toString();
    final description = resolveStudioDescription(studio, localeCode);
    final reviews = _parsedReviews();
    final avgRating = _averageRating(reviews);
    final ratingLabel = avgRating > 0
        ? t('reviewsRating')
              .replaceAll('{rating}', avgRating.toStringAsFixed(1))
              .replaceAll('{count}', '${reviews.length}')
        : null;
    final categoryIds = _studioCategoryIds();
    final topInset = MediaQuery.paddingOf(context).top;
    final locStore = context.watch<ClientLocationStore>();
    final distanceLabel = formatDistanceKmLabel(
      _distanceKmFromClient(locStore),
    );

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: Stack(
        children: [
          CustomScrollView(
            slivers: [
              SliverToBoxAdapter(child: _StudioPhotoHero(photoUrls: photoUrls)),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(
                  kScreenPaddingHorizontal,
                  16,
                  kScreenPaddingHorizontal,
                  32,
                ),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            name,
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.4,
                              color: AppColors.textPrimary,
                              height: 1.1,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Consumer<ClientFavoritesStore>(
                          builder: (context, fav, _) {
                            final sid = (studio['id'] ?? '').toString();
                            final isFavorite = fav.isFavorite(sid);
                            return Material(
                              color: Colors.transparent,
                              child: InkWell(
                                customBorder: const CircleBorder(),
                                onTap: widget.isFavoriteLoading
                                    ? null
                                    : widget.onToggleFavorite,
                                child: Padding(
                                  padding: const EdgeInsets.all(4),
                                  child: widget.isFavoriteLoading
                                      ? const SizedBox(
                                          width: 22,
                                          height: 22,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                          ),
                                        )
                                      : Icon(
                                          isFavorite
                                              ? Icons.favorite
                                              : Icons.favorite_border,
                                          size: 26,
                                          color: const Color(0xFFFF5D7A),
                                        ),
                                ),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                    if (address.isNotEmpty ||
                        ratingLabel != null ||
                        distanceLabel != null) ...[
                      const SizedBox(height: 2),
                      if (address.isNotEmpty || distanceLabel != null)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            SvgPicture.asset(
                              'assets/icons/icon-pin.svg',
                              width: 12,
                              height: 16,
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                distanceLabel != null
                                    ? '$name · $distanceLabel'
                                    : name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      if (ratingLabel != null) ...[
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            const Icon(
                              Icons.star_rounded,
                              size: 16,
                              color: Color(0xFFFFB800),
                            ),
                            const SizedBox(width: 2),
                            Text(
                              ratingLabel,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                    if (description.isNotEmpty) ...[
                      const SizedBox(height: 14),
                      _StudioDescriptionSection(
                        description: description,
                        readMoreLabel: t('readMore'),
                        readLessLabel: t('readLess'),
                      ),
                    ],
                    if (categoryIds.isNotEmpty) ...[
                      const SizedBox(height: 14),
                      SizedBox(
                        height: 32,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: categoryIds.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 8),
                          itemBuilder: (_, index) {
                            final id = categoryIds[index];
                            final opt = _categoryById(id);
                            if (opt != null) {
                              final bg = opt.backgroundColor();
                              return _CategoryChip(
                                label: opt.label(localeCode),
                                bg: bg,
                                fg: opt.foregroundColorOn(bg),
                                outlined: opt.isOtherCategory,
                              );
                            }
                            final services = studio['services'] as List?;
                            Map<String, dynamic>? catMap;
                            if (services != null) {
                              for (final s in services) {
                                if (s is! Map) continue;
                                final tc = s['trainingCategory'];
                                if (tc is Map &&
                                    (tc['id'] as num?)?.toInt() == id) {
                                  catMap = Map<String, dynamic>.from(tc);
                                  break;
                                }
                              }
                            }
                            final palette =
                                _categoryChipPalette[index %
                                    _categoryChipPalette.length];
                            return _CategoryChip(
                              label: catMap != null
                                  ? _categoryLabel(catMap, localeCode)
                                  : 'Category',
                              bg: palette.$1,
                              fg: palette.$2,
                            );
                          },
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    Material(
                      color: AppColors.primary500,
                      borderRadius: BorderRadius.circular(14),
                      child: InkWell(
                        onTap: _openSchedule,
                        borderRadius: BorderRadius.circular(14),
                        child: Stack(
                          children: [
                            Padding(
                              padding: const EdgeInsets.fromLTRB(
                                14,
                                14,
                                14 + 28 + 8,
                                14,
                              ),
                              child: Row(
                                children: [
                                  SvgPicture.asset(
                                    'assets/icons/icon-calendar.svg',
                                    width: 22,
                                    height: 22,
                                  ),
                                  const SizedBox(width: 20),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          t('viewSchedule'),
                                          style: const TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w600,
                                            color: Colors.white,
                                          ),
                                        ),
                                        Text(
                                          t('viewScheduleSubtitle'),
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: Colors.white.withValues(
                                              alpha: 0.9,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Positioned(
                              right: 8,
                              top: 0,
                              bottom: 0,
                              child: Center(
                                child: Icon(
                                  Icons.chevron_right_rounded,
                                  color: Colors.white,
                                  size: 28,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (address.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 30,
                            height: 30,
                            decoration: const BoxDecoration(
                              color: Color(0xFFFFEB3B),
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: SvgPicture.asset(
                                'assets/icons/icon-pin-simple.svg',
                                width: 10,
                                height: 14,
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  name,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  address,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    height: 1.3,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          InkWell(
                            onTap: () => _copyAddress(context, address),
                            borderRadius: BorderRadius.circular(6),
                            child: Padding(
                              padding: const EdgeInsets.only(
                                left: 8,
                                top: 2,
                                right: 8,
                              ),
                              child: SvgPicture.asset(
                                'assets/icons/icon-copy.svg',
                                width: 18,
                                height: 18,
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
                    const SizedBox(height: 20),
                    Container(
                      padding: const EdgeInsets.fromLTRB(14, 14, 14, 16),
                      decoration: BoxDecoration(
                        color: AppColors.backgroundPrimary,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  t('reviewsTitle'),
                                  style: const TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ),
                              if (reviews.isNotEmpty)
                                InkWell(
                                  onTap: () =>
                                      _openAllReviews(reviews, avgRating),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        seeAll,
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.primary500,
                                        ),
                                      ),
                                      const Icon(
                                        Icons.chevron_right_rounded,
                                        size: 20,
                                        color: AppColors.primary500,
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          if (reviews.isEmpty)
                            Text(
                              reviewsEmpty,
                              style: const TextStyle(
                                fontSize: 14,
                                color: AppColors.textSecondary,
                              ),
                            )
                          else ...[
                            SizedBox(
                              height: 108,
                              child: PageView.builder(
                                controller: _reviewPageController,
                                itemCount: reviews.length,
                                itemBuilder: (_, index) {
                                  return _ReviewCarouselCard(
                                    review: reviews[index],
                                    daysAgoTemplate: t('reviewsDaysAgo'),
                                    hoursAgoTemplate: t('reviewsHoursAgo'),
                                    justNowLabel: t('reviewsJustNow'),
                                  );
                                },
                              ),
                            ),
                            if (reviews.length > 1) ...[
                              const SizedBox(height: 10),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: List.generate(reviews.length, (i) {
                                  final active = i == _reviewPageIndex;
                                  return Container(
                                    width: active ? 8 : 6,
                                    height: active ? 8 : 6,
                                    margin: const EdgeInsets.symmetric(
                                      horizontal: 3,
                                    ),
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: active
                                          ? AppColors.primary500
                                          : AppColors.neutral300,
                                    ),
                                  );
                                }),
                              ),
                            ],
                          ],
                        ],
                      ),
                    ),
                  ]),
                ),
              ),
            ],
          ),
          Positioned(
            top: topInset + 8,
            left: 0,
            child: HenzoHeaderBackButton(
              onPressed: () => Navigator.of(context).maybePop(),
            ),
          ),
          Positioned(
            top: topInset + 8,
            right: 12,
            child: Material(
              color: AppColors.backgroundPrimary,
              borderRadius: BorderRadius.circular(18),
              child: InkWell(
                onTap: () => _shareStudio(name),
                borderRadius: BorderRadius.circular(18),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 7,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SvgPicture.asset(
                        'assets/icons/icon-share.svg',
                        width: 15,
                        height: 11,
                        fit: BoxFit.contain,
                        excludeFromSemantics: true,
                        colorFilter: const ColorFilter.mode(
                          AppColors.textPrimary,
                          BlendMode.srcIn,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        t('share'),
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          letterSpacing: -0.2,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StudioPhotoHero extends StatefulWidget {
  const _StudioPhotoHero({required this.photoUrls});

  static const height = 290.0;

  final List<String> photoUrls;

  @override
  State<_StudioPhotoHero> createState() => _StudioPhotoHeroState();
}

class _StudioPhotoHeroState extends State<_StudioPhotoHero> {
  static const _dotHeight = 6.0;
  static const _dotWidth = 6.0;
  static const _dotActiveWidth = 12.0;

  PageController? _pageController;
  int _pageIndex = 0;

  @override
  void initState() {
    super.initState();
    if (widget.photoUrls.length > 1) {
      _pageController = PageController();
      _pageController!.addListener(_onPage);
    }
  }

  void _onPage() {
    final i = _pageController?.page?.round() ?? 0;
    if (i != _pageIndex && mounted) {
      setState(() => _pageIndex = i);
    }
  }

  @override
  void dispose() {
    _pageController?.removeListener(_onPage);
    _pageController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final urls = widget.photoUrls;
    final hasMultiple = urls.length > 1;

    return SizedBox(
      height: _StudioPhotoHero.height,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (urls.isEmpty)
            const ColoredBox(
              color: AppColors.secondary100,
              child: Center(
                child: Icon(
                  Icons.fitness_center,
                  color: AppColors.primary500,
                  size: 48,
                ),
              ),
            )
          else if (!hasMultiple)
            CachedSalonNetworkImage(imageUrl: urls.first, fit: BoxFit.cover)
          else
            PageView.builder(
              controller: _pageController,
              itemCount: urls.length,
              itemBuilder: (_, index) => CachedSalonNetworkImage(
                imageUrl: urls[index],
                fit: BoxFit.cover,
              ),
            ),
          if (hasMultiple)
            Positioned(
              left: 0,
              right: 0,
              bottom: 12,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(urls.length, (i) {
                  final active = i == _pageIndex;
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    curve: Curves.easeOut,
                    width: active ? _dotActiveWidth : _dotWidth,
                    height: _dotHeight,
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: active ? 1 : 0.55),
                      borderRadius: BorderRadius.circular(_dotHeight / 2),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x33000000),
                          blurRadius: 4,
                          offset: Offset(0, 1),
                        ),
                      ],
                    ),
                  );
                }),
              ),
            ),
        ],
      ),
    );
  }
}

class _StudioDescriptionSection extends StatefulWidget {
  const _StudioDescriptionSection({
    required this.description,
    required this.readMoreLabel,
    required this.readLessLabel,
  });

  final String description;
  final String readMoreLabel;
  final String readLessLabel;

  @override
  State<_StudioDescriptionSection> createState() =>
      _StudioDescriptionSectionState();
}

class _StudioDescriptionSectionState extends State<_StudioDescriptionSection> {
  static const _textStyle = TextStyle(
    fontSize: 14,
    height: 1.4,
    color: AppColors.textSecondary,
  );

  bool _expanded = false;

  bool _exceedsTwoLines(double maxWidth, TextDirection direction) {
    final painter = TextPainter(
      text: TextSpan(text: widget.description, style: _textStyle),
      maxLines: 2,
      textDirection: direction,
    )..layout(maxWidth: maxWidth);
    return painter.didExceedMaxLines;
  }

  @override
  Widget build(BuildContext context) {
    final direction = Directionality.of(context);

    return LayoutBuilder(
      builder: (context, constraints) {
        final showToggle = _exceedsTwoLines(constraints.maxWidth, direction);

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.description,
              maxLines: _expanded ? null : 2,
              overflow: _expanded
                  ? TextOverflow.visible
                  : TextOverflow.ellipsis,
              style: _textStyle,
            ),
            if (showToggle) ...[
              const SizedBox(height: 4),
              InkWell(
                onTap: () => setState(() => _expanded = !_expanded),
                borderRadius: BorderRadius.circular(4),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _expanded ? widget.readLessLabel : widget.readMoreLabel,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary500,
                      ),
                    ),
                    Icon(
                      _expanded
                          ? Icons.keyboard_arrow_up_rounded
                          : Icons.keyboard_arrow_down_rounded,
                      size: 20,
                      color: AppColors.primary500,
                    ),
                  ],
                ),
              ),
            ],
          ],
        );
      },
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
    required this.label,
    required this.bg,
    required this.fg,
    this.outlined = false,
  });

  final String label;
  final Color bg;
  final Color fg;
  final bool outlined;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: outlined ? Border.all(color: AppColors.primary300) : null,
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: fg),
      ),
    );
  }
}

class _ReviewCarouselCard extends StatelessWidget {
  const _ReviewCarouselCard({
    required this.review,
    required this.daysAgoTemplate,
    required this.hoursAgoTemplate,
    required this.justNowLabel,
  });

  final Map<String, dynamic> review;
  final String daysAgoTemplate;
  final String hoursAgoTemplate;
  final String justNowLabel;

  @override
  Widget build(BuildContext context) {
    final rating = (review['rating'] as num?)?.toDouble() ?? 0;
    final comment = (review['comment'] ?? '').toString().trim();
    final user = review['user'];
    final name = user is Map ? (user['name'] ?? '').toString().trim() : '';
    final displayName = name.isNotEmpty ? name : '—';
    final created = DateTime.tryParse((review['createdAt'] ?? '').toString());
    final when = formatRelativeReviewDateLabel(
      created,
      daysAgoTemplate: daysAgoTemplate,
      hoursAgoTemplate: hoursAgoTemplate,
      justNowLabel: justNowLabel,
    );
    final initial = displayName == '—'
        ? '?'
        : displayName.characters.first.toUpperCase();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            CircleAvatar(
              radius: 20,
              backgroundColor: AppColors.secondary200,
              child: Text(
                initial,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          displayName,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      if (when.isNotEmpty)
                        Text(
                          when,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textTertiary,
                          ),
                        ),
                    ],
                  ),
                  Row(
                    children: [
                      const Icon(
                        Icons.star_rounded,
                        size: 14,
                        color: Color(0xFFFFB800),
                      ),
                      const SizedBox(width: 2),
                      Text(
                        rating.toStringAsFixed(1),
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        if (comment.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            comment,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 14,
              height: 1.35,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ],
    );
  }
}
