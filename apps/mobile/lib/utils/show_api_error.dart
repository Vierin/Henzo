import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../l10n/locale_provider.dart';
import '../services/api_client.dart';
import 'load_error_message.dart';

/// Shows a SnackBar with the error message. Handles [ApiException] and generic [Exception].
void showApiError(BuildContext context, dynamic e, {Color? backgroundColor}) {
  if (!context.mounted) return;
  final locale = context.read<LocaleProvider>();
  final message = loadErrorMessage(locale, e);
  ScaffoldMessenger.maybeOf(context)?.showSnackBar(
    SnackBar(
      content: Text(message),
      backgroundColor: backgroundColor ?? Colors.red.shade700,
    ),
  );
}

/// Shows a success SnackBar.
void showSuccess(
  BuildContext context,
  String message, {
  Color? backgroundColor,
}) {
  if (!context.mounted) return;
  ScaffoldMessenger.maybeOf(context)?.showSnackBar(
    SnackBar(
      content: Text(message),
      backgroundColor: backgroundColor ?? Colors.green.shade700,
    ),
  );
}
