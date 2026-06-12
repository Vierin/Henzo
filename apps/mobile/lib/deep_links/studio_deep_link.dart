import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';

import '../screens/public_studio_detail_screen.dart';

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

  static String? _extractStudioId(Uri uri) {
    // henzo://studio/<id>
    if (uri.scheme == 'henzo' && uri.host == 'studio') {
      final parts = uri.pathSegments.where((s) => s.isNotEmpty).toList();
      return parts.isNotEmpty ? parts.first : null;
    }
    // https://henzo.app/studio/<slug-or-id>
    // https://www.henzo.app/en/studio/<slug-or-id>
    if (uri.scheme == 'https' &&
        (uri.host == 'henzo.app' ||
            uri.host == 'www.henzo.app' ||
            uri.host.endsWith('.henzo.app'))) {
      final segments = uri.pathSegments.where((s) => s.isNotEmpty).toList();
      final studioIdx = segments.indexOf('studio');
      if (studioIdx >= 0 && studioIdx + 1 < segments.length) {
        return segments[studioIdx + 1];
      }
    }
    return null;
  }

  void _handleUri(Uri uri) {
    final studioId = _extractStudioId(uri);
    if (studioId == null || studioId.isEmpty) return;

    final now = DateTime.now();
    if (_lastId == studioId &&
        _lastAt != null &&
        now.difference(_lastAt!).inMilliseconds < 2500) {
      return;
    }
    _lastId = studioId;
    _lastAt = now;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      widget.navigatorKey.currentState?.push(
        MaterialPageRoute<void>(
          builder: (_) => PublicStudioDetailScreen(studioId: studioId),
        ),
      );
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
