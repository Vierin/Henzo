import '../config/app_config.dart';

/// HTTPS share URL for a studio (`https://www.henzo.app/studio/{slug|id}`).
String studioShareUrl({required String id, String? slug}) {
  final base = AppConfig.webUrl;
  final segment = (slug != null && slug.trim().isNotEmpty)
      ? slug.trim()
      : id.trim();
  return '$base/studio/$segment';
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
