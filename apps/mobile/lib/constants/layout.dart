import 'package:flutter/material.dart';

/// Shared layout tokens for tab / screen content.
///
/// [kScreenPaddingHorizontal] — default horizontal inset from the screen edge
/// for scroll views, headers, and primary page content (owner + client shells).
const double kScreenPaddingHorizontal = 12;

/// Horizontal screen gutter (left/right = [kScreenPaddingHorizontal]).
EdgeInsets screenPaddingH({
  double top = 0,
  double bottom = 0,
}) =>
    EdgeInsets.fromLTRB(
      kScreenPaddingHorizontal,
      top,
      kScreenPaddingHorizontal,
      bottom,
    );
