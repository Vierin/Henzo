import '../config/app_config.dart';

/// HTTPS share URL for a studio (`https://www.henzo.app/studio/{id}`).
String studioShareUrl({required String id, String? studioName}) {
  final base = AppConfig.webUrl;
  final segment = id.trim();
  final uri = Uri.parse('$base/studio/${Uri.encodeComponent(segment)}');
  final name = studioName?.trim();
  if (name != null && name.isNotEmpty) {
    return uri.replace(queryParameters: {'name': name}).toString();
  }
  return uri.toString();
}

String buildStudioShareMessage({
  required String Function(String key) tr,
  required String inviterName,
  required String studioName,
  required String link,
}) {
  final inviteLine = tr('clientStudioDetail.shareInvite')
      .replaceAll('{name}', inviterName)
      .replaceAll('{studio}', studioName);

  final buf = StringBuffer()..writeln(inviteLine);
  buf
    ..writeln()
    ..writeln('🔗 ${tr('clientClassDetail.shareJoinMe')}')
    ..writeln(link);
  return buf.toString();
}
