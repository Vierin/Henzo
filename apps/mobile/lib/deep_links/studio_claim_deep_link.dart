import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';
import '../services/studio_claim_api_service.dart';
import '../utils/studio_claim_pending.dart';

/// Handles `henzo://studio-claim/<token>` and `*.henzo.app/studio-claim/<token>`.
class StudioClaimDeepLinkScope extends StatefulWidget {
  const StudioClaimDeepLinkScope({
    super.key,
    required this.navigatorKey,
    required this.child,
  });

  final GlobalKey<NavigatorState> navigatorKey;
  final Widget child;

  @override
  State<StudioClaimDeepLinkScope> createState() =>
      _StudioClaimDeepLinkScopeState();
}

class _StudioClaimDeepLinkScopeState extends State<StudioClaimDeepLinkScope> {
  StreamSubscription<Uri>? _subscription;
  static String? _lastToken;
  static DateTime? _lastAt;

  @override
  void initState() {
    super.initState();
    _attach();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  Future<void> _attach() async {
    final appLinks = AppLinks();
    _subscription = appLinks.uriLinkStream.listen(_handleUri);
    final initial = await appLinks.getInitialLink();
    if (initial != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _handleUri(initial));
    }
  }

  static ({String? token, String action}) _extract(Uri uri) {
    final action = uri.queryParameters['action'] ?? 'manage';
    final isAppScheme =
        uri.scheme == 'henzo' && uri.host == 'studio-claim';
    final isWebPath = (uri.scheme == 'https') &&
        (uri.host == 'henzo.app' || uri.host.endsWith('.henzo.app')) &&
        uri.path.contains('/studio-claim/');

    if (isAppScheme) {
      final parts = uri.pathSegments;
      return (
        token: parts.isNotEmpty ? parts.first : null,
        action: action,
      );
    }
    if (isWebPath) {
      final parts =
          uri.path.split('/').where((s) => s.isNotEmpty).toList();
      // /studio-claim/<token> or /en/studio-claim/<token>
      final idx = parts.indexOf('studio-claim');
      if (idx >= 0 && idx + 1 < parts.length) {
        return (token: parts[idx + 1], action: action);
      }
    }
    return (token: null, action: action);
  }

  Future<void> _handleUri(Uri uri) async {
    final extracted = _extract(uri);
    final token = extracted.token;
    if (token == null || token.isEmpty) return;

    final now = DateTime.now();
    if (_lastToken == token &&
        _lastAt != null &&
        now.difference(_lastAt!).inMilliseconds < 2500) {
      return;
    }
    _lastToken = token;
    _lastAt = now;

    String? email;
    String? studioName;
    try {
      final preview = await StudioClaimApiService.getClaimPreview(token);
      email = preview['ownerEmailHint'] as String?;
      studioName = preview['studioName'] as String?;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[StudioClaimDeepLink] preview failed: $e');
      }
    }

    await StudioClaimPending.store(
      token: token,
      action: extracted.action,
      email: email,
      studioName: studioName,
    );

    if (!mounted) return;
    final auth = context.read<AuthService>();
    final accessToken = auth.accessToken;
    if (accessToken != null && accessToken.isNotEmpty && auth.isAuthenticated) {
      final ok = await StudioClaimPending.tryAccept(accessToken);
      if (ok) {
        await auth.refreshSession();
      }
    }
    // Logged-out: LoginScreen reads pending email/studioName for email-first flow.
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
