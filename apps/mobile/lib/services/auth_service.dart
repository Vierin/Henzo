import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/app_config.dart';
import '../l10n/auth_error_keys.dart';
import '../models/user_model.dart';
import '../utils/auth_ui_result.dart';

class AuthService extends ChangeNotifier {
  AuthService() {
    _init();
  }

  final SupabaseClient _supabase = Supabase.instance.client;

  UserModel? _user;
  bool _isLoading = true;
  bool _isAuthenticated = false;
  StreamSubscription<AuthState>? _authSub;

  UserModel? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;

  /// Salon owner app: only `OWNER` may use the main shell.
  bool get isSalonOwner => _user != null && _user!.role == 'OWNER';

  /// Bearer token for API calls.
  String? get accessToken => _supabase.auth.currentSession?.accessToken;

  @override
  void dispose() {
    _authSub?.cancel();
    super.dispose();
  }

  Future<void> refreshSession() async {
    try {
      final res = await _supabase.auth.refreshSession();
      if (res.session != null) {
        await _fetchUser(res.session!.accessToken);
        notifyListeners();
      }
    } catch (e) {
      if (kDebugMode) debugPrint('[Auth] refreshSession error: $e');
      rethrow;
    }
  }

  Future<void> _init() async {
    _isLoading = true;
    notifyListeners();
    try {
      final session = _supabase.auth.currentSession;
      if (session != null) {
        await _fetchUser(session.accessToken);
      } else {
        _user = null;
        _isAuthenticated = false;
      }
    } catch (e) {
      if (kDebugMode) debugPrint('Auth init error: $e');
      _user = null;
      _isAuthenticated = false;
    } finally {
      _isLoading = false;
      notifyListeners();
      _ensureAuthSubscription();
    }
  }

  void _ensureAuthSubscription() {
    if (_authSub != null) return;
    _authSub = _supabase.auth.onAuthStateChange.listen((data) async {
      final event = data.event;
      final session = data.session;

      if (event == AuthChangeEvent.initialSession) return;

      if (event == AuthChangeEvent.signedOut || session == null) {
        if (_user != null || _isAuthenticated) {
          _user = null;
          _isAuthenticated = false;
          _isLoading = false;
          notifyListeners();
        }
        return;
      }

      if (event == AuthChangeEvent.tokenRefreshed) {
        await _fetchUser(session.accessToken);
        _isLoading = false;
        notifyListeners();
        return;
      }

      if (event == AuthChangeEvent.userUpdated) {
        await _fetchUser(session.accessToken);
        _isLoading = false;
        notifyListeners();
      }
    });
  }

  Future<({bool ok, String? errorL10nKey, String? errorRaw})> _fetchUser(
    String accessToken,
  ) async {
    try {
      final url = Uri.parse('${AppConfig.apiUrl}/auth/user');
      if (kDebugMode) debugPrint('[Auth] GET $url');
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          'authorization': 'Bearer $accessToken',
        },
      );
      if (kDebugMode) {
        debugPrint(
          '[Auth] /auth/user status=${response.statusCode} body=${response.body.length} chars',
        );
      }
      if (response.statusCode == 200) {
        final data = json.decode(response.body) as Map<String, dynamic>;
        final userData = data['user'] as Map<String, dynamic>?;
        if (userData == null) {
          if (kDebugMode) {
            debugPrint('[Auth] Response 200 but no "user" in body');
          }
          _user = null;
          _isAuthenticated = false;
          return (
            ok: false,
            errorL10nKey: AuthErrorKeys.responseNoUser,
            errorRaw: null,
          );
        }
        _user = UserModel.fromJson(userData);
        _isAuthenticated = _user != null;
        if (kDebugMode) {
          debugPrint(
            '[Auth] User loaded: ${_user?.email} role=${_user?.role}',
          );
        }
        return (ok: true, errorL10nKey: null, errorRaw: null);
      }
      _user = null;
      _isAuthenticated = false;
      String msg = 'HTTP ${response.statusCode}';
      try {
        final err = json.decode(response.body) as Map<String, dynamic>?;
        if (err != null && err['message'] != null) {
          msg = err['message'] as String;
        }
      } catch (_) {}
      if (kDebugMode) debugPrint('[Auth] /auth/user failed: $msg');
      return (ok: false, errorL10nKey: null, errorRaw: msg);
    } catch (e, st) {
      if (kDebugMode) {
        debugPrint('[Auth] Fetch user error: $e');
        debugPrint('[Auth] Stack: $st');
      }
      _user = null;
      _isAuthenticated = false;
      final errStr = e.toString();
      if (errStr.contains('SocketException') ||
          errStr.contains('Connection refused') ||
          errStr.contains('Failed host lookup') ||
          errStr.contains('NetworkException')) {
        return (
          ok: false,
          errorL10nKey: AuthErrorKeys.network,
          errorRaw: null,
        );
      }
      return (ok: false, errorL10nKey: null, errorRaw: errStr);
    }
  }

  Future<AuthUiResult> loginWithGoogle() async {
    final webClientId = AppConfig.googleWebClientId;
    if (webClientId.isEmpty) {
      return (
        success: false,
        errorL10nKey: AuthErrorKeys.googleWebClientMissing,
        errorRaw: null,
      );
    }
    if (kDebugMode) debugPrint('[Auth] loginWithGoogle: start');
    try {
      _isLoading = true;
      notifyListeners();

      final googleSignIn = GoogleSignIn(
        serverClientId: webClientId,
        clientId: Platform.isIOS ? AppConfig.googleIosClientId : null,
      );
      final account = await googleSignIn.signIn();
      if (account == null) {
        if (kDebugMode) debugPrint('[Auth] Google sign in cancelled');
        _isLoading = false;
        notifyListeners();
        return (
          success: false,
          errorL10nKey: AuthErrorKeys.googleSignInCancelled,
          errorRaw: null,
        );
      }
      if (kDebugMode) debugPrint('[Auth] Google account: ${account.email}');
      final auth = await account.authentication;
      final idToken = auth.idToken;
      final accessToken = auth.accessToken;
      if (idToken == null) {
        _isLoading = false;
        notifyListeners();
        return (
          success: false,
          errorL10nKey: AuthErrorKeys.googleNoIdToken,
          errorRaw: null,
        );
      }
      if (kDebugMode) {
        debugPrint('[Auth] Got idToken, calling Supabase signInWithIdToken');
      }

      await _supabase.auth.signInWithIdToken(
        provider: OAuthProvider.google,
        idToken: idToken,
        accessToken: accessToken,
      );

      final session = _supabase.auth.currentSession;
      if (session == null) {
        if (kDebugMode) debugPrint('[Auth] No session after signInWithIdToken');
        _isLoading = false;
        notifyListeners();
        return (
          success: false,
          errorL10nKey: AuthErrorKeys.googleNoSessionAfterSignIn,
          errorRaw: null,
        );
      }
      if (kDebugMode) debugPrint('[Auth] Session OK, fetching user from API');

      final fetch = await _fetchUser(session.accessToken);
      _isLoading = false;
      notifyListeners();

      if (!fetch.ok || !_isAuthenticated || _user == null) {
        return (
          success: false,
          errorL10nKey:
              fetch.errorL10nKey ?? AuthErrorKeys.userNotFoundInSystem,
          errorRaw: fetch.errorRaw,
        );
      }
      return (success: true, errorL10nKey: null, errorRaw: null);
    } catch (e) {
      _user = null;
      _isAuthenticated = false;
      _isLoading = false;
      notifyListeners();
      String msg = e is AuthException ? e.message : e.toString();
      if (kDebugMode) debugPrint('[Auth] loginWithGoogle exception: $e');
      if (msg.contains('ApiException: 10') || msg.contains('sign_in_failed')) {
        return (
          success: false,
          errorL10nKey: AuthErrorKeys.googleDeveloperSHA1,
          errorRaw: null,
        );
      }
      return (success: false, errorL10nKey: null, errorRaw: msg);
    }
  }

  Future<AuthUiResult> login(String email, String password) async {
    try {
      _isLoading = true;
      notifyListeners();

      final response = await _supabase.auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );

      if (response.session == null) {
        _isLoading = false;
        notifyListeners();
        return (
          success: false,
          errorL10nKey: AuthErrorKeys.noSession,
          errorRaw: null,
        );
      }

      final fetch = await _fetchUser(response.session!.accessToken);
      _isLoading = false;
      notifyListeners();

      if (!fetch.ok || !_isAuthenticated || _user == null) {
        return (
          success: false,
          errorL10nKey:
              fetch.errorL10nKey ?? AuthErrorKeys.userNotFoundInSystem,
          errorRaw: fetch.errorRaw,
        );
      }
      return (success: true, errorL10nKey: null, errorRaw: null);
    } catch (e) {
      _user = null;
      _isAuthenticated = false;
      _isLoading = false;
      notifyListeners();
      final msg = e is AuthException ? e.message : e.toString();
      return (success: false, errorL10nKey: null, errorRaw: msg);
    }
  }

  /// Supabase password reset email (user continues in email / web).
  Future<AuthUiResult> requestPasswordReset(String email) async {
    final trimmed = email.trim();
    if (trimmed.isEmpty) {
      return (success: false, errorL10nKey: null, errorRaw: null);
    }
    try {
      await _supabase.auth.resetPasswordForEmail(
        trimmed,
        redirectTo: '${AppConfig.webUrl}/',
      );
      return (success: true, errorL10nKey: null, errorRaw: null);
    } on AuthException catch (e) {
      return (success: false, errorL10nKey: null, errorRaw: e.message);
    } catch (e) {
      return (success: false, errorL10nKey: null, errorRaw: e.toString());
    }
  }

  Future<void> logout() async {
    _user = null;
    _isAuthenticated = false;
    notifyListeners();
    try {
      await _supabase.auth.signOut();
    } catch (_) {}
  }

  Future<AuthUiResult> updateProfile({
    required String name,
    required String phone,
  }) async {
    final token = accessToken;
    if (token == null) {
      return (
        success: false,
        errorL10nKey: AuthErrorKeys.noSession,
        errorRaw: null,
      );
    }
    try {
      final url = Uri.parse('${AppConfig.apiUrl}/auth/profile');
      final response = await http.put(
        url,
        headers: {
          'Content-Type': 'application/json',
          'authorization': 'Bearer $token',
        },
        body: json.encode({'name': name.trim(), 'phone': phone.trim()}),
      );
      if (response.statusCode == 200) {
        final data = json.decode(response.body) as Map<String, dynamic>;
        final userData = data['user'] as Map<String, dynamic>?;
        if (userData != null) {
          _user = UserModel.fromJson(userData);
          notifyListeners();
        }
        return (success: true, errorL10nKey: null, errorRaw: null);
      }
      String msg = 'HTTP ${response.statusCode}';
      try {
        final err = json.decode(response.body) as Map<String, dynamic>?;
        if (err != null && err['message'] != null) {
          msg = err['message'] as String;
        }
      } catch (_) {}
      return (
        success: false,
        errorL10nKey: AuthErrorKeys.profileUpdateFailed,
        errorRaw: msg,
      );
    } catch (e) {
      return (
        success: false,
        errorL10nKey: AuthErrorKeys.network,
        errorRaw: e.toString(),
      );
    }
  }

  Future<AuthUiResult> updatePassword(String newPassword) async {
    try {
      final res =
          await _supabase.auth.updateUser(UserAttributes(password: newPassword));
      if (res.user != null) {
        return (success: true, errorL10nKey: null, errorRaw: null);
      }
      return (
        success: false,
        errorL10nKey: AuthErrorKeys.passwordUpdateFailed,
        errorRaw: null,
      );
    } on AuthException catch (e) {
      return (success: false, errorL10nKey: null, errorRaw: e.message);
    } catch (e) {
      return (success: false, errorL10nKey: null, errorRaw: e.toString());
    }
  }

  Future<AuthUiResult> deleteAccount() async {
    final token = accessToken;
    if (token == null) {
      return (
        success: false,
        errorL10nKey: AuthErrorKeys.noSession,
        errorRaw: null,
      );
    }
    try {
      final url = Uri.parse('${AppConfig.apiUrl}/auth/account');
      final response = await http.delete(
        url,
        headers: {
          'Content-Type': 'application/json',
          'authorization': 'Bearer $token',
        },
      );
      if (response.statusCode >= 200 && response.statusCode < 300) {
        await logout();
        return (success: true, errorL10nKey: null, errorRaw: null);
      }
      String msg = 'HTTP ${response.statusCode}';
      try {
        final err = json.decode(response.body) as Map<String, dynamic>?;
        if (err != null && err['message'] != null) {
          msg = err['message'] as String;
        }
      } catch (_) {}
      return (success: false, errorL10nKey: null, errorRaw: msg);
    } catch (e) {
      return (
        success: false,
        errorL10nKey: AuthErrorKeys.network,
        errorRaw: e.toString(),
      );
    }
  }
}
