import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
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
  static final Random _rng = Random.secure();

  /// Короткий request id для корреляции client <-> backend логов.
  static String _newRequestId() {
    final bytes = List<int>.generate(8, (_) => _rng.nextInt(256));
    return bytes
        .map((b) => b.toRadixString(16).padLeft(2, '0'))
        .join();
  }

  static bool get _crashlyticsReady => Firebase.apps.isNotEmpty;

  static Map<String, String> _headers(String? accessToken, String requestId) {
    final map = <String, String>{
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
    };
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
        String? msg;
        final rawMsg = body['msg'] ?? body['message'];
        if (rawMsg is String) {
          msg = rawMsg;
        } else if (rawMsg is Map<String, dynamic>) {
          final nestedMessage = rawMsg['message'];
          if (nestedMessage is String && nestedMessage.isNotEmpty) {
            msg = nestedMessage;
          }
          final missing = rawMsg['missingRequiredSteps'];
          if (missing is List && missing.isNotEmpty) {
            final list = missing
                .whereType<String>()
                .where((item) => item.trim().isNotEmpty)
                .join(', ');
            if (list.isNotEmpty) {
              final base = msg ?? 'Studio is not ready for publish';
              return '$base. Missing: $list';
            }
          }
        }
        if (msg != null && msg.isNotEmpty) return msg;
      }
    } catch (_) {}
    return 'HTTP ${response.statusCode}';
  }

  static void _throwIfNotSuccess(http.Response response, String requestId) {
    if (response.statusCode >= 200 && response.statusCode < 300) return;
    final exception = ApiException(
      errorMessageFromResponse(response),
      response.statusCode,
    );
    if (response.statusCode >= 500 && _crashlyticsReady) {
      FirebaseCrashlytics.instance.recordError(
        exception,
        StackTrace.current,
        reason: 'API ${response.statusCode}',
        information: ['requestId=$requestId'],
        fatal: false,
      );
    }
    throw exception;
  }

  static void _logBreadcrumb(String method, String path, String requestId) {
    if (_crashlyticsReady) {
      FirebaseCrashlytics.instance.log('$method $path rid=$requestId');
    }
    if (kDebugMode) debugPrint('[ApiClient] $method $path rid=$requestId');
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
    final requestId = _newRequestId();
    _logBreadcrumb('GET', path, requestId);
    final response = await _withRetry(
      () => http.get(url, headers: _headers(accessToken, requestId)),
      debugLabel: 'GET $path',
    );
    if (kDebugMode) {
      debugPrint('[ApiClient] GET $path status=${response.statusCode} rid=$requestId');
    }
    _throwIfNotSuccess(response, requestId);
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
    final requestId = _newRequestId();
    _logBreadcrumb('POST', path, requestId);
    final response = await _withRetry(
      () => http.post(
        url,
        headers: _headers(accessToken, requestId),
        body: body != null ? json.encode(body) : null,
      ),
      debugLabel: 'POST $path',
    );
    if (kDebugMode) {
      debugPrint('[ApiClient] POST $path status=${response.statusCode} rid=$requestId');
    }
    _throwIfNotSuccess(response, requestId);
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
    final requestId = _newRequestId();
    _logBreadcrumb('PUT', path, requestId);
    final response = await _withRetry(
      () => http.put(
        url,
        headers: _headers(accessToken, requestId),
        body: body != null ? json.encode(body) : null,
      ),
      debugLabel: 'PUT $path',
    );
    if (kDebugMode) {
      debugPrint('[ApiClient] PUT $path status=${response.statusCode} rid=$requestId');
    }
    _throwIfNotSuccess(response, requestId);
    if (response.body.isEmpty) return null;
    return json.decode(response.body);
  }

  /// DELETE [path]. Returns decoded JSON. Throws [ApiException] on non-2xx.
  static Future<dynamic> delete(String path, String? accessToken) async {
    final url = Uri.parse('$_baseUrl$path');
    final requestId = _newRequestId();
    _logBreadcrumb('DELETE', path, requestId);
    final response = await _withRetry(
      () => http.delete(url, headers: _headers(accessToken, requestId)),
      debugLabel: 'DELETE $path',
    );
    if (kDebugMode) {
      debugPrint('[ApiClient] DELETE $path status=${response.statusCode} rid=$requestId');
    }
    _throwIfNotSuccess(response, requestId);
    if (response.body.isEmpty) return null;
    return json.decode(response.body);
  }

  /// PATCH [path] with optional [body]. Returns decoded JSON. Throws [ApiException] on non-2xx.
  static Future<dynamic> patch(
    String path,
    String? accessToken, {
    Map<String, dynamic>? body,
  }) async {
    final url = Uri.parse('$_baseUrl$path');
    final requestId = _newRequestId();
    _logBreadcrumb('PATCH', path, requestId);
    final response = await _withRetry(
      () => http.patch(
        url,
        headers: _headers(accessToken, requestId),
        body: body != null ? json.encode(body) : null,
      ),
      debugLabel: 'PATCH $path',
    );
    if (kDebugMode) {
      debugPrint('[ApiClient] PATCH $path status=${response.statusCode} rid=$requestId');
    }
    _throwIfNotSuccess(response, requestId);
    if (response.body.isEmpty) return null;
    return json.decode(response.body);
  }
}
