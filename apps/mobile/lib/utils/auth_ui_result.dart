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
  if (result.errorRaw != null && result.errorRaw!.isNotEmpty) {
    return result.errorRaw!;
  }
  return locale.t(fallbackKey);
}
