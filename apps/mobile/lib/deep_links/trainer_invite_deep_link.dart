import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';

import '../screens/trainer/trainer_invite_accept_screen.dart';

/// Handles `henzo://trainer-invite/<token>` and `henzo.app/trainer-invite/<token>`.
class TrainerInviteDeepLinkScope extends StatefulWidget {
  const TrainerInviteDeepLinkScope({
    super.key,
    required this.navigatorKey,
    required this.child,
  });

  final GlobalKey<NavigatorState> navigatorKey;
  final Widget child;

  @override
  State<TrainerInviteDeepLinkScope> createState() =>
      _TrainerInviteDeepLinkScopeState();
}

class _TrainerInviteDeepLinkScopeState
    extends State<TrainerInviteDeepLinkScope> {
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

  static String? _extractToken(Uri uri) {
    final isAppScheme =
        uri.scheme == 'henzo' && uri.host == 'trainer-invite';
    final isWebPath = (uri.scheme == 'https') &&
        (uri.host == 'henzo.app' || uri.host.endsWith('.henzo.app')) &&
        uri.path.startsWith('/trainer-invite/');

    if (isAppScheme) {
      final parts = uri.pathSegments;
      return parts.isNotEmpty ? parts.first : null;
    }
    if (isWebPath) {
      final parts =
          uri.path.split('/').where((s) => s.isNotEmpty).toList();
      // path = /trainer-invite/<token>
      return parts.length >= 2 ? parts[1] : null;
    }
    return null;
  }

  void _handleUri(Uri uri) {
    final token = _extractToken(uri);
    if (token == null || token.isEmpty) return;

    final now = DateTime.now();
    if (_lastToken == token &&
        _lastAt != null &&
        now.difference(_lastAt!).inMilliseconds < 2500) {
      return;
    }
    _lastToken = token;
    _lastAt = now;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final nav = widget.navigatorKey.currentState;
      nav?.push(
        MaterialPageRoute<void>(
          builder: (_) => TrainerInviteAcceptScreen(token: token),
        ),
      );
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
