import 'package:flutter/foundation.dart';

import '../dashboard_api_service.dart';

/// Shared in-memory range of owner training sessions for Dashboard + Calendar.
///
/// Expands the cached UTC range when a request falls outside it, then serves
/// subsets without extra network calls until [invalidate].
class OwnerSessionsCache extends ChangeNotifier {
  List<OwnerTrainingSession> _sessions = const [];
  DateTime? _fromUtc;
  DateTime? _toUtc;

  /// Set by [invalidate]; cleared when [getSessions] finishes a fetch.
  bool _needsRefresh = false;

  bool get needsRefresh => _needsRefresh;

  void invalidate() {
    _sessions = const [];
    _fromUtc = null;
    _toUtc = null;
    _needsRefresh = true;
    notifyListeners();
  }

  /// Drops cached slots for a deleted training (instant UI before refetch).
  void removeByTrainingId(String trainingId) {
    final id = trainingId.trim();
    if (id.isEmpty) return;
    _sessions = _sessions.where((s) => s.trainingId != id).toList();
    _needsRefresh = true;
    notifyListeners();
  }

  bool _covers(DateTime fromUtc, DateTime toUtc) {
    if (_fromUtc == null || _toUtc == null) return false;
    return !_fromUtc!.isAfter(fromUtc) && !_toUtc!.isBefore(toUtc);
  }

  List<OwnerTrainingSession> _inRange(
    List<OwnerTrainingSession> list,
    DateTime fromUtc,
    DateTime toUtc,
  ) {
    return list.where((s) {
      final u = s.startsAt.toUtc();
      return !u.isBefore(fromUtc) && !u.isAfter(toUtc);
    }).toList();
  }

  /// Returns sessions with [startsAt] in [[fromUtc], [toUtc]] (UTC inclusive).
  Future<List<OwnerTrainingSession>> getSessions(
    String token, {
    required DateTime fromUtc,
    required DateTime toUtc,
  }) async {
    if (_sessions.isNotEmpty && _covers(fromUtc, toUtc)) {
      return _inRange(_sessions, fromUtc, toUtc);
    }

    final DateTime fetchFrom;
    final DateTime fetchTo;
    if (_fromUtc == null || _toUtc == null) {
      fetchFrom = fromUtc;
      fetchTo = toUtc;
    } else {
      fetchFrom = fromUtc.isBefore(_fromUtc!) ? fromUtc : _fromUtc!;
      fetchTo = toUtc.isAfter(_toUtc!) ? toUtc : _toUtc!;
    }

    final list = await DashboardApiService.getOwnerTrainingSessions(
      token,
      fromIso: fetchFrom.toIso8601String(),
      toIso: fetchTo.toIso8601String(),
    );
    _sessions = list;
    _fromUtc = fetchFrom;
    _toUtc = fetchTo;
    _needsRefresh = false;
    return _inRange(list, fromUtc, toUtc);
  }
}
