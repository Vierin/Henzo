import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../screens/owner_edit_training_session_screen.dart';
import '../screens/services_screen.dart';
import '../services/cache/owner_sessions_cache.dart';
import '../services/dashboard_api_service.dart';
import '../widgets/training/owner_session_edit_scope_dialog.dart';
import 'owner_session_refresh.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Opens scope picker, then pushes [OwnerEditTrainingSessionScreen] on the
/// same [Navigator] as [context] (must be the session detail route).
Future<OwnerTrainingSession?> openOwnerEditTrainingSessionFlow(
  BuildContext context,
  OwnerTrainingSession session,
) async {
  if (session.sessionId.isEmpty) return null;
  final scope = await showOwnerSessionEditScopeDialog(context);
  if (!context.mounted || scope == null) return null;
  if (scope == OwnerSessionEditScope.thisAndFollowing) {
    final result = await openEditTrainingFromOwnerSession(context, session);
    if (!context.mounted || result == null) return null;
    final merged = mergeOwnerSessionWithTraining(
      session: session,
      training: result.training,
      categories: result.categories,
    );
    context.read<OwnerSessionsCache>().invalidate();
    return merged;
  }
  return pushOwnerEditTrainingSession(context, session, scope);
}

Future<OwnerTrainingSession?> pushOwnerEditTrainingSession(
  BuildContext context,
  OwnerTrainingSession session,
  OwnerSessionEditScope scope,
) {
  final args = <String, dynamic>{...session.toRouteArgs()};
  return Navigator.of(context).push<OwnerTrainingSession>(
    MaterialPageRoute<OwnerTrainingSession>(
      builder: (_) => const OwnerEditTrainingSessionScreen(),
      settings: RouteSettings(arguments: args),
    ),
  );
}
