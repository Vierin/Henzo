/// Localized form field validators shared across screens and sheets.
typedef FormTr = String Function(String key);

bool isValidEmail(String raw) {
  final s = raw.trim();
  return RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(s);
}

String requiredFieldHint(FormTr tr, String labelKey) => '${tr(labelKey)} *';

String? validateRequired(
  FormTr tr,
  String raw, {
  String emptyKey = 'settings.requiredField',
  bool trim = true,
}) {
  final value = trim ? raw.trim() : raw;
  if (value.isEmpty) return tr(emptyKey);
  return null;
}

String? validateRequiredNullable(
  FormTr tr,
  String? raw, {
  String emptyKey = 'settings.requiredField',
  bool trim = true,
}) =>
    validateRequired(tr, raw ?? '', emptyKey: emptyKey, trim: trim);

String? validateEmail(
  FormTr tr,
  String raw, {
  String emptyKey = 'auth.enterEmail',
  String invalidKey = 'auth.invalidEmail',
}) {
  final s = raw.trim();
  if (s.isEmpty) return tr(emptyKey);
  if (!isValidEmail(s)) return tr(invalidKey);
  return null;
}

String? validateEmailNullable(
  FormTr tr,
  String? raw, {
  String emptyKey = 'auth.enterEmail',
  String invalidKey = 'auth.invalidEmail',
}) =>
    validateEmail(tr, raw ?? '', emptyKey: emptyKey, invalidKey: invalidKey);

String? validatePassword(
  FormTr tr,
  String raw, {
  String emptyKey = 'auth.enterPassword',
  String minKey = 'auth.passwordMin',
  int minLength = 6,
}) {
  if (raw.isEmpty) return tr(emptyKey);
  if (raw.length < minLength) return tr(minKey);
  return null;
}

String? validatePasswordNullable(
  FormTr tr,
  String? raw, {
  String emptyKey = 'auth.enterPassword',
  String minKey = 'auth.passwordMin',
  int minLength = 6,
}) =>
    validatePassword(
      tr,
      raw ?? '',
      emptyKey: emptyKey,
      minKey: minKey,
      minLength: minLength,
    );
