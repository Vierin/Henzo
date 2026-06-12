import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:crypto/crypto.dart';

import '../config/app_config.dart';
import '../l10n/auth_error_keys.dart';
import '../models/trainer_info.dart';
import '../models/user_model.dart';
import '../utils/auth_ui_result.dart';
import '../utils/owner_navigation_restore.dart';
import '../utils/trainer_invite_pending.dart';
import 'analytics_service.dart';
import 'revenuecat_service.dart';

class AuthService extends ChangeNotifier {
  AuthService() {
    _init();
  }

  final SupabaseClient _supabase = Supabase.instance.client;

  UserModel? _user;
  TrainerInfo? _trainerInfo;

  /// False until [_init] finishes once. Not tied to login-in-progress — avoids
  /// replacing [LoginScreen] during sign-in (which disposed the State and swallowed SnackBars).
  bool _initialSessionReady = false;
  bool _isAuthenticated = false;
  StreamSubscription<AuthState>? _authSub;

  UserModel? get user => _user;
  TrainerInfo? get trainerInfo => _trainerInfo;
  bool get isInitialSessionReady => _initialSessionReady;
  bool get isAuthenticated => _isAuthenticated;

  String get normalizedRole => (_user?.role ?? '').trim().toUpperCase();

  /// Fitness studio app: only `OWNER` may use the main shell.
  bool get isStudioOperator => normalizedRole == 'OWNER';

  bool get isClient => normalizedRole == 'CLIENT';

  bool get isTrainer => _trainerInfo != null;

  /// Backward-compatible alias during pivot.
  bool get isSalonOwner => isStudioOperator;

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
        await _tryFinishPendingTrainerInvite(res.session!.accessToken);
        notifyListeners();
      }
    } catch (e) {
      if (kDebugMode) debugPrint('[Auth] refreshSession error: $e');
      rethrow;
    }
  }

  Future<void> _tryFinishPendingTrainerInvite(String accessToken) async {
    final accepted = await TrainerInvitePending.tryAccept(accessToken);
    if (accepted) {
      await _fetchTrainerInfo(accessToken);
    }
  }

  Future<void> _init() async {
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
      _initialSessionReady = true;
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
        if (_user != null ||
            _trainerInfo != null ||
            _isAuthenticated) {
          _user = null;
          _trainerInfo = null;
          _isAuthenticated = false;
          notifyListeners();
        }
        return;
      }

      if (event == AuthChangeEvent.tokenRefreshed) {
        await _fetchUser(session.accessToken);
        notifyListeners();
        return;
      }

      if (event == AuthChangeEvent.userUpdated) {
        await _fetchUser(session.accessToken);
        notifyListeners();
      }
    });
  }

  String? _authConflictL10nKey(String msg) {
    if (msg.contains('ACCOUNT_EXISTS_USE_GOOGLE')) {
      return AuthErrorKeys.accountExistsUseGoogle;
    }
    if (msg.contains('ACCOUNT_EXISTS_USE_APPLE')) {
      return AuthErrorKeys.accountExistsUseApple;
    }
    if (msg.contains('ACCOUNT_EXISTS_USE_OAUTH')) {
      return AuthErrorKeys.accountExistsUseOauth;
    }
    if (msg.contains('ACCOUNT_EXISTS_LOGIN')) {
      return AuthErrorKeys.accountExistsLogin;
    }
    return null;
  }

  String? _fetchErrorL10nKey(String msg) {
    final conflictKey = _authConflictL10nKey(msg);
    if (conflictKey != null) return conflictKey;
    if (msg.contains('ACCOUNT_NOT_FOUND') ||
        msg.contains('User not found in database')) {
      return AuthErrorKeys.accountNotFoundForEmail;
    }
    return null;
  }

  Future<String?> _fetchSignInHint(String email) async {
    final trimmed = email.trim();
    if (trimmed.isEmpty) return null;
    try {
      final url = Uri.parse('${AppConfig.apiUrl}/auth/sign-in-hint');
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'email': trimmed}),
      );
      if (response.statusCode < 200 || response.statusCode >= 300) {
        return null;
      }
      final payload = json.decode(response.body) as Map<String, dynamic>?;
      final hint = payload?['hint'] as String?;
      return _authConflictL10nKey(hint ?? '');
    } catch (_) {
      return null;
    }
  }

  bool _isInvalidPasswordLoginError(String msg) {
    final lower = msg.toLowerCase();
    return lower.contains('invalid login credentials') ||
        lower.contains('invalid email or password');
  }

  AuthUiResult _loginFetchFailure(
    ({bool ok, String? errorL10nKey, String? errorRaw}) fetch,
  ) {
    final l10nKey =
        fetch.errorL10nKey ??
        _fetchErrorL10nKey(fetch.errorRaw ?? '') ??
        AuthErrorKeys.accountNotFoundForEmail;
    return (
      success: false,
      errorL10nKey: l10nKey,
      errorRaw: null,
    );
  }

  Future<void> _signOutAfterFailedLogin() async {
    try {
      await _supabase.auth.signOut();
    } catch (_) {}
    _user = null;
    _isAuthenticated = false;
  }

  Future<({bool ok, String? errorL10nKey, String? errorRaw})> _fetchUser(
    String accessToken, {
    bool syncIfMissing = false,
  }) async {
    try {
      final url = Uri.parse('${AppConfig.apiUrl}/auth/user').replace(
        queryParameters: syncIfMissing ? {'syncIfMissing': 'true'} : null,
      );
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
          debugPrint('[Auth] User loaded: ${_user?.email} role=${_user?.role}');
        }
        if (_user != null) {
          unawaited(
            AnalyticsService.instance.setUser(_user!.id, role: _user!.role),
          );
          unawaited(
            RevenueCatService.onAuthUserChanged(
              userId: _user!.id,
              isOwner: isStudioOperator,
            ),
          );
          // Detect trainer account — non-blocking
          unawaited(_fetchTrainerInfo(accessToken));
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
      return (
        ok: false,
        errorL10nKey: _fetchErrorL10nKey(msg),
        errorRaw: msg,
      );
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
        return (ok: false, errorL10nKey: AuthErrorKeys.network, errorRaw: null);
      }
      return (ok: false, errorL10nKey: null, errorRaw: errStr);
    }
  }

  /// After Google OAuth, assign OWNER via POST /auth/register (business signup).
  Future<({bool ok, String? errorRaw})> _registerOwnerAfterOAuth({
    String? overrideName,
  }) async {
    final session = _supabase.auth.currentSession;
    final supaUser = _supabase.auth.currentUser;
    if (session == null || supaUser == null) {
      return (ok: false, errorRaw: 'No session after Google sign-in');
    }
    final email = (supaUser.email ?? _user?.email ?? '').trim();
    if (email.isEmpty) {
      return (ok: false, errorRaw: 'Google account has no email');
    }
    final meta = supaUser.userMetadata;
    final metaName =
        (meta?['name'] ?? meta?['full_name'] ?? _user?.name)
            ?.toString()
            .trim();
    final name =
        (overrideName != null && overrideName.isNotEmpty)
            ? overrideName
            : metaName;

    try {
      final url = Uri.parse('${AppConfig.apiUrl}/auth/register');
      if (kDebugMode) debugPrint('[Auth] POST $url (OWNER)');
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'authorization': 'Bearer ${session.accessToken}',
        },
        body: json.encode({
          'userId': supaUser.id,
          'email': email,
          'role': 'OWNER',
          if (name != null && name.isNotEmpty) 'name': name,
        }),
      );
      if (kDebugMode) {
        debugPrint(
          '[Auth] POST /auth/register status=${response.statusCode}',
        );
      }
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return (ok: true, errorRaw: null);
      }
      String msg = 'HTTP ${response.statusCode}';
      try {
        final err = json.decode(response.body) as Map<String, dynamic>?;
        if (err?['message'] != null) msg = err!['message'] as String;
      } catch (_) {}
      return (ok: false, errorRaw: msg);
    } catch (e) {
      return (ok: false, errorRaw: e.toString());
    }
  }

  /// [registerAsOwner] — business path: upgrade role to OWNER after Google sign-in.
  /// [syncIfMissing] — registration path: create DB user if missing (default login: false).
  Future<AuthUiResult> loginWithGoogle({
    bool registerAsOwner = false,
    bool syncIfMissing = false,
  }) async {
    final webClientId = AppConfig.googleWebClientId;
    if (webClientId.isEmpty) {
      AppConfig.logIfDevelopment(
        'login.google',
        'GOOGLE_WEB_CLIENT_ID is empty',
      );
      return (
        success: false,
        errorL10nKey: AuthErrorKeys.googleWebClientMissing,
        errorRaw: null,
      );
    }
    final iosClientId = AppConfig.googleIosClientId;
    if (Platform.isIOS && iosClientId.isEmpty) {
      return (
        success: false,
        errorL10nKey: AuthErrorKeys.googleIosClientMissing,
        errorRaw: null,
      );
    }
    if (kDebugMode) debugPrint('[Auth] loginWithGoogle: start');
    try {
      try {
        await _supabase.auth.signOut();
      } catch (_) {}
      final googleSignIn = GoogleSignIn(
        serverClientId: webClientId,
        clientId: Platform.isIOS ? iosClientId : null,
      );
      await googleSignIn.signOut();
      final account = await googleSignIn.signIn();
      if (account == null) {
        if (kDebugMode) debugPrint('[Auth] Google sign in cancelled');
        AppConfig.logIfDevelopment(
          'login.google',
          'User cancelled Google sign-in',
        );
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
        AppConfig.logIfDevelopment(
          'login.google',
          'Google did not return idToken',
        );
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

      return _finalizeOAuthSignIn(
        logTag: 'login.google',
        registerAsOwner: registerAsOwner,
        syncIfMissing: syncIfMissing,
        noSessionL10nKey: AuthErrorKeys.googleNoSessionAfterSignIn,
      );
    } catch (e, st) {
      _user = null;
      _isAuthenticated = false;
      notifyListeners();
      String msg = e is AuthException ? e.message : e.toString();
      AppConfig.logIfDevelopment(
        'login.google',
        'Exception during Google sign-in',
        e,
        st,
      );
      if (kDebugMode) debugPrint('[Auth] loginWithGoogle exception: $e');
      if (msg.contains('ApiException: 7') || msg.contains('network_error')) {
        return (
          success: false,
          errorL10nKey: AuthErrorKeys.network,
          errorRaw: null,
        );
      }
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

  /// [registerAsOwner] — business path: upgrade role to OWNER after Apple sign-in.
  /// [syncIfMissing] — registration path: create DB user if missing.
  Future<AuthUiResult> loginWithApple({
    bool registerAsOwner = false,
    bool syncIfMissing = false,
  }) async {
    if (!Platform.isIOS) {
      return (
        success: false,
        errorL10nKey: null,
        errorRaw: 'Sign in with Apple is only available on iOS',
      );
    }
    if (kDebugMode) debugPrint('[Auth] loginWithApple: start');
    try {
      final rawNonce = _generateNonce();
      final hashedNonce = _sha256Nonce(rawNonce);
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
        nonce: hashedNonce,
      );
      final idToken = credential.identityToken;
      if (idToken == null) {
        AppConfig.logIfDevelopment(
          'login.apple',
          'Apple did not return identityToken',
        );
        return (
          success: false,
          errorL10nKey: AuthErrorKeys.appleNoIdToken,
          errorRaw: null,
        );
      }
      if (kDebugMode) {
        debugPrint('[Auth] Got Apple idToken, calling Supabase signInWithIdToken');
      }
      await _supabase.auth.signInWithIdToken(
        provider: OAuthProvider.apple,
        idToken: idToken,
        nonce: rawNonce,
      );
      final givenName = credential.givenName?.trim() ?? '';
      final familyName = credential.familyName?.trim() ?? '';
      final appleFullName = [givenName, familyName]
          .where((s) => s.isNotEmpty)
          .join(' ');
      return _finalizeOAuthSignIn(
        logTag: 'login.apple',
        registerAsOwner: registerAsOwner,
        syncIfMissing: syncIfMissing,
        noSessionL10nKey: AuthErrorKeys.appleNoSessionAfterSignIn,
        appleFullName: appleFullName.isNotEmpty ? appleFullName : null,
      );
    } on SignInWithAppleAuthorizationException catch (e) {
      _user = null;
      _isAuthenticated = false;
      notifyListeners();
      if (e.code == AuthorizationErrorCode.canceled) {
        AppConfig.logIfDevelopment(
          'login.apple',
          'User cancelled Apple sign-in',
        );
        return (
          success: false,
          errorL10nKey: AuthErrorKeys.appleSignInCancelled,
          errorRaw: null,
        );
      }
      AppConfig.logIfDevelopment(
        'login.apple',
        'Apple authorization error: ${e.code}',
        e,
      );
      return (success: false, errorL10nKey: null, errorRaw: e.message);
    } catch (e, st) {
      _user = null;
      _isAuthenticated = false;
      notifyListeners();
      final msg = e is AuthException ? e.message : e.toString();
      AppConfig.logIfDevelopment(
        'login.apple',
        'Exception during Apple sign-in',
        e,
        st,
      );
      if (kDebugMode) debugPrint('[Auth] loginWithApple exception: $e');
      return (success: false, errorL10nKey: null, errorRaw: msg);
    }
  }

  Future<AuthUiResult> _finalizeOAuthSignIn({
    required String logTag,
    bool registerAsOwner = false,
    bool syncIfMissing = false,
    required String noSessionL10nKey,
    String? appleFullName,
  }) async {
    final session = _supabase.auth.currentSession;
    if (session == null) {
      if (kDebugMode) debugPrint('[Auth] No session after signInWithIdToken');
      AppConfig.logIfDevelopment(
        logTag,
        'No Supabase session after signInWithIdToken',
      );
      notifyListeners();
      return (
        success: false,
        errorL10nKey: noSessionL10nKey,
        errorRaw: null,
      );
    }
    if (kDebugMode) {
      debugPrint('[Auth] Session OK, registerAsOwner=$registerAsOwner');
    }

    if (registerAsOwner) {
      final reg = await _registerOwnerAfterOAuth(overrideName: appleFullName);
      if (!reg.ok) {
        return (success: false, errorL10nKey: null, errorRaw: reg.errorRaw);
      }
      try {
        await _supabase.auth.refreshSession();
      } catch (_) {}
    }

    final fetch = await _fetchUser(
      session.accessToken,
      syncIfMissing: registerAsOwner || syncIfMissing,
    );
    notifyListeners();

    if (!fetch.ok || !_isAuthenticated || _user == null) {
      await _signOutAfterFailedLogin();
      notifyListeners();
      AppConfig.logIfDevelopment(
        logTag,
        'GET /auth/user after OAuth failed: l10n=${fetch.errorL10nKey} raw=${fetch.errorRaw}',
      );
      return _loginFetchFailure(fetch);
    }

    if (registerAsOwner && !isStudioOperator) {
      return (
        success: false,
        errorL10nKey: AuthErrorKeys.userNotFoundInSystem,
        errorRaw: 'Owner role was not applied',
      );
    }

    await _tryFinishPendingTrainerInvite(session.accessToken);
    notifyListeners();

    return (success: true, errorL10nKey: null, errorRaw: null);
  }

  String _generateNonce([int length = 32]) {
    const charset =
        '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
    final random = Random.secure();
    return List.generate(
      length,
      (_) => charset[random.nextInt(charset.length)],
    ).join();
  }

  String _sha256Nonce(String input) {
    final bytes = utf8.encode(input);
    return sha256.convert(bytes).toString();
  }

  Future<AuthUiResult> login(String email, String password) async {
    final emailForLog = email.trim();
    try {
      final response = await _supabase.auth.signInWithPassword(
        email: emailForLog,
        password: password,
      );

      if (response.session == null) {
        AppConfig.logIfDevelopment(
          'login.password',
          'Supabase returned null session after signInWithPassword',
        );
        notifyListeners();
        return (
          success: false,
          errorL10nKey: AuthErrorKeys.noSession,
          errorRaw: null,
        );
      }

      final fetch = await _fetchUser(response.session!.accessToken);
      notifyListeners();

      if (!fetch.ok || !_isAuthenticated || _user == null) {
        await _signOutAfterFailedLogin();
        notifyListeners();
        AppConfig.logIfDevelopment(
          'login.password',
          'GET /auth/user after password sign-in failed (email=$emailForLog): '
              'l10n=${fetch.errorL10nKey} raw=${fetch.errorRaw}',
        );
        return _loginFetchFailure(fetch);
      }
      await _tryFinishPendingTrainerInvite(response.session!.accessToken);
      return (success: true, errorL10nKey: null, errorRaw: null);
    } catch (e, st) {
      _user = null;
      _isAuthenticated = false;
      notifyListeners();
      final msg = e is AuthException ? e.message : e.toString();
      AppConfig.logIfDevelopment(
        'login.password',
        'signInWithPassword exception (email=$emailForLog)',
        e,
        st,
      );
      if (_isInvalidPasswordLoginError(msg)) {
        final hintKey = await _fetchSignInHint(emailForLog);
        if (hintKey != null) {
          return (success: false, errorL10nKey: hintKey, errorRaw: null);
        }
        return (
          success: false,
          errorL10nKey: AuthErrorKeys.invalidCredentials,
          errorRaw: null,
        );
      }
      final mapped = AuthErrorKeys.mapRawToL10nKey(msg);
      return (
        success: false,
        errorL10nKey: mapped,
        errorRaw: mapped == null ? msg : null,
      );
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

  Future<AuthUiResult> requestBusinessRegistration({
    String? name,
    required String email,
    required String password,
  }) async {
    try {
      final url = Uri.parse(
        '${AppConfig.apiUrl}/auth/register-owner/request-code',
      );
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': email.trim(),
          'password': password,
          if (name != null && name.trim().isNotEmpty) 'name': name.trim(),
        }),
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return (success: true, errorL10nKey: null, errorRaw: null);
      }

      String msg = 'HTTP ${response.statusCode}';
      try {
        final err = json.decode(response.body) as Map<String, dynamic>?;
        if (err != null && err['message'] != null) {
          msg = err['message'] as String;
        }
      } catch (_) {}
      final l10nKey =
          _authConflictL10nKey(msg) ?? AuthErrorKeys.mapRawToL10nKey(msg);
      return (
        success: false,
        errorL10nKey: l10nKey,
        errorRaw: l10nKey == null ? msg : null,
      );
    } catch (e) {
      return (
        success: false,
        errorL10nKey: AuthErrorKeys.network,
        errorRaw: e.toString(),
      );
    }
  }

  Future<AuthUiResult> verifyBusinessRegistrationCode({
    required String email,
    required String code,
  }) async {
    try {
      final url = Uri.parse(
        '${AppConfig.apiUrl}/auth/register-owner/verify-code',
      );
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'email': email.trim(), 'code': code.trim()}),
      );
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final payload = json.decode(response.body) as Map<String, dynamic>?;
        final session = payload?['session'];
        final accessToken = session is Map<String, dynamic>
            ? (session['access_token'] as String?)
            : null;
        if (accessToken == null || accessToken.isEmpty) {
          return (
            success: false,
            errorL10nKey: AuthErrorKeys.noSession,
            errorRaw: 'Session is missing after OTP verification',
          );
        }
        final fetch = await _fetchUser(accessToken);
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
        errorL10nKey:
            _authConflictL10nKey(msg) ?? AuthErrorKeys.mapRawToL10nKey(msg),
        errorRaw:
            (_authConflictL10nKey(msg) ?? AuthErrorKeys.mapRawToL10nKey(msg)) ==
                    null
                ? msg
                : null,
      );
    } catch (e) {
      return (
        success: false,
        errorL10nKey: AuthErrorKeys.network,
        errorRaw: e.toString(),
      );
    }
  }

  Future<AuthUiResult> requestClientRegistration({
    required String email,
    required String password,
    String? name,
    String? phone,
  }) async {
    try {
      final url = Uri.parse(
        '${AppConfig.apiUrl}/auth/register-client/request-code',
      );
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': email.trim(),
          'password': password,
          if (name != null && name.trim().isNotEmpty) 'name': name.trim(),
          if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
        }),
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
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
        errorL10nKey:
            _authConflictL10nKey(msg) ?? AuthErrorKeys.mapRawToL10nKey(msg),
        errorRaw:
            (_authConflictL10nKey(msg) ?? AuthErrorKeys.mapRawToL10nKey(msg)) ==
                    null
                ? msg
                : null,
      );
    } catch (e) {
      return (
        success: false,
        errorL10nKey: AuthErrorKeys.network,
        errorRaw: e.toString(),
      );
    }
  }

  Future<AuthUiResult> verifyClientRegistrationCode({
    required String email,
    required String code,
  }) async {
    try {
      final url = Uri.parse(
        '${AppConfig.apiUrl}/auth/register-client/verify-code',
      );
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'email': email.trim(), 'code': code.trim()}),
      );
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final payload = json.decode(response.body) as Map<String, dynamic>?;
        final session = payload?['session'];
        final accessToken = session is Map<String, dynamic>
            ? (session['access_token'] as String?)
            : null;
        if (accessToken == null || accessToken.isEmpty) {
          return (
            success: false,
            errorL10nKey: AuthErrorKeys.noSession,
            errorRaw: 'Session is missing after OTP verification',
          );
        }
        final fetch = await _fetchUser(accessToken);
        notifyListeners();
        if (!fetch.ok || !_isAuthenticated || _user == null) {
          return (
            success: false,
            errorL10nKey:
                fetch.errorL10nKey ?? AuthErrorKeys.userNotFoundInSystem,
            errorRaw: fetch.errorRaw,
          );
        }
        await _tryFinishPendingTrainerInvite(accessToken);
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
        errorL10nKey:
            _authConflictL10nKey(msg) ?? AuthErrorKeys.mapRawToL10nKey(msg),
        errorRaw:
            (_authConflictL10nKey(msg) ?? AuthErrorKeys.mapRawToL10nKey(msg)) ==
                    null
                ? msg
                : null,
      );
    } catch (e) {
      return (
        success: false,
        errorL10nKey: AuthErrorKeys.network,
        errorRaw: e.toString(),
      );
    }
  }

  void _syncTrainerInfoFromUserProfile() {
    final trainer = _trainerInfo;
    final user = _user;
    if (trainer == null || user == null) return;

    final name = user.name?.trim();
    final phone = user.phone?.trim();
    _trainerInfo = TrainerInfo(
      id: trainer.id,
      name: name != null && name.isNotEmpty ? name : trainer.name,
      studioId: trainer.studioId,
      studioName: trainer.studioName,
      email: user.email.trim().isNotEmpty ? user.email.trim() : trainer.email,
      phone: phone != null && phone.isNotEmpty ? phone : trainer.phone,
      studioLogoUrl: trainer.studioLogoUrl,
      accessLevel: trainer.accessLevel,
      trainings: trainer.trainings,
    );
  }

  Future<void> _fetchTrainerInfo(String? token) async {
    if (token == null || token.isEmpty) return;
    try {
      final url = Uri.parse('${AppConfig.apiUrl}/trainers/me/profile');
      final response = await http.get(url, headers: {
        'Content-Type': 'application/json',
        'authorization': 'Bearer $token',
      });
      if (response.statusCode == 200) {
        final data = json.decode(response.body) as Map<String, dynamic>;
        _trainerInfo = TrainerInfo.fromJson(data);
        if (kDebugMode) debugPrint('[Auth] Trainer loaded: ${_trainerInfo?.name}');
      } else {
        _trainerInfo = null;
      }
      notifyListeners();
    } catch (_) {
      _trainerInfo = null;
    }
  }

  Future<void> _signOutGoogleAccount() async {
    final webClientId = AppConfig.googleWebClientId;
    if (webClientId.isEmpty) return;
    try {
      final googleSignIn = GoogleSignIn(
        serverClientId: webClientId,
        clientId: Platform.isIOS ? AppConfig.googleIosClientId : null,
      );
      await googleSignIn.signOut();
    } catch (_) {}
  }

  Future<void> logout() async {
    unawaited(_signOutGoogleAccount());
    try {
      await _supabase.auth.signOut();
    } catch (_) {}
    _user = null;
    _trainerInfo = null;
    _isAuthenticated = false;
    notifyListeners();
    unawaited(AnalyticsService.instance.setUser(null));
    unawaited(
      RevenueCatService.onAuthUserChanged(userId: null, isOwner: false),
    );
    unawaited(OwnerNavigationRestore.clearOwnerNavigationRestore());
  }

  Future<AuthUiResult> updateProfile({
    required String name,
    required String phone,
    String? avatarUrl,
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
        body: json.encode({
          'name': name.trim(),
          'phone': phone.trim(),
          if (avatarUrl != null) 'avatarUrl': avatarUrl.trim(),
        }),
      );
      if (response.statusCode == 200) {
        final data = json.decode(response.body) as Map<String, dynamic>;
        final userData = data['user'] as Map<String, dynamic>?;
        if (userData != null) {
          _user = UserModel.fromJson(userData);
          _syncTrainerInfoFromUserProfile();
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
      final res = await _supabase.auth.updateUser(
        UserAttributes(password: newPassword),
      );
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

  Future<AuthUiResult> updateEmail(String email) async {
    final trimmed = email.trim();
    if (trimmed.isEmpty) {
      return (success: false, errorL10nKey: null, errorRaw: 'Email is empty');
    }
    try {
      final res = await _supabase.auth.updateUser(
        UserAttributes(email: trimmed),
      );
      if (res.user != null) {
        if (_user != null) {
          _user = UserModel(
            id: _user!.id,
            email: trimmed,
            name: _user!.name,
            phone: _user!.phone,
            role: _user!.role,
          );
        }
        notifyListeners();
        return (success: true, errorL10nKey: null, errorRaw: null);
      }
      return (
        success: false,
        errorL10nKey: AuthErrorKeys.profileUpdateFailed,
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
