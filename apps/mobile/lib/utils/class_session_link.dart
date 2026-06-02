import '../config/app_config.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Deep link + share text for a public class session.
class ClassSessionLink {
  const ClassSessionLink({
    required this.studioId,
    required this.sessionId,
    required this.startsAt,
  });

  final String studioId;
  final String sessionId;
  final DateTime startsAt;

  static const String scheme = 'henzo';
  static const String host = 'class';

  Map<String, String> get _queryParameters => <String, String>{
    'studioId': studioId,
    'sessionId': sessionId,
    'startsAt': startsAt.toUtc().toIso8601String(),
  };

  /// In-app deep link (`henzo://class?...`).
  Uri toUri() => Uri(
    scheme: scheme,
    host: host,
    queryParameters: _queryParameters,
  );

  /// HTTPS link for share sheets (auto-linkified in messengers).
  Uri toShareUri() {
    final base = Uri.parse(AppConfig.webUrl);
    return base.replace(
      path: '/class',
      queryParameters: _queryParameters,
    );
  }

  static ClassSessionLink? tryParse(Uri uri) {
    final isAppScheme = uri.scheme == scheme && uri.host == host;
    final isWebClass = uri.scheme == 'https' &&
        (uri.host == 'henzo.app' || uri.host.endsWith('.henzo.app')) &&
        uri.path.replaceAll(RegExp(r'/+$'), '') == '/class';
    if (!isAppScheme && !isWebClass) return null;
    return _fromQuery(uri.queryParameters);
  }

  static ClassSessionLink? _fromQuery(Map<String, String> params) {
    final studioId = params['studioId']?.trim() ?? '';
    final sessionId = params['sessionId']?.trim() ?? '';
    final startsRaw = params['startsAt']?.trim() ?? '';
    if (studioId.isEmpty || sessionId.isEmpty || startsRaw.isEmpty) {
      return null;
    }
    final startsAt = DateTime.tryParse(startsRaw);
    if (startsAt == null) return null;
    return ClassSessionLink(
      studioId: studioId,
      sessionId: sessionId,
      startsAt: startsAt,
    );
  }
}

String buildClassSessionShareMessage({
  required String Function(String key) tr,
  required String inviterName,
  required String trainingName,
  required String? trainerName,
  required String dateTimeLine,
  required String addressLine,
  required Uri link,
}) {
  final trainer = trainerName?.trim() ?? '';
  final inviteLine = trainer.isNotEmpty
      ? tr('clientClassDetail.shareInviteWithTrainer')
            .replaceAll('{name}', inviterName)
            .replaceAll('{training}', trainingName)
            .replaceAll('{trainer}', trainer)
      : tr('clientClassDetail.shareInvite')
            .replaceAll('{name}', inviterName)
            .replaceAll('{training}', trainingName);

  final buf = StringBuffer()..writeln(inviteLine);
  if (dateTimeLine.trim().isNotEmpty) {
    buf.writeln(dateTimeLine.trim());
  }
  if (addressLine.trim().isNotEmpty) {
    buf.writeln(addressLine.trim());
  }
  buf
    ..writeln()
    ..writeln(tr('clientClassDetail.shareJoinMe'))
    ..writeln(link.toString());
  return buf.toString();
}

String resolveShareInviterName({
  required String? userName,
  required String? userEmail,
  required String Function(String key) tr,
}) {
  final name = userName?.trim();
  if (name != null && name.isNotEmpty) return name;
  final email = userEmail?.trim();
  if (email != null && email.contains('@')) {
    return email.split('@').first;
  }
  return tr('clientClassDetail.shareSomeone');
}
