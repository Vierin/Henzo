import 'package:flutter/foundation.dart';

import '../../models/training_category_option.dart';
import '../api_client.dart';

/// App-wide cache for /trainings/categories (public, no auth needed).
///
/// TTL = 10 min. Deduplicates in-flight requests — concurrent callers
/// all await the same Future and get the same result.
///
/// Register as [ChangeNotifierProvider] in main.dart, then use:
///   context.read<TrainingCategoriesCache>().getCategories()
class TrainingCategoriesCache extends ChangeNotifier {
  static const _ttl = Duration(minutes: 10);

  List<TrainingCategoryOption> _categories = const [];
  DateTime? _fetchedAt;
  Future<List<TrainingCategoryOption>>? _inFlight;

  /// Cached categories if already loaded, otherwise empty list.
  List<TrainingCategoryOption> get categories => _categories;

  bool get _isStale =>
      _fetchedAt == null ||
      DateTime.now().difference(_fetchedAt!) > _ttl;

  /// Returns categories from cache if fresh; fetches otherwise.
  /// Concurrent calls share one in-flight request.
  Future<List<TrainingCategoryOption>> getCategories() async {
    if (_categories.isNotEmpty && !_isStale) return _categories;
    _inFlight ??= _fetch().whenComplete(() => _inFlight = null);
    return _inFlight!;
  }

  Future<List<TrainingCategoryOption>> _fetch() async {
    try {
      final raw = await ApiClient.get('/trainings/categories', null);
      final list = TrainingCategoryOption.listFromApiResponse(raw);
      final sorted = TrainingCategoryOption.withOtherLast(list);
      _categories = sorted;
      _fetchedAt = DateTime.now();
      notifyListeners();
      return sorted;
    } catch (e) {
      if (kDebugMode) debugPrint('[TrainingCategoriesCache] fetch failed: $e');
      return _categories; // return stale data on error
    }
  }

  void invalidate() {
    _categories = const [];
    _fetchedAt = null;
    notifyListeners();
  }
}
