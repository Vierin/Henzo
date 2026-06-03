import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Figma / reference viewport (iPhone 14 class). Must match design drafts.
const Size kHenzoDesignSize = Size(390, 844);

/// Global multiplier for every `.sp` in the app — tune here, not per widget.
/// Example: `1.05` ≈ +0.7px on 14sp when scale is already 1.0.
const double kHenzoSpScale = 1.0;

double henzSpResolver(num fontSize, ScreenUtil util) =>
    fontSize * util.scaleText * kHenzoSpScale;

/// Single [ScreenUtilInit] setup for the whole app.
Widget henzScreenUtilInit({
  Widget Function(BuildContext context, Widget? child)? builder,
  Widget? child,
}) {
  return ScreenUtilInit(
    designSize: kHenzoDesignSize,
    minTextAdapt: false,
    splitScreenMode: false,
    ensureScreenSize: true,
    fontSizeResolver: henzSpResolver,
    builder: builder,
    child: child,
  );
}
