import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';

/// Вызовы Mapbox через бэкенд (GET /mapbox/...).
class MapboxApiService {
  static String get _baseUrl => AppConfig.apiUrl;

  /// GET /mapbox/autocomplete?q= — подсказки адресов.
  ///
  /// Pass [country] as ISO code to bias (default `VN` for studio addresses).
  /// Use `all` for worldwide city search.
  static Future<List<AddressSuggestion>> getAutocomplete(
    String query, {
    String country = 'VN',
    int limit = 5,
    List<String>? types,
  }) async {
    if (query.trim().length < 2) return [];
    final typesParam = types != null && types.isNotEmpty
        ? '&types=${types.map(Uri.encodeQueryComponent).join(',')}'
        : '';
    final url = Uri.parse(
      '$_baseUrl/mapbox/autocomplete?q=${Uri.encodeQueryComponent(query.trim())}'
      '&country=${Uri.encodeQueryComponent(country)}&limit=$limit$typesParam',
    );
    try {
      final response = await http.get(url);
      if (kDebugMode) {
        debugPrint('[MapboxAPI] GET autocomplete status=${response.statusCode}');
      }
      if (response.statusCode != 200) return [];
      final list = json.decode(response.body);
      if (list is! List) return [];
      final result = <AddressSuggestion>[];
      for (final item in list) {
        if (item is Map<String, dynamic>) {
          final m = Map<String, dynamic>.from(item);
          final id = m['id']?.toString() ?? '';
          final address = m['address'] as String? ?? '';
          final lat = (m['lat'] is num) ? (m['lat'] as num).toDouble() : 0.0;
          final lon = (m['lon'] is num) ? (m['lon'] as num).toDouble() : 0.0;
          final rawCountry = m['country']?.toString().trim().toUpperCase();
          final countryCode =
              (rawCountry != null && rawCountry.length >= 2)
                  ? rawCountry.substring(0, 2)
                  : null;
          if (address.isNotEmpty) {
            result.add(
              AddressSuggestion(
                id: id,
                address: address,
                city: m['city'] as String?,
                country: countryCode,
                lat: lat,
                lon: lon,
              ),
            );
          }
        }
      }
      return result;
    } catch (e) {
      if (kDebugMode) debugPrint('[MapboxAPI] autocomplete error: $e');
      return [];
    }
  }

  /// GET /mapbox/reverse-geocode?lat=&lon= — адрес по координатам.
  static Future<ReverseGeocodeResult?> reverseGeocode(
    double lat,
    double lon,
  ) async {
    final url = Uri.parse('$_baseUrl/mapbox/reverse-geocode?lat=$lat&lon=$lon');
    try {
      final response = await http
          .get(url)
          .timeout(const Duration(seconds: 15));
      if (kDebugMode) {
        debugPrint(
          '[MapboxAPI] GET reverse-geocode status=${response.statusCode}',
        );
      }
      if (response.statusCode != 200) return null;
      final data = json.decode(response.body);
      if (data is! Map<String, dynamic>) return null;
      final m = Map<String, dynamic>.from(data);
      final address = m['address'] as String? ?? '';
      final latRes = (m['lat'] is num) ? (m['lat'] as num).toDouble() : lat;
      final lonRes = (m['lon'] is num) ? (m['lon'] as num).toDouble() : lon;
      final rawCountry = (m['country_code'] ?? m['country'])
          ?.toString()
          .trim()
          .toUpperCase();
      final countryCode =
          (rawCountry != null && rawCountry.length >= 2)
              ? rawCountry.substring(0, 2)
              : null;
      return ReverseGeocodeResult(
        address: address,
        lat: latRes,
        lon: lonRes,
        country: countryCode,
      );
    } catch (e) {
      if (kDebugMode) debugPrint('[MapboxAPI] reverse-geocode error: $e');
      return null;
    }
  }

  /// City / town suggestions only (Mapbox `place` type), worldwide.
  static Future<List<AddressSuggestion>> getCityAutocomplete(
    String query, {
    int limit = 8,
  }) =>
      getAutocomplete(
        query,
        country: 'all',
        limit: limit,
        types: const ['place'],
      );
}

class AddressSuggestion {
  final String id;
  final String address;
  final String? city;
  final String? country;
  final double lat;
  final double lon;

  AddressSuggestion({
    required this.id,
    required this.address,
    this.city,
    this.country,
    required this.lat,
    required this.lon,
  });

  String get displayCity {
    final c = city?.trim();
    if (c != null && c.isNotEmpty) return c;
    final parts = address
        .split(',')
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();
    if (parts.length >= 2) return parts[parts.length - 2];
    return parts.isEmpty ? address : parts.first;
  }

  String get displayLabel {
    final cityLabel = displayCity;
    final c = country?.trim();
    if (c != null && c.isNotEmpty) return '$cityLabel, $c';
    return cityLabel;
  }
}

class ReverseGeocodeResult {
  final String address;
  final double lat;
  final double lon;
  final String? country;

  ReverseGeocodeResult({
    required this.address,
    required this.lat,
    required this.lon,
    this.country,
  });
}
