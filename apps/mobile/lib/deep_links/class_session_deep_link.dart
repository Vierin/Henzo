import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';

import '../utils/class_session_link.dart';
import '../utils/share_intent_pending.dart';
import '../utils/share_intent_router.dart';

/// Opens class detail from `henzo://class?...` / https share links.
class ClassSessionDeepLinkScope extends StatefulWidget {
  const ClassSessionDeepLinkScope({
    super.key,
    required this.navigatorKey,
    required this.child,
  });

  final GlobalKey<NavigatorState> navigatorKey;
  final Widget child;

  @override
  State<ClassSessionDeepLinkScope> createState() =>
      _ClassSessionDeepLinkScopeState();
}

class _ClassSessionDeepLinkScopeState extends State<ClassSessionDeepLinkScope> {
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

  Future<void> _handleUri(Uri uri) async {
    final link = ClassSessionLink.tryParse(uri);
    if (link == null) return;

    final sig =
        '${link.studioId}|${link.sessionId}|${link.startsAt.toUtc().toIso8601String()}';
    final now = DateTime.now();
    if (_lastSig == sig &&
        _lastAt != null &&
        now.difference(_lastAt!).inMilliseconds < 2500) {
      return;
    }
    _lastSig = sig;
    _lastAt = now;

    await ShareIntentPending.storeClass(
      studioId: link.studioId,
      sessionId: link.sessionId,
      startsAt: link.startsAt,
    );

    final intent = ShareIntent.classSession(
      idOrSlug: link.studioId,
      sessionId: link.sessionId,
      startsAtIso: link.startsAt.toUtc().toIso8601String(),
    );

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ShareIntentRouter.open(
        intent,
        navigatorKey: widget.navigatorKey,
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
