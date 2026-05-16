import 'dart:async';
import 'dart:convert';

import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import '../widgets/common/henzo_modal.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';

/// Handles `henzo://client-invite?token=...` after email invite.
class ClientInviteDeepLinkScope extends StatefulWidget {
  const ClientInviteDeepLinkScope({
    super.key,
    required this.navigatorKey,
    required this.child,
  });

  final GlobalKey<NavigatorState> navigatorKey;
  final Widget child;

  @override
  State<ClientInviteDeepLinkScope> createState() =>
      _ClientInviteDeepLinkScopeState();
}

class _ClientInviteDeepLinkScopeState extends State<ClientInviteDeepLinkScope> {
  StreamSubscription<Uri>? _subscription;
  static String? _lastSig;
  static DateTime? _lastAt;

  @override
  void initState() {
    super.initState();
    _attach();
  }

  Future<void> _attach() async {
    final appLinks = AppLinks();
    _subscription = appLinks.uriLinkStream.listen(_handleUri);
    final initial = await appLinks.getInitialLink();
    if (initial != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _handleUri(initial);
      });
    }
  }

  void _handleUri(Uri uri) {
    if (uri.scheme != 'henzo' || uri.host != 'client-invite') return;
    final token = uri.queryParameters['token']?.trim();
    if (token == null || token.length < 8) return;

    final sig = token;
    final now = DateTime.now();
    if (_lastSig == sig &&
        _lastAt != null &&
        now.difference(_lastAt!).inMilliseconds < 2500) {
      return;
    }
    _lastSig = sig;
    _lastAt = now;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _confirmAndshowHenzoDialog(token);
    });
  }

  Future<void> _confirmAndshowHenzoDialog(String token) async {
    final nav = widget.navigatorKey.currentState;
    if (nav == null) return;
    final ctx = nav.context;
    final url = Uri.parse(
      '${AppConfig.apiUrl}/fitness/public/client-invitations/confirm',
    );
    try {
      final res = await http
          .post(
            url,
            headers: const {'Content-Type': 'application/json'},
            body: json.encode({'token': token}),
          )
          .timeout(const Duration(seconds: 25));
      final body = res.body.isEmpty
          ? null
          : json.decode(res.body) as Map<String, dynamic>?;
      final ok = res.statusCode >= 200 && res.statusCode < 300;
      final msg = ok
          ? (body?['alreadyUsed'] == true
                ? 'Invitation already used.'
                : 'You are enrolled. See you in class!')
          : (body?['message'] as String? ?? 'Request failed');
      if (!ctx.mounted) return;
      await showHenzoDialog<void>(
        context: ctx,
        builder: (dCtx) => AlertDialog(
          title: Text(ok ? 'Henzo' : 'Error'),
          content: Text(msg),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dCtx).pop(),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    } catch (e) {
      if (!ctx.mounted) return;
      await showHenzoDialog<void>(
        context: ctx,
        builder: (dCtx) => AlertDialog(
          title: const Text('Error'),
          content: Text('$e'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dCtx).pop(),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    }
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
