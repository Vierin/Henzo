import '../l10n/auth_error_keys.dart';
import '../l10n/locale_provider.dart';

/// Result of auth-related operations; use [errorL10nKey] when possible, else [errorRaw].
typedef AuthUiResult = ({
  bool success,
  String? errorL10nKey,
  String? errorRaw,
});

String resolveAuthUiMessage(
  LocaleProvider locale,
  AuthUiResult result, {
  String fallbackKey = 'auth.signInError',
}) {
  if (result.success) return '';
  if (result.errorL10nKey != null && result.errorL10nKey!.isNotEmpty) {
    return locale.t(result.errorL10nKey!);
  }
  final fromRaw = AuthErrorKeys.mapRawToL10nKey(result.errorRaw);
  if (fromRaw != null) {
    return locale.t(fromRaw);
  }
  return locale.t(fallbackKey);
}
