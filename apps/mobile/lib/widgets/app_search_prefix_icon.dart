import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../constants/colors.dart';

/// Magnifier asset for search [TextField]s ([InputDecoration.prefixIcon]).
/// SVG viewBox is 11×12; default width matches design (11 logical px).
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

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 2),
      child: SizedBox(
        width: width,
        height: height,
        child: Center(
          child: SvgPicture.asset(
            'assets/icons/icon-search.svg',
            width: width,
            height: height,
            fit: BoxFit.contain,
            alignment: Alignment.centerRight,
            colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
          ),
        ),
      ),
    );
  }
}
