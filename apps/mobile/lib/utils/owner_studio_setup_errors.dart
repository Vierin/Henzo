import '../services/api_client.dart';

/// Owner signed in but has not created a studio yet — not a user-facing error.
bool isOwnerStudioNotReadyError(dynamic e) {
  final msg = (e is ApiException
          ? e.message
          : e?.toString() ?? '')
      .toLowerCase();
  return msg.contains('studio not found') ||
      msg.contains('no studio found') ||
      msg.contains('salon not found');
}
