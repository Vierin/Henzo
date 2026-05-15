import 'package:flutter/material.dart';

import '../constants/colors.dart';

/// Magnifier outline for search fields — stroke only, transparent (white) center.
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
    final stroke = (width / 11).clamp(0.9, 1.4);
    return Padding(
      padding: const EdgeInsets.only(left: 2),
      child: SizedBox(
        width: width,
        height: height,
        child: CustomPaint(
          painter: _SearchOutlinePainter(
            color: color,
            strokeWidth: stroke,
          ),
        ),
      ),
    );
  }
}

class _SearchOutlinePainter extends CustomPainter {
  const _SearchOutlinePainter({
    required this.color,
    required this.strokeWidth,
  });

  final Color color;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    final lensR = size.width * 0.38;
    final cx = size.width * 0.42;
    final cy = size.height * 0.40;
    canvas.drawCircle(Offset(cx, cy), lensR, paint);

    final handleStart = Offset(cx + lensR * 0.68, cy + lensR * 0.68);
    final handleEnd = Offset(size.width * 0.94, size.height * 0.94);
    canvas.drawLine(handleStart, handleEnd, paint);
  }

  @override
  bool shouldRepaint(covariant _SearchOutlinePainter oldDelegate) =>
      oldDelegate.color != color || oldDelegate.strokeWidth != strokeWidth;
}
