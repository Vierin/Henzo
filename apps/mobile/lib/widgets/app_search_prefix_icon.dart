import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../constants/colors.dart';

/// Magnifier for search fields — `assets/icons/icon-search.svg`.
class AppSearchPrefixIcon extends StatelessWidget {
  const AppSearchPrefixIcon({
    super.key,
    this.width = 11,
    this.height = 12,
    this.color = AppColors.primary500,
  });

  final double width;
  final double height;
  final Color color;

  static const _asset = 'assets/icons/icon-search.svg';

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 2),
      child: SvgPicture.asset(
        _asset,
        width: width,
        height: height,
        colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
      ),
    );
  }
}
