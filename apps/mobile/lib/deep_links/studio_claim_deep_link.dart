import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';
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

  Future<void> _handleUri(Uri uri) async {
    final extracted = StudioClaimPending.extractFromUri(uri);
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

    await StudioClaimPending.storeFromUri(uri);

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
