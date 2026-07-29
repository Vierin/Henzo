import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';

import '../utils/share_intent_pending.dart';
import '../utils/share_intent_router.dart';

/// Handles `henzo://studio/<studioId>` and `henzo.app/studio/<slug-or-id>`.
class StudioDeepLinkScope extends StatefulWidget {
  const StudioDeepLinkScope({
    super.key,
    required this.navigatorKey,
    required this.child,
  });

  final GlobalKey<NavigatorState> navigatorKey;
  final Widget child;

  @override
  State<StudioDeepLinkScope> createState() => _StudioDeepLinkScopeState();
}

class _StudioDeepLinkScopeState extends State<StudioDeepLinkScope> {
  StreamSubscription<Uri>? _subscription;
  static String? _lastId;
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
    final intent = ShareIntentPending.tryParseHenzoUri(uri);
    if (intent == null || intent.kind != ShareIntentKind.studio) return;

    final studioId = intent.idOrSlug;
    if (studioId.isEmpty) return;

    final now = DateTime.now();
    if (_lastId == studioId &&
        _lastAt != null &&
        now.difference(_lastAt!).inMilliseconds < 2500) {
      return;
    }
    _lastId = studioId;
    _lastAt = now;

    await ShareIntentPending.storeStudio(studioId);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ShareIntentRouter.open(
        intent,
        navigatorKey: widget.navigatorKey,
      );
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
