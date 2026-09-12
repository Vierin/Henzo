import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

const studioCurrencies = ['EUR', 'PLN', 'USD', 'VND'];

class StudioCurrencyOption {
  final String code;
  final String symbol;
  final String name;
  final String label;

  const StudioCurrencyOption({
    required this.code,
    required this.symbol,
    required this.name,
    required this.label,
  });
}

const studioCurrencyOptions = [
  StudioCurrencyOption(
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    label: '€  Euro (EUR)',
  ),
  StudioCurrencyOption(
    code: 'PLN',
    symbol: 'zł',
    name: 'Polish zloty',
    label: 'zł  Polish zloty (PLN)',
  ),
  StudioCurrencyOption(
    code: 'USD',
    symbol: '\$',
    name: 'US dollar',
    label: '\$  US dollar (USD)',
  ),
  StudioCurrencyOption(
    code: 'VND',
    symbol: '₫',
    name: 'Vietnamese dong',
    label: '₫  Vietnamese dong (VND)',
  ),
];

bool isStudioCurrency(Object? value) {
  if (value is! String) return false;
  return studioCurrencies.contains(value.trim().toUpperCase());
}

String parseStudioCurrency(Object? raw) {
  final c = (raw ?? '').toString().trim().toUpperCase();
  return isStudioCurrency(c) ? c : 'EUR';
}

String defaultCurrencyForLocale(String? localeCode) {
  final loc = (localeCode ?? '').trim().toLowerCase();
  if (loc == 'pl') return 'PLN';
  if (loc == 'vi') return 'VND';
  return 'EUR';
}

String currencySymbol(String? currency) {
  final c = parseStudioCurrency(currency);
  switch (c) {
    case 'EUR':
      return '€';
    case 'PLN':
      return 'zł';
    case 'USD':
      return '\$';
    case 'VND':
      return '₫';
    default:
      return c;
  }
}

String currencyInputPlaceholder(String? currency) {
  final c = parseStudioCurrency(currency);
  return c == 'VND' ? '150.000' : '22.99';
}

TextInputType currencyKeyboardType(String? currency) {
  final c = parseStudioCurrency(currency);
  return c == 'VND'
      ? TextInputType.number
      : const TextInputType.numberWithOptions(decimal: true);
}

/// VND thousands grouping formatter (e.g. 150000 -> 150.000)
class VndThousandsFormatter extends TextInputFormatter {
  const VndThousandsFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = newValue.text.replaceAll(RegExp(r'[^\d]'), '');
    if (digits.isEmpty) return const TextEditingValue(text: '');
    final number = int.tryParse(digits);
    if (number == null) return oldValue;
    final formatted = formatVndThousandsDots(number);
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}

/// Decimal price formatter for EUR, PLN, USD (digits + max 1 dot/comma + max 2 decimals)
class DecimalPriceInputFormatter extends TextInputFormatter {
  const DecimalPriceInputFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    var text = newValue.text.replaceAll(',', '.');
    text = text.replaceAll(RegExp(r'[^\d.]'), '');
    final parts = text.split('.');
    if (parts.length > 2) {
      text = '${parts[0]}.${parts.sublist(1).join('')}';
    }
    final dotIndex = text.indexOf('.');
    if (dotIndex != -1 && text.length - dotIndex - 1 > 2) {
      text = text.substring(0, dotIndex + 3);
    }
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}

TextInputFormatter currencyInputFormatter(String? currency) {
  final c = parseStudioCurrency(currency);
  return c == 'VND'
      ? const VndThousandsFormatter()
      : const DecimalPriceInputFormatter();
}

String formatVndThousandsDots(num value) {
  final digits = value.round().abs().toString();
  final out = StringBuffer();
  for (int i = 0; i < digits.length; i++) {
    out.write(digits[i]);
    final left = digits.length - i - 1;
    if (left > 0 && left % 3 == 0) out.write('.');
  }
  return out.toString();
}

double parsePriceInput(String? raw, [String? currency]) {
  if (raw == null) return 0;
  final c = parseStudioCurrency(currency);
  if (c == 'VND') {
    final digits = raw.replaceAll(RegExp(r'[^\d]'), '');
    if (digits.isEmpty) return 0;
    return (double.tryParse(digits) ?? 0).roundToDouble();
  }
  final cleaned = raw.replaceAll(RegExp(r'[^\d.,]'), '').replaceAll(',', '.');
  if (cleaned.isEmpty) return 0;
  final n = double.tryParse(cleaned);
  return (n != null && n.isFinite) ? n : 0;
}

String formatPriceInput(num? price, [String? currency]) {
  if (price == null || price <= 0) return '';
  final c = parseStudioCurrency(currency);
  if (c == 'VND') {
    return formatVndThousandsDots(price.round());
  }
  if (price % 1 == 0) {
    return price.toInt().toString();
  }
  return price.toStringAsFixed(2);
}

/// Formats amount with its currency symbol (e.g. 150.000 ₫, 25 €, 25 zł, $25).
String formatMoney(num? amount, [String? currency]) {
  if (amount == null || amount.isNaN) return '—';
  final c = parseStudioCurrency(currency);
  if (c == 'VND') {
    return '${formatVndThousandsDots(amount.round())} ₫';
  }
  final isWhole = amount % 1 == 0;
  final valStr = isWhole
      ? NumberFormat('#,##0', 'en_US').format(amount.toInt()).replaceAll(',', ' ')
      : NumberFormat('#,##0.00', 'en_US').format(amount).replaceAll(',', ' ');
  switch (c) {
    case 'EUR':
      return '$valStr €';
    case 'PLN':
      return '$valStr zł';
    case 'USD':
      return '\$$valStr';
    default:
      return '$valStr $c';
  }
}

/// For ticket cards: returns (primaryValue, mutedSuffix)
(String, String?) formatMoneyParts(num? amount, [String? currency]) {
  if (amount == null || amount.isNaN || amount <= 0) return ('0', null);
  final c = parseStudioCurrency(currency);
  if (c == 'VND') {
    return (formatVndThousandsDots(amount.round()), ' VND');
  }
  final isWhole = amount % 1 == 0;
  final valStr = isWhole ? amount.toInt().toString() : amount.toStringAsFixed(2);
  switch (c) {
    case 'EUR':
      return (valStr, ' €');
    case 'PLN':
      return (valStr, ' zł');
    case 'USD':
      return ('\$$valStr', null);
    default:
      return (valStr, ' $c');
  }
}

/// Compact amount for graphs/charts (1k, 1M).
String formatCompactAmount(double? value) {
  if (value == null || value.isNaN) return '—';
  final v = value.abs();
  if (v >= 1000000) {
    final n = v / 1000000;
    final s =
        n == n.truncateToDouble() ? n.toStringAsFixed(0) : n.toStringAsFixed(1);
    return '${s}M';
  }
  if (v >= 1000) {
    final n = v / 1000;
    final s =
        n == n.truncateToDouble() ? n.toStringAsFixed(0) : n.toStringAsFixed(1);
    return '${s}k';
  }
  return v == v.truncateToDouble() ? v.toStringAsFixed(0) : v.toStringAsFixed(1);
}

/// Back-compat for VND-specific format.
String formatVndAmount(double? value) => formatCompactAmount(value);

String formatVnd(double? value) {
  if (value == null || value.isNaN) return '—';
  return '${formatVndThousandsDots(value.round())} ₫';
}
