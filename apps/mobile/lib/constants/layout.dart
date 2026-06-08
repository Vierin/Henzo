import 'package:flutter/material.dart';

/// Shared layout tokens for tab / screen content.
///
/// [kScreenPaddingHorizontal] — default horizontal inset from the screen edge
/// for scroll views, headers, and primary page content (owner + client shells).
const double kScreenPaddingHorizontal = 12;

/// Studio cover photo — home carousel card and public studio hero.
const double kStudioCoverPhotoWidth = 180;
const double kStudioCoverPhotoHeight = 136;
const double kStudioCoverPhotoAspectRatio =
    kStudioCoverPhotoWidth / kStudioCoverPhotoHeight;

/// Home carousel (Top picks / Favorites) — shorter than studio-page hero crop.
const double kStudioHomeCardPhotoHeight = 118;

/// Studio list card photo (Browse tab).
const double kStudioListPhotoWidth = 121;
const double kStudioListPhotoHeight = 145;
const double kStudioListPhotoAspectRatio =
    kStudioListPhotoWidth / kStudioListPhotoHeight;

/// Horizontal screen gutter (left/right = [kScreenPaddingHorizontal]).
EdgeInsets screenPaddingH({double top = 0, double bottom = 0}) =>
    EdgeInsets.fromLTRB(
      kScreenPaddingHorizontal,
      top,
      kScreenPaddingHorizontal,
      bottom,
    );
