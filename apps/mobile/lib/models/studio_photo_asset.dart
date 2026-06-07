import 'package:flutter/material.dart';

class StudioPhotoCropRect {
  const StudioPhotoCropRect({
    required this.x,
    required this.y,
    required this.w,
    required this.h,
  });

  final double x;
  final double y;
  final double w;
  final double h;

  factory StudioPhotoCropRect.fromJson(Map<String, dynamic> json) {
    return StudioPhotoCropRect(
      x: _toDouble(json['x']),
      y: _toDouble(json['y']),
      w: _toDouble(json['w']),
      h: _toDouble(json['h']),
    );
  }

  Map<String, dynamic> toJson() => {
        'x': x,
        'y': y,
        'w': w,
        'h': h,
      };

  static double _toDouble(Object? value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  /// Normalized crop center → [Alignment] for [BoxFit.cover].
  Alignment get coverAlignment {
    final cx = (x + w / 2).clamp(0.0, 1.0);
    final cy = (y + h / 2).clamp(0.0, 1.0);
    return Alignment(cx * 2 - 1, cy * 2 - 1);
  }
}

class StudioPhotoCrops {
  const StudioPhotoCrops({
    required this.studioPage,
    required this.browseCard,
  });

  final StudioPhotoCropRect studioPage;
  final StudioPhotoCropRect browseCard;

  factory StudioPhotoCrops.fromJson(Map<String, dynamic> json) {
    final studioRaw = json['studioPage'];
    final cardRaw = json['browseCard'];
    return StudioPhotoCrops(
      studioPage: studioRaw is Map<String, dynamic>
          ? StudioPhotoCropRect.fromJson(studioRaw)
          : const StudioPhotoCropRect(x: 0, y: 0, w: 1, h: 1),
      browseCard: cardRaw is Map<String, dynamic>
          ? StudioPhotoCropRect.fromJson(cardRaw)
          : const StudioPhotoCropRect(x: 0, y: 0, w: 1, h: 1),
    );
  }

  Map<String, dynamic> toJson() => {
        'studioPage': studioPage.toJson(),
        'browseCard': browseCard.toJson(),
      };
}

class StudioPhotoAsset {
  const StudioPhotoAsset({
    required this.id,
    required this.originalUrl,
    required this.heroUrl,
    required this.cardUrl,
    required this.crops,
  });

  final String id;
  final String originalUrl;
  final String heroUrl;
  final String cardUrl;
  final StudioPhotoCrops crops;

  /// Legacy URL-only photo before gallery metadata existed.
  factory StudioPhotoAsset.legacy(String url) {
    final trimmed = url.trim();
    final id = 'legacy_${trimmed.hashCode.abs()}';
    const fullFrame = StudioPhotoCropRect(x: 0, y: 0, w: 1, h: 1);
    return StudioPhotoAsset(
      id: id,
      originalUrl: trimmed,
      heroUrl: trimmed,
      cardUrl: trimmed,
      crops: const StudioPhotoCrops(
        studioPage: fullFrame,
        browseCard: fullFrame,
      ),
    );
  }

  factory StudioPhotoAsset.fromJson(Map<String, dynamic> json) {
    final cropsRaw = json['crops'];
    return StudioPhotoAsset(
      id: (json['id'] ?? '').toString(),
      originalUrl: (json['originalUrl'] ?? '').toString(),
      heroUrl: (json['heroUrl'] ?? '').toString(),
      cardUrl: (json['cardUrl'] ?? '').toString(),
      crops: cropsRaw is Map<String, dynamic>
          ? StudioPhotoCrops.fromJson(cropsRaw)
          : const StudioPhotoCrops(
              studioPage: StudioPhotoCropRect(x: 0, y: 0, w: 1, h: 1),
              browseCard: StudioPhotoCropRect(x: 0, y: 0, w: 1, h: 1),
            ),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'originalUrl': originalUrl,
        'heroUrl': heroUrl,
        'cardUrl': cardUrl,
        'crops': crops.toJson(),
      };

  StudioPhotoAsset copyWith({
    String? originalUrl,
    String? heroUrl,
    String? cardUrl,
    StudioPhotoCrops? crops,
  }) {
    return StudioPhotoAsset(
      id: id,
      originalUrl: originalUrl ?? this.originalUrl,
      heroUrl: heroUrl ?? this.heroUrl,
      cardUrl: cardUrl ?? this.cardUrl,
      crops: crops ?? this.crops,
    );
  }

  static List<StudioPhotoAsset> listFromJson(Object? raw) {
    if (raw is! List) return <StudioPhotoAsset>[];
    return raw
        .whereType<Map>()
        .map((item) => StudioPhotoAsset.fromJson(Map<String, dynamic>.from(item)))
        .where(
          (asset) =>
              asset.id.isNotEmpty &&
              asset.originalUrl.isNotEmpty &&
              asset.heroUrl.isNotEmpty &&
              asset.cardUrl.isNotEmpty,
        )
        .toList();
  }
}
