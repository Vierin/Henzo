import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';

/// Thrown when API returns non-2xx. [message] is from body (msg/message) or status.
class ApiException implements Exception {
  ApiException(this.message, [this.statusCode]);

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

/// Shared HTTP client for backend API: base URL, Bearer auth, timeout, retries.
class ApiClient {
  ApiClient._();

  static String get _baseUrl => AppConfig.apiUrl;

  static const Duration _timeout = Duration(seconds: 25);
  static const int _maxRetries = 2;

  static Map<String, String> _headers(String? accessToken) {
    final map = <String, String>{'Content-Type': 'application/json'};
    if (accessToken != null && accessToken.isNotEmpty) {
      map['authorization'] = 'Bearer $accessToken';
    }
    return map;
  }

  static bool _isTransientStatus(int code) =>
      code == 502 || code == 503 || code == 504;

  static bool _isTransientError(Object e) {
    final s = e.toString();
    return s.contains('SocketException') ||
        s.contains('Connection reset') ||
        s.contains('HandshakeException') ||
        s.contains('ClientException');
  }

  /// Parse error message from response body (msg or message) or fallback to status.
  static String errorMessageFromResponse(http.Response response) {
    try {
      final body = json.decode(response.body);
      if (body is Map<String, dynamic>) {
        final msg = body['msg'] as String? ?? body['message'] as String?;
        if (msg != null && msg.isNotEmpty) return msg;
      }
    } catch (_) {}
    return 'HTTP ${response.statusCode}';
  }

  static void _throwIfNotSuccess(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) return;
    throw ApiException(errorMessageFromResponse(response), response.statusCode);
  }

  static Future<http.Response> _withRetry(
    Future<http.Response> Function() send, {
    required String debugLabel,
  }) async {
    Object? lastError;
    for (var attempt = 0; attempt <= _maxRetries; attempt++) {
      try {
        final response = await send().timeout(_timeout);
        if (_isTransientStatus(response.statusCode) &&
            attempt < _maxRetries) {
          await Future<void>.delayed(Duration(milliseconds: 300 * (attempt + 1)));
          if (kDebugMode) {
            debugPrint(
              '[ApiClient] $debugLabel retry ${attempt + 1} after ${response.statusCode}',
            );
          }
          continue;
        }
        return response;
      } on TimeoutException catch (e) {
        lastError = e;
        if (attempt < _maxRetries) {
          await Future<void>.delayed(Duration(milliseconds: 400 * (attempt + 1)));
          if (kDebugMode) {
            debugPrint('[ApiClient] $debugLabel retry ${attempt + 1} after timeout');
          }
          continue;
        }
        rethrow;
      } catch (e) {
        lastError = e;
        if (attempt < _maxRetries && _isTransientError(e)) {
          await Future<void>.delayed(Duration(milliseconds: 400 * (attempt + 1)));
          if (kDebugMode) {
            debugPrint('[ApiClient] $debugLabel retry ${attempt + 1} after $e');
          }
          continue;
        }
        rethrow;
      }
    }
    throw lastError ?? Exception('ApiClient: exhausted retries');
  }

  /// GET [path] (relative to base URL). Returns decoded JSON. Throws [ApiException] on non-2xx.
  static Future<dynamic> get(String path, String? accessToken) async {
    final url = Uri.parse('$_baseUrl$path');
    if (kDebugMode) debugPrint('[ApiClient] GET $path');
    final response = await _withRetry(
      () => http.get(url, headers: _headers(accessToken)),
      debugLabel: 'GET $path',
    );
    if (kDebugMode) {
      debugPrint('[ApiClient] GET $path status=${response.statusCode}');
    }
    _throwIfNotSuccess(response);
    if (response.body.isEmpty) return null;
    return json.decode(response.body);
  }

  /// POST [path] with optional [body]. Returns decoded JSON. Throws [ApiException] on non-2xx.
  static Future<dynamic> post(
    String path,
    String? accessToken, {
    Map<String, dynamic>? body,
  }) async {
    final url = Uri.parse('$_baseUrl$path');
    if (kDebugMode) debugPrint('[ApiClient] POST $path');
    final response = await _withRetry(
      () => http.post(
        url,
        headers: _headers(accessToken),
        body: body != null ? json.encode(body) : null,
      ),
      debugLabel: 'POST $path',
    );
    if (kDebugMode) {
      debugPrint('[ApiClient] POST $path status=${response.statusCode}');
    }
    _throwIfNotSuccess(response);
    if (response.body.isEmpty) return null;
    return json.decode(response.body);
  }

  /// PUT [path] with optional [body]. Returns decoded JSON. Throws [ApiException] on non-2xx.
  static Future<dynamic> put(
    String path,
    String? accessToken, {
    Map<String, dynamic>? body,
  }) async {
    final url = Uri.parse('$_baseUrl$path');
    if (kDebugMode) debugPrint('[ApiClient] PUT $path');
    final response = await _withRetry(
      () => http.put(
        url,
        headers: _headers(accessToken),
        body: body != null ? json.encode(body) : null,
      ),
      debugLabel: 'PUT $path',
    );
    if (kDebugMode) {
      debugPrint('[ApiClient] PUT $path status=${response.statusCode}');
    }
    _throwIfNotSuccess(response);
    if (response.body.isEmpty) return null;
    return json.decode(response.body);
  }

  /// DELETE [path]. Returns decoded JSON. Throws [ApiException] on non-2xx.
  static Future<dynamic> delete(String path, String? accessToken) async {
    final url = Uri.parse('$_baseUrl$path');
    if (kDebugMode) debugPrint('[ApiClient] DELETE $path');
    final response = await _withRetry(
      () => http.delete(url, headers: _headers(accessToken)),
      debugLabel: 'DELETE $path',
    );
    if (kDebugMode) {
      debugPrint('[ApiClient] DELETE $path status=${response.statusCode}');
    }
    _throwIfNotSuccess(response);
    if (response.body.isEmpty) return null;
    return json.decode(response.body);
  }
}
