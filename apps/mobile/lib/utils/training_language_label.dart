/// Human-readable training language label from API code.
String trainingLanguageLabel(String code) {
  switch (code.trim().toLowerCase()) {
    case 'en':
      return 'English';
    case 'ru':
      return 'Русский';
    case 'vi':
      return 'Tiếng Việt';
    default:
      return code.trim();
  }
}
