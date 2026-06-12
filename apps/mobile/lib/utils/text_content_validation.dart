import 'package:flutter/services.dart';

/// Studio profile text limits (aligned with backend).
class StudioTextLimits {
  StudioTextLimits._();

  static const int locationNameMax = 60;
  static const int descriptionMax = 250;
}

class ClientTextLimits {
  ClientTextLimits._();

  static const int reviewCommentMax = 500;
}

final List<RegExp> _embeddedLinkPatterns = [
  RegExp(r'https?:\/\/', caseSensitive: false),
  RegExp(r'\bwww\.', caseSensitive: false),
  RegExp(r'\bt\.me\/', caseSensitive: false),
  RegExp(r'\btelegram\.me\/', caseSensitive: false),
  RegExp(
    r'\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.'
    r'(?:com|net|org|ru|vn|io|app|me|co|dev|xyz|info|biz|tv|cc|link|site|'
    r'online|store|shop|blog|page|pro|tech|space|world|click|top|work|live|'
    r'cloud|email|guru|digital|media|news|studio|fitness|health|today|one|ai|'
    r'ly|gg|tk|ml|ga|cf|pw|su|by|kz|ua|de|fr|uk|us|eu|asia|tel|mobi)\b',
    caseSensitive: false,
  ),
];

bool textContainsEmbeddedLink(String text) =>
    _embeddedLinkPatterns.any((pattern) => pattern.hasMatch(text));

/// Rejects pasted/typed URLs inside free-text fields.
class NoEmbeddedLinkTextInputFormatter extends TextInputFormatter {
  const NoEmbeddedLinkTextInputFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    if (textContainsEmbeddedLink(newValue.text)) return oldValue;
    return newValue;
  }
}
