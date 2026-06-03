import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../services/api_client.dart';
import '../../utils/formatters.dart';
import '../../widgets/common/henzo_header_back_button.dart';
import '../../widgets/common/load_error_view.dart';
import '../../widgets/public/studio_review_card.dart';
import '../../widgets/public/studio_reviews_summary_card.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class OwnerStudioReviewsScreen extends StatefulWidget {
  const OwnerStudioReviewsScreen({
    super.key,
    required this.studioId,
    this.headerAvgRating,
  });

  final String studioId;
  final double? headerAvgRating;

  @override
  State<OwnerStudioReviewsScreen> createState() =>
      _OwnerStudioReviewsScreenState();
}

class _OwnerStudioReviewsScreenState extends State<OwnerStudioReviewsScreen> {
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _reviews = [];
  double _avgFromPayload = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final raw = await ApiClient.get('/studios/${widget.studioId}', null);
      if (!mounted) return;
      if (raw is! Map<String, dynamic>) {
        setState(() {
          _loading = false;
          _error = 'Invalid response';
        });
        return;
      }
      final list =
          raw['reviews'] is List ? raw['reviews'] as List : const <dynamic>[];
      final parsed = <Map<String, dynamic>>[];
      for (final item in list) {
        if (item is Map) parsed.add(Map<String, dynamic>.from(item));
      }
      parsed.sort((a, b) {
        final da = DateTime.tryParse((a['createdAt'] ?? '').toString());
        final db = DateTime.tryParse((b['createdAt'] ?? '').toString());
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return db.compareTo(da);
      });

      double sum = 0;
      var n = 0;
      for (final r in parsed) {
        final rt = (r['rating'] as num?)?.toDouble();
        if (rt != null && rt > 0) {
          sum += rt;
          n++;
        }
      }

      setState(() {
        _reviews = parsed;
        _avgFromPayload = n > 0 ? sum / n : (widget.headerAvgRating ?? 0);
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    String t(String k) => locale.t('clientStudioDetail.$k');

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header — same style as ClientStudioReviewsScreen
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 4, 12, 8),
              child: Row(
                children: [
                  HenzoHeaderBackButton(
                    onPressed: () => Navigator.pop(context),
                  ),
                  Expanded(
                    child: Text(
                      t('reviewsTitle'),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 18.sp,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(width: HenzoHeaderBackButton.size + 8),
                ],
              ),
            ),

            Expanded(
              child: _loading
                  ? const Center(
                      child: CircularProgressIndicator(
                        color: AppColors.primary500,
                      ),
                    )
                  : _error != null
                  ? LoadErrorView(
                      message: _error!,
                      onRetry: _load,
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      color: AppColors.primary500,
                      child: _reviews.isEmpty
                          ? ListView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              children: [
                                const SizedBox(height: 80),
                                Center(
                                  child: Text(
                                    locale.t('dashboard.reviewsEmpty'),
                                    style: TextStyle(
                                      color: AppColors.textSecondary,
                                      fontSize: 15.sp,
                                    ),
                                  ),
                                ),
                              ],
                            )
                          : ListView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              padding: const EdgeInsets.fromLTRB(
                                kScreenPaddingHorizontal,
                                0,
                                kScreenPaddingHorizontal,
                                24,
                              ),
                              children: [
                                StudioReviewsSummaryCard(
                                  avgRating: _avgFromPayload,
                                  reviewCount: _reviews.length,
                                  reviews: _reviews,
                                  onReviewsLabel: t('reviewsOnCount'),
                                ),
                                const SizedBox(height: 16),
                                ..._reviews.map((r) {
                                  final created = DateTime.tryParse(
                                    (r['createdAt'] ?? '').toString(),
                                  );
                                  final dateLabel =
                                      formatRelativeReviewDateLabel(
                                    created,
                                    daysAgoTemplate: t('reviewsDaysAgo'),
                                    hoursAgoTemplate: t('reviewsHoursAgo'),
                                    justNowLabel: t('reviewsJustNow'),
                                  );
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 10),
                                    child: StudioReviewCard(
                                      review: r,
                                      readMoreLabel: t('readMore'),
                                      readLessLabel: t('readLess'),
                                      dateLabel: dateLabel,
                                    ),
                                  );
                                }),
                              ],
                            ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
