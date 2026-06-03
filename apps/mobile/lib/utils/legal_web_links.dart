import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/app_config.dart';
import '../l10n/locale_provider.dart';

/// Opens a legal page on henzo.app for the current app locale.
Future<bool> openLegalWebPage(
  BuildContext context,
  LocaleProvider locale,
  String path,
) async {
  final normalized = path.startsWith('/') ? path : '/$path';
  final uri = Uri.parse(
    '${AppConfig.webUrl}/${locale.languageTag}$normalized',
  );
  if (!await canLaunchUrl(uri)) return false;
  return launchUrl(uri, mode: LaunchMode.externalApplication);
}
