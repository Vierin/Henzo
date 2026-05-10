import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';

import '../models/subscription_checkout_outcome.dart';
import '../screens/subscription_checkout_result_screen.dart';

/// Обрабатывает `henzo://subscription-checkout` после Stripe Checkout.
class SubscriptionCheckoutDeepLinkScope extends StatefulWidget {
  const SubscriptionCheckoutDeepLinkScope({
    super.key,
    required this.navigatorKey,
    required this.child,
  });

  final GlobalKey<NavigatorState> navigatorKey;
  final Widget child;

  @override
  State<SubscriptionCheckoutDeepLinkScope> createState() =>
      _SubscriptionCheckoutDeepLinkScopeState();
}

class _SubscriptionCheckoutDeepLinkScopeState
    extends State<SubscriptionCheckoutDeepLinkScope> {
  StreamSubscription<Uri>? _subscription;
  static String? _lastHandledSignature;
  static DateTime? _lastHandledAt;

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
    final outcome = parseSubscriptionCheckoutDeepLink(uri);
    if (outcome == null) return;

    final sig = '${uri.scheme}://${uri.host}${uri.path}?${uri.query}';
    final now = DateTime.now();
    if (_lastHandledSignature == sig &&
        _lastHandledAt != null &&
        now.difference(_lastHandledAt!).inMilliseconds < 2500) {
      return;
    }
    _lastHandledSignature = sig;
    _lastHandledAt = now;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final nav = widget.navigatorKey.currentState;
      if (nav == null) return;
      nav.push<void>(
        MaterialPageRoute<void>(
          fullscreenDialog: true,
          builder: (_) => SubscriptionCheckoutResultScreen(outcome: outcome),
        ),
      );
    });
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
