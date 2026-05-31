import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../constants/colors.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Magnifier for search fields — `assets/icons/icon-search.svg` (11×12).
class AppSearchPrefixIcon extends StatelessWidget {
  const AppSearchPrefixIcon({
    super.key,
    this.width = 14,
    this.height = 16,
    this.color = AppColors.primary500,
    this.leftMargin = 8,
  });

  final double width;
  final double height;
  final Color color;
  final double leftMargin;

  static const _asset = 'assets/icons/icon-search.svg';

  /// Tight slot so [InputDecoration] does not inflate the icon area (M3 default is 48×48).
  static BoxConstraints prefixConstraints({
    double width = 14,
    double height = 16,
    double leftMargin = 8,
    double trailingGap = 6,
  }) {
    final slotWidth = width + leftMargin + trailingGap;
    return BoxConstraints(
      minWidth: slotWidth,
      maxWidth: slotWidth,
      minHeight: height,
      maxHeight: height,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.only(left: leftMargin),
      width: width,
      height: height,
      alignment: Alignment.center,
      child: SvgPicture.asset(
        _asset,
        width: width,
        height: height,
        fit: BoxFit.contain,
        alignment: Alignment.center,
        colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
      ),
    );
  }
}
