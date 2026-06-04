import 'dart:ui';

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

/// Returns the on-screen bounding rect of [context]'s widget.
///
/// Required as [sharePositionOrigin] for share_plus on iOS 16.4+:
/// UIActivityViewController.popoverPresentationController became non-nil on
/// iPhone, so the plugin now validates the origin rect and returns an error
/// if it is empty or out of bounds.
Rect shareOrigin(BuildContext context) {
  final box = context.findRenderObject() as RenderBox?;
  if (box == null || !box.hasSize) return const Rect.fromLTWH(0, 0, 1, 1);
  return box.localToGlobal(Offset.zero) & box.size;
}
