import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/utils/color_hex.dart';

void main() {
  group('parseHexColor', () {
    test('parses #RRGGBB', () {
      final color = parseHexColor('#0EA5E9');
      expect(color, isA<Color>());
      expect(color!.toARGB32(), 0xFF0EA5E9);
    });

    test('parses RRGGBB without hash', () {
      final color = parseHexColor('A855F7');
      expect(color, isA<Color>());
      expect(color!.toARGB32(), 0xFFA855F7);
    });

    test('returns null for invalid input', () {
      expect(parseHexColor('bad-color'), isNull);
      expect(parseHexColor(null), isNull);
      expect(parseHexColor(''), isNull);
    });
  });
}
