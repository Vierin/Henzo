import 'package:flutter/material.dart';

/// Pinned Browse header that cross-fades from expanded chrome to a compact bar.
class BrowseCollapsingHeaderDelegate extends SliverPersistentHeaderDelegate {
  BrowseCollapsingHeaderDelegate({
    required this.expandedHeight,
    required this.collapsedHeight,
    required this.backgroundColor,
    required this.rebuildToken,
    required this.builder,
  });

  final double expandedHeight;
  final double collapsedHeight;
  final Color backgroundColor;
  final Object rebuildToken;
  final Widget Function(BuildContext context, double collapseT) builder;

  @override
  double get maxExtent => expandedHeight;

  @override
  double get minExtent => collapsedHeight;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    final range = (maxExtent - minExtent).clamp(0.001, double.infinity);
    final t = (shrinkOffset / range).clamp(0.0, 1.0);
    return ColoredBox(
      color: backgroundColor,
      child: builder(context, t),
    );
  }

  @override
  bool shouldRebuild(covariant BrowseCollapsingHeaderDelegate oldDelegate) {
    return expandedHeight != oldDelegate.expandedHeight ||
        collapsedHeight != oldDelegate.collapsedHeight ||
        backgroundColor != oldDelegate.backgroundColor ||
        rebuildToken != oldDelegate.rebuildToken;
  }
}
