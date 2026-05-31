import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/service_item.dart';
import '../models/training_category_option.dart';
import '../services/auth_service.dart';
import '../services/cache/owner_sessions_cache.dart';
import '../services/dashboard_api_service.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Merges template fields from [training] into a session row (category, color).
OwnerTrainingSession mergeOwnerSessionWithTraining({
  required OwnerTrainingSession session,
  required ServiceItem training,
  List<TrainingCategoryOption> categories = const [],
}) {
  TrainingCategoryOption? cat;
  final cid = training.trainingCategoryId;
  if (cid != null) {
    for (final c in categories) {
      if (c.id == cid) {
        cat = c;
        break;
      }
    }
  }
  final fallbackCat = training.categoryName?.trim();
  final chipHex = cat?.chipBgHex.trim();
  final displayHex = chipHex != null && chipHex.isNotEmpty
      ? (chipHex.startsWith('#') ? chipHex : '#$chipHex')
      : training.displayColor;
  return session.copyWith(
    trainingName: training.displayName,
    trainingPrice: training.price,
    trainingDurationMinutes: training.duration,
    trainingDisplayColorHex: displayHex,
    trainingCategoryNameEn: cat?.nameEn ?? fallbackCat,
    trainingCategoryNameRu: cat?.nameRu ?? fallbackCat,
    trainingCategoryNameVn: cat?.nameVn ?? fallbackCat,
  );
}

/// Reloads one session from API after [OwnerSessionsCache.invalidate].
Future<OwnerTrainingSession?> refetchOwnerSession(
  BuildContext context,
  OwnerTrainingSession session,
) async {
  final token = context.read<AuthService>().accessToken;
  if (token == null || token.isEmpty) return null;

  final anchor = session.startsAt.toUtc();
  final list = await context.read<OwnerSessionsCache>().getSessions(
    token,
    fromUtc: anchor.subtract(const Duration(days: 1)),
    toUtc: anchor.add(const Duration(days: 1)),
  );
  for (final s in list) {
    if (s.sessionId == session.sessionId) return s;
  }
  return null;
}
