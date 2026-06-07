import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../models/training_category_option.dart';
import '../../services/client_favorites_store.dart';
import '../../services/cache/training_categories_cache.dart';
import '../../utils/share_utils.dart';
import '../../utils/studio_photo_urls.dart';
import '../../utils/studio_description.dart';
import '../../utils/studio_public_contacts.dart';
import '../../widgets/common/henzo_header_back_button.dart';
import '../../widgets/public/cached_salon_network_image.dart';
import '../../widgets/public/studio_contact_row.dart';
import '../../widgets/public/studio_review_card.dart';
import '../../screens/client_studio_reviews_screen.dart';
import '../../screens/public_studio_schedule_screen.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

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

  // Memoized derived data — recomputed only when widget.studio changes.
  List<String> _cachedPhotoUrls = [];
  List<int> _cachedCategoryIds = [];
  List<Map<String, dynamic>> _cachedReviews = [];
  double _cachedAvgRating = 0;

  @override
  void initState() {
    super.initState();
    _recomputeDerived();
    _loadCategories();
  }

  @override
  void didUpdateWidget(PublicStudioDetailBody old) {
    super.didUpdateWidget(old);
    if (old.studio != widget.studio) _recomputeDerived();
  }

  void _recomputeDerived() {
    final photos = widget.studio['photos'];
    final photosList = photos is List
        ? photos.map((e) => e?.toString() ?? '').toList()
        : null;
    final gallery = studioPhotoGalleryFromPayload(
      photoGallery: widget.studio['photoGallery'],
      photos: photosList,
    );
    _cachedPhotoUrls = studioHeroPhotoUrls(
      gallery: gallery.isEmpty ? null : gallery,
      photos: photosList,
    );

    final services = widget.studio['services'];
    if (services is List) {
      final seen = <int>{};
      final ids = <int>[];
      for (final raw in services) {
        if (raw is! Map) continue;
        final id = (raw['trainingCategoryId'] as num?)?.toInt();
        if (id != null && seen.add(id)) ids.add(id);
      }
      _cachedCategoryIds = ids;
    } else {
      _cachedCategoryIds = [];
    }

    final rawReviews = widget.studio['reviews'];
    final reviews = <Map<String, dynamic>>[];
    if (rawReviews is List) {
      for (final item in rawReviews) {
        if (item is Map<String, dynamic>) {
          reviews.add(item);
        } else if (item is Map) {
          reviews.add(Map<String, dynamic>.from(item));
        }
      }
      reviews.sort((a, b) {
        final da = DateTime.tryParse((a['createdAt'] ?? '').toString());
        final db = DateTime.tryParse((b['createdAt'] ?? '').toString());
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return db.compareTo(da);
      });
    }
    _cachedReviews = reviews;

    var sum = 0.0;
    var n = 0;
    for (final r in _cachedReviews) {
      final rating = (r['rating'] as num?)?.toDouble();
      if (rating != null && rating > 0) { sum += rating; n++; }
    }
    _cachedAvgRating = n == 0 ? 0 : sum / n;
  }

  Future<void> _loadCategories() async {
    final cats = await context
        .read<TrainingCategoriesCache>()
        .getCategories();
    if (!mounted) return;
    setState(() => _allCategories = cats);
  }

  TrainingCategoryOption? _categoryById(int id) {
    for (final c in _allCategories) {
      if (c.id == id) return c;
    }
    return null;
  }

  // _studioPhotoUrls, _studioCategoryIds
  // removed — replaced by memoized fields computed in _recomputeDerived().

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
    await Share.share('Check out $name on Henzo', sharePositionOrigin: shareOrigin(context));
  }

  void _copyAddress(BuildContext context, String address, String copiedMsg) {
    Clipboard.setData(ClipboardData(text: address));
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(copiedMsg)));
  }

  String _compactRatingLabel(double avgRating, int count) {
    final rating = avgRating.toStringAsFixed(1).replaceAll('.', ',');
    return '$rating ($count)';
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
    String t(String k) => locale.t('clientStudioDetail.$k');
    final reviewsSeeMore = t('reviewsSeeMore');
    final descriptionLabel = locale.t(
      'clientClassDetail.descriptionSectionLabel',
    );

    final studio = widget.studio;
    final photoUrls = _cachedPhotoUrls;
    final name = (studio['name'] ?? 'Studio').toString();
    final address = (studio['address'] ?? '').toString().trim();
    final locationName = (studio['locationName'] ?? '').toString().trim();
    final description = resolveStudioDescription(studio, localeCode);
    final reviews = _cachedReviews;
    final avgRating = _cachedAvgRating;
    final reviewCount = reviews.length;
    final compactRating = avgRating > 0
        ? _compactRatingLabel(avgRating, reviewCount)
        : null;
    final categoryIds = _cachedCategoryIds;
    final contacts = studioPublicContactsFromMap(studio);
    final topInset = MediaQuery.paddingOf(context).top;
    final addressCopiedMsg = t('addressCopied');

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
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: Text(
                            name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 22.sp,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.4,
                              color: AppColors.textPrimary,
                              height: 1.1,
                            ),
                          ),
                        ),
                        if (compactRating != null) ...[
                          const SizedBox(width: 10),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.star_rounded,
                                size: 16,
                                color: Color(0xFFFFB800),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                compactRating,
                                style: TextStyle(
                                  fontSize: 13.sp,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                    if (address.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: SvgPicture.asset(
                              'assets/icons/icon-pin.svg',
                              width: 14,
                              height: 18,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (locationName.isNotEmpty) ...[
                                  Text(
                                    locationName,
                                    style: TextStyle(
                                      fontSize: 15.sp,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                ],
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        address,
                                        style: TextStyle(
                                          fontSize: 13.sp,
                                          height: 1.35,
                                          color: AppColors.textSecondary,
                                        ),
                                      ),
                                    ),
                                    InkWell(
                                      onTap: () => _copyAddress(
                                        context,
                                        address,
                                        addressCopiedMsg,
                                      ),
                                      borderRadius: BorderRadius.circular(6),
                                      child: Padding(
                                        padding: const EdgeInsets.only(
                                          left: 8,
                                          right: 4,
                                        ),
                                        child: SvgPicture.asset(
                                          'assets/icons/icon-copy.svg',
                                          width: 18,
                                          height: 18,
                                          fit: BoxFit.contain,
                                          excludeFromSemantics: true,
                                          colorFilter: const ColorFilter.mode(
                                            AppColors.textPrimary,
                                            BlendMode.srcIn,
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
                    ],
                    if (contacts.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      StudioContactRow(
                        contacts: contacts,
                        onContactTap: launchStudioPublicContact,
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
                                          style: TextStyle(
                                            fontSize: 14.sp,
                                            fontWeight: FontWeight.w600,
                                            color: Colors.white,
                                          ),
                                        ),
                                        Text(
                                          t('viewScheduleSubtitle'),
                                          style: TextStyle(
                                            fontSize: 11.sp,
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
                    if (description.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      Text(
                        descriptionLabel,
                        style: TextStyle(
                          fontSize: 13.sp,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.4,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(13),
                        decoration: BoxDecoration(
                          color: AppColors.backgroundPrimary,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: _StudioDescriptionSection(
                          description: description,
                          readMoreLabel: t('readMore'),
                          readLessLabel: t('readLess'),
                        ),
                      ),
                    ],
                    if (categoryIds.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      SizedBox(
                        height: 32,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: categoryIds.length,
                          separatorBuilder: (_, _) => const SizedBox(width: 8),
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
                    if (reviews.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      StudioReviewsSectionHeader(
                        title: t('reviewsTitle'),
                        seeMoreLabel: reviewsSeeMore,
                        avgRating: avgRating,
                        reviewCount: reviewCount,
                        onSeeMore: () => _openAllReviews(reviews, avgRating),
                      ),
                      const SizedBox(height: 10),
                      StudioReviewCard(
                        review: reviews.first,
                        readMoreLabel: t('readMore'),
                        readLessLabel: t('readLess'),
                      ),
                    ],
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
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Consumer<ClientFavoritesStore>(
                  builder: (context, fav, _) {
                    final sid = (studio['id'] ?? '').toString();
                    final isFavorite = fav.isFavorite(sid);
                    return _HeroOverlayButton(
                      color: AppColors.primary500,
                      onTap: widget.isFavoriteLoading
                          ? null
                          : widget.onToggleFavorite,
                      child: widget.isFavoriteLoading
                          ? SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : isFavorite
                          ? Icon(
                              Icons.favorite,
                              size: 18,
                              color: Colors.white,
                            )
                          : SvgPicture.asset(
                              'assets/icons/icon-heart.svg',
                              width: 18,
                              height: 18,
                              colorFilter: ColorFilter.mode(
                                Colors.white,
                                BlendMode.srcIn,
                              ),
                            ),
                    );
                  },
                ),
                const SizedBox(width: 14),
                _HeroOverlayButton(
                  onTap: () => _shareStudio(name),
                  child: SvgPicture.asset(
                    'assets/icons/icon-share.svg',
                    width: 16,
                    height: 12,
                    fit: BoxFit.contain,
                    excludeFromSemantics: true,
                    colorFilter: const ColorFilter.mode(
                      AppColors.textPrimary,
                      BlendMode.srcIn,
                    ),
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

class _HeroOverlayButton extends StatelessWidget {
  const _HeroOverlayButton({
    required this.child,
    this.onTap,
    this.color = AppColors.backgroundPrimary,
  });

  final Widget child;
  final VoidCallback? onTap;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: HenzoHeaderBackButton.size,
      height: HenzoHeaderBackButton.size,
      child: Material(
        color: color,
        shape: const CircleBorder(),
        child: InkWell(
          onTap: onTap,
          customBorder: const CircleBorder(),
          child: Center(child: child),
        ),
      ),
    );
  }
}

class _StudioPhotoHero extends StatefulWidget {
  const _StudioPhotoHero({required this.photoUrls});

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

  bool get _hasMultiple => widget.photoUrls.length > 1;

  @override
  void initState() {
    super.initState();
    _syncPageController();
  }

  @override
  void didUpdateWidget(covariant _StudioPhotoHero oldWidget) {
    super.didUpdateWidget(oldWidget);
    final hadMultiple = oldWidget.photoUrls.length > 1;
    if (hadMultiple != _hasMultiple) {
      _disposePageController();
      _pageIndex = 0;
      _syncPageController();
      return;
    }
    if (_pageIndex >= widget.photoUrls.length) {
      _pageIndex = 0;
      if (_pageController?.hasClients ?? false) {
        _pageController!.jumpToPage(0);
      }
    }
  }

  void _syncPageController() {
    if (!_hasMultiple) return;
    _pageController ??= PageController();
  }

  void _disposePageController() {
    _pageController?.dispose();
    _pageController = null;
  }

  void _onPageChanged(int index) {
    if (!mounted || index == _pageIndex) return;
    setState(() => _pageIndex = index);
  }

  @override
  void dispose() {
    _disposePageController();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final urls = widget.photoUrls;
    final hasMultiple = urls.length > 1;

    return AspectRatio(
      aspectRatio: kStudioCoverPhotoAspectRatio,
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
              onPageChanged: _onPageChanged,
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
  static final _textStyle = TextStyle(
    fontSize: 14.sp,
    height: 1.4,
    color: AppColors.textPrimary,
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
                      style: TextStyle(
                        fontSize: 14.sp,
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
        style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w600, color: fg),
      ),
    );
  }
}
