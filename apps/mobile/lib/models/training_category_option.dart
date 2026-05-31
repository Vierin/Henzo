import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Row from GET /trainings/categories (TrainingCategory).
class TrainingCategoryOption {
  const TrainingCategoryOption({
    required this.id,
    required this.nameEn,
    required this.nameRu,
    required this.nameVn,
    required this.chipBgHex,
    this.chipFgHex,
  });

  final int id;
  final String nameEn;
  final String nameRu;
  final String nameVn;
  final String chipBgHex;
  final String? chipFgHex;

  bool get isOtherCategory => nameEn.trim().toLowerCase() == 'other';

  /// Puts the «Other» category last (matches category picker sheet).
  static List<TrainingCategoryOption> withOtherLast(
    List<TrainingCategoryOption> list,
  ) {
    final rest = <TrainingCategoryOption>[];
    final other = <TrainingCategoryOption>[];
    for (final c in list) {
      if (c.isOtherCategory) {
        other.add(c);
      } else {
        rest.add(c);
      }
    }
    return [...rest, ...other];
  }

  String label(String localeCode) {
    switch (localeCode) {
      case 'vi':
        return nameVn.isNotEmpty ? nameVn : nameEn;
      case 'ru':
        return nameRu.isNotEmpty ? nameRu : nameEn;
      default:
        return nameEn.isNotEmpty ? nameEn : nameRu;
    }
  }

  Color backgroundColor([Color fallback = const Color(0xFF6B7280)]) =>
      _parseHex(chipBgHex, fallback);

  Color foregroundColorOn(Color background) {
    final raw = chipFgHex;
    if (raw != null && raw.trim().isNotEmpty) {
      return _parseHex(raw, _contrastLabelOn(background));
    }
    return _contrastLabelOn(background);
  }

  factory TrainingCategoryOption.fromJson(Map<String, dynamic> json) {
    return TrainingCategoryOption(
      id: (json['id'] as num).toInt(),
      nameEn: (json['name_en'] ?? json['nameEn'] ?? '').toString(),
      nameRu: (json['name_ru'] ?? json['nameRu'] ?? '').toString(),
      nameVn: (json['name_vn'] ?? json['nameVn'] ?? '').toString(),
      chipBgHex: (json['chip_bg_hex'] ?? json['chipBgHex'] ?? '#6B7280')
          .toString(),
      chipFgHex: json['chip_fg_hex']?.toString() ?? json['chipFgHex']?.toString(),
    );
  }

  /// Parses GET /trainings/categories (list or `{ data: [...] }`).
  static List<TrainingCategoryOption> listFromApiResponse(dynamic raw) {
    final items = raw is List
        ? raw
        : (raw is Map && raw['data'] is List
              ? raw['data'] as List
              : <dynamic>[]);
    final out = <TrainingCategoryOption>[];
    for (final item in items) {
      if (item is! Map) continue;
      try {
        out.add(
          TrainingCategoryOption.fromJson(Map<String, dynamic>.from(item)),
        );
      } catch (_) {}
    }
    return withOtherLast(out);
  }

  static Color _parseHex(String? raw, Color fallback) {
    if (raw == null || raw.isEmpty) return fallback;
    var s = raw.trim().replaceFirst('#', '');
    if (s.length == 6) {
      s = 'FF$s';
    }
    if (s.length != 8) return fallback;
    final v = int.tryParse(s, radix: 16);
    if (v == null) return fallback;
    return Color(v);
  }

  /// Picks a readable label color on [bg].
  static Color _contrastLabelOn(Color bg) =>
      bg.computeLuminance() > 0.55 ? const Color(0xFF171717) : Colors.white;
}
