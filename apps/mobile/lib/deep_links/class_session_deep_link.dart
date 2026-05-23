import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';

import '../screens/public_class_detail_screen.dart';
import '../utils/class_session_link.dart';

/// Opens [PublicClassDetailScreen] from `henzo://class?...`.
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

  void _handleUri(Uri uri) {
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

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _openClass(link);
    });
  }

  void _openClass(ClassSessionLink link) {
    final nav = widget.navigatorKey.currentState;
    if (nav == null) return;
    nav.push(
      MaterialPageRoute<void>(
        builder: (_) => PublicClassDetailScreen(
          studioId: link.studioId,
          sessionId: link.sessionId,
          sessionStartsAtHint: link.startsAt.toLocal(),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
