import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../services/api_client.dart';
import '../../widgets/common/henzo_header_back_button.dart';

/// Owner-facing list of client ratings and comments for this studio (same API as public studio page).
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
  int _countFromPayload = 0;

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
          _reviews = [];
        });
        return;
      }
      final list =
          raw['reviews'] is List ? raw['reviews'] as List : const <dynamic>[];
      final parsed = <Map<String, dynamic>>[];
      for (final item in list) {
        if (item is Map<String, dynamic>) {
          parsed.add(Map<String, dynamic>.from(item));
        } else if (item is Map) {
          parsed.add(Map<String, dynamic>.from(item));
        }
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
        _avgFromPayload = n > 0 ? sum / n : 0;
        _countFromPayload = parsed.length;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString();
        _reviews = [];
      });
    }
  }

  double get _displayAvg {
    if (_avgFromPayload > 0) return _avgFromPayload;
    final h = widget.headerAvgRating;
    if (h != null && h > 0) return h;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final title = locale.t('dashboard.reviewsTitle');
    final dateFmt = DateFormat.yMMMd(locale.languageTag);

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: HenzoHeaderBackButton(
          onPressed: () => Navigator.pop(context),
        ),
        leadingWidth: 56,
        title: Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.primary500,
        child: _loading
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: 120),
                  Center(
                    child: CircularProgressIndicator(color: AppColors.primary500),
                  ),
                ],
              )
            : _error != null
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(24),
                    children: [
                      Text(
                        locale.t('dashboard.reviewsLoadError'),
                        style: const TextStyle(
                          color: AppColors.error600,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: _load,
                        child: Text(locale.t('dashboard.reviewsRetry')),
                      ),
                    ],
                  )
                : ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: _SummaryHeader(
                          avg: _displayAvg,
                          count: _countFromPayload,
                          subtitleTemplate:
                              locale.t('dashboard.reviewsSubtitle'),
                        ),
                      ),
                      const SizedBox(height: 14),
                      if (_reviews.isEmpty)
                        Padding(
                          padding: const EdgeInsets.all(32),
                          child: Center(
                            child: Text(
                              locale.t('dashboard.reviewsEmpty'),
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontSize: 15,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ),
                        )
                      else
                        ..._reviews.map((r) {
                          final rating =
                              (r['rating'] as num?)?.toDouble() ?? 0;
                          final comment =
                              (r['comment'] ?? '').toString().trim();
                          final user = r['user'];
                          final name = user is Map
                              ? (user['name'] ?? '').toString().trim()
                              : '';
                          final displayName = name.isNotEmpty ? name : '—';
                          final created = DateTime.tryParse(
                            (r['createdAt'] ?? '').toString(),
                          );
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: Container(
                              padding: const EdgeInsets.fromLTRB(
                                14,
                                12,
                                14,
                                12,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.backgroundPrimary,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: AppColors.borderPrimary,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          displayName,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                            fontSize: 15,
                                            color: AppColors.textPrimary,
                                          ),
                                        ),
                                      ),
                                      if (created != null)
                                        Text(
                                          dateFmt.format(created.toLocal()),
                                          style: const TextStyle(
                                            fontSize: 12,
                                            color: AppColors.textTertiary,
                                          ),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  _RatingStars(rating: rating),
                                  if (comment.isNotEmpty) ...[
                                    const SizedBox(height: 8),
                                    Text(
                                      comment,
                                      style: const TextStyle(
                                        fontSize: 14,
                                        height: 1.35,
                                        color: AppColors.textSecondary,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        }),
                    ],
                  ),
      ),
    );
  }
}

class _SummaryHeader extends StatelessWidget {
  const _SummaryHeader({
    required this.avg,
    required this.count,
    required this.subtitleTemplate,
  });

  final double avg;
  final int count;
  final String subtitleTemplate;

  @override
  Widget build(BuildContext context) {
    final ratingStr =
        avg > 0 ? avg.toStringAsFixed(1) : '—';
    final subtitle = subtitleTemplate
        .replaceAll('{rating}', ratingStr)
        .replaceAll('{count}', '$count');
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: AppColors.primary50,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.primary200),
      ),
      child: Row(
        children: [
          const Icon(Icons.star_rounded, color: Color(0xFFFFC940), size: 28),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              subtitle,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RatingStars extends StatelessWidget {
  const _RatingStars({required this.rating});

  final double rating;

  @override
  Widget build(BuildContext context) {
    final full = rating.clamp(0, 5).floor();
    final hasHalf = rating - full >= 0.5 && full < 5;
    return Row(
      children: [
        for (var i = 0; i < 5; i++)
          Icon(
            i < full
                ? Icons.star_rounded
                : (i == full && hasHalf)
                    ? Icons.star_half_rounded
                    : Icons.star_border_rounded,
            size: 18,
            color: i < full || (i == full && hasHalf)
                ? const Color(0xFFFFC940)
                : AppColors.neutral300,
          ),
      ],
    );
  }
}
