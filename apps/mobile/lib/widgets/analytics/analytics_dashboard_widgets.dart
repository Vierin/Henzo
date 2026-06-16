import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:intl/intl.dart';

import '../../constants/colors.dart';
import '../../utils/currency_format.dart';

const double kAnalyticsCardRadius = 14;
const double kAnalyticsGridCardHeight = 100;

TextStyle _analyticsCardLabelStyle() => TextStyle(
  fontSize: 11.sp,
  fontWeight: FontWeight.w600,
  letterSpacing: 0.4,
  color: AppColors.textSecondary,
);

Widget _analyticsCardLabel(String label) => Align(
  alignment: Alignment.centerLeft,
  child: FittedBox(
    fit: BoxFit.scaleDown,
    alignment: Alignment.centerLeft,
    child: Text(
      label.toUpperCase(),
      maxLines: 1,
      softWrap: false,
      style: _analyticsCardLabelStyle(),
    ),
  ),
);

Widget _analyticsCardIcon({
  IconData? icon,
  String? iconAsset,
  required Color iconBackground,
  required Color iconColor,
  double iconWidth = 20,
  double iconHeight = 20,
}) {
  assert(icon != null || iconAsset != null);

  return Container(
    width: 40,
    height: 40,
    decoration: BoxDecoration(
      color: iconBackground,
      borderRadius: BorderRadius.circular(12),
    ),
    alignment: Alignment.center,
    child: iconAsset != null
        ? SvgPicture.asset(
            iconAsset,
            width: iconWidth,
            height: iconHeight,
            colorFilter: ColorFilter.mode(iconColor, BlendMode.srcIn),
          )
        : Icon(icon, size: 20, color: iconColor),
  );
}

class AnalyticsPeriodChips extends StatefulWidget {
  const AnalyticsPeriodChips({
    super.key,
    required this.selectedDays,
    required this.labels,
    required this.onSelected,
    this.disabledDays = const {},
    this.disabledTapMessage,
  });

  final int selectedDays;
  final Map<int, String> labels;
  final ValueChanged<int> onSelected;
  final Set<int> disabledDays;
  final String? disabledTapMessage;

  @override
  State<AnalyticsPeriodChips> createState() => _AnalyticsPeriodChipsState();
}

class _AnalyticsPeriodChipsState extends State<AnalyticsPeriodChips>
    with SingleTickerProviderStateMixin {
  static const double _outerRadius = 14;
  static const double _innerRadius = 12;
  static const double _inset = 3;
  static const double _innerHeight = 38;
  static const Duration _animDuration = Duration(milliseconds: 280);

  late final AnimationController _controller;
  late final List<int> _dayKeys;

  @override
  void initState() {
    super.initState();
    _dayKeys = widget.labels.keys.toList(growable: false);
    final initialIndex = _indexForDays(widget.selectedDays);
    _controller = AnimationController(
      vsync: this,
      value: initialIndex.toDouble(),
      duration: _animDuration,
    );
  }

  @override
  void didUpdateWidget(AnalyticsPeriodChips oldWidget) {
    super.didUpdateWidget(oldWidget);
    final index = _indexForDays(widget.selectedDays);
    if (index != _controller.value.round()) {
      _controller.animateTo(
        index.toDouble(),
        duration: _animDuration,
        curve: Curves.easeOutCubic,
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  int _indexForDays(int days) {
    final index = _dayKeys.indexOf(days);
    return index < 0 ? 0 : index;
  }

  void _selectIndex(int index) {
    if (index < 0 || index >= _dayKeys.length) return;
    final days = _dayKeys[index];
    if (widget.disabledDays.contains(days)) {
      _showDisabledTapMessage();
      return;
    }
    if (widget.selectedDays == days &&
        _controller.value.round() == index &&
        !_controller.isAnimating) {
      return;
    }
    _controller.animateTo(
      index.toDouble(),
      duration: _animDuration,
      curve: Curves.easeOutCubic,
    );
    widget.onSelected(days);
  }

  void _showDisabledTapMessage() {
    final message = widget.disabledTapMessage;
    if (message == null || message.isEmpty) return;
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(
        SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
      );
  }

  double _emphasisForTab(int tabIndex) =>
      (1 - (_controller.value - tabIndex).abs()).clamp(0.0, 1.0);

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(_outerRadius),
      ),
      child: Padding(
        padding: const EdgeInsets.all(_inset),
        child: SizedBox(
          height: _innerHeight,
          width: double.infinity,
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, _) {
              final fraction = _controller.value.clamp(
                0.0,
                (_dayKeys.length - 1).toDouble(),
              );
              return LayoutBuilder(
                builder: (context, constraints) {
                  final tabWidth = constraints.maxWidth / _dayKeys.length;
                  final plateLeft = fraction * tabWidth;

                  return Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Transform.translate(
                        offset: Offset(plateLeft, 0),
                        child: IgnorePointer(
                          child: Container(
                            width: tabWidth,
                            height: _innerHeight,
                            decoration: BoxDecoration(
                              color: AppColors.primary500,
                              borderRadius: BorderRadius.circular(_innerRadius),
                            ),
                          ),
                        ),
                      ),
                      Row(
                        children: [
                          for (var i = 0; i < _dayKeys.length; i++)
                            _periodTab(
                              label: widget.labels[_dayKeys[i]]!,
                              emphasis: _emphasisForTab(i),
                              enabled: !widget.disabledDays.contains(
                                _dayKeys[i],
                              ),
                              onTap: () => _selectIndex(i),
                            ),
                        ],
                      ),
                    ],
                  );
                },
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _periodTab({
    required String label,
    required double emphasis,
    required bool enabled,
    required VoidCallback onTap,
  }) {
    final color = enabled
        ? Color.lerp(AppColors.textPrimary, Colors.white, emphasis)!
        : AppColors.textTertiary.withValues(alpha: 0.55);
    final fontWeight = !enabled
        ? FontWeight.w500
        : emphasis > 0.5
        ? FontWeight.w600
        : FontWeight.w500;

    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: SizedBox(
          height: _innerHeight,
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13.sp,
                fontWeight: fontWeight,
                height: 1.1,
                color: color,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ),
    );
  }
}

class AnalyticsMetricCard extends StatelessWidget {
  const AnalyticsMetricCard({
    super.key,
    required this.label,
    required this.value,
    this.subtitle,
    this.subtitleColor,
    this.icon,
    this.iconAsset,
    this.iconWidth = 20,
    this.iconHeight = 20,
    required this.iconBackground,
    required this.iconColor,
    this.compact = false,
  }) : assert(icon != null || iconAsset != null);

  final String label;
  final String value;
  final String? subtitle;
  final Color? subtitleColor;
  final IconData? icon;
  final String? iconAsset;
  final double iconWidth;
  final double iconHeight;
  final Color iconBackground;
  final Color iconColor;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final hasSubtitle = subtitle != null && subtitle!.isNotEmpty;

    return Container(
      height: compact ? kAnalyticsGridCardHeight : null,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(kAnalyticsCardRadius),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _analyticsCardLabel(label),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      value,
                      style: TextStyle(
                        fontSize: 28.sp,
                        fontWeight: FontWeight.w700,
                        height: 1.05,
                        letterSpacing: -0.5,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (compact || hasSubtitle) ...[
                      const SizedBox(height: 6),
                      SizedBox(
                        height: 18,
                        width: double.infinity,
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            alignment: Alignment.centerLeft,
                            child: Text(
                              hasSubtitle ? subtitle! : '',
                              maxLines: 1,
                              softWrap: false,
                              style: TextStyle(
                                fontSize: 12.sp,
                                fontWeight: FontWeight.w500,
                                color: subtitleColor ?? AppColors.success600,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              _analyticsCardIcon(
                icon: icon,
                iconAsset: iconAsset,
                iconBackground: iconBackground,
                iconColor: iconColor,
                iconWidth: iconWidth,
                iconHeight: iconHeight,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class AnalyticsOccupancyCard extends StatelessWidget {
  const AnalyticsOccupancyCard({
    super.key,
    required this.label,
    required this.percent,
    this.compact = false,
  });

  final String label;
  final double percent;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final clamped = percent.clamp(0.0, 1.0).toDouble();
    final percentLabel = '${(clamped * 100).round()}%';

    return Container(
      height: compact ? kAnalyticsGridCardHeight : null,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(kAnalyticsCardRadius),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _analyticsCardLabel(label),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 44,
                      height: 44,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          SizedBox(
                            width: 44,
                            height: 44,
                            child: CircularProgressIndicator(
                              value: clamped,
                              strokeWidth: 5,
                              backgroundColor: AppColors.warning100,
                              color: AppColors.warning500,
                            ),
                          ),
                          Text(
                            percentLabel,
                            style: TextStyle(
                              fontSize: 12.sp,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              _analyticsCardIcon(
                iconAsset: 'assets/icons/icon-chart.svg',
                iconBackground: AppColors.warning100,
                iconColor: AppColors.warning600,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

const double kAnalyticsTrendYAxisWidth = 22;

class AnalyticsTrendPoint {
  const AnalyticsTrendPoint({required this.date, required this.value});

  final DateTime date;
  final double value;
}

class AnalyticsRevenueTrendCard extends StatelessWidget {
  const AnalyticsRevenueTrendCard({
    super.key,
    required this.title,
    required this.points,
    required this.localeTag,
  });

  final String title;
  final List<AnalyticsTrendPoint> points;
  final String localeTag;

  @override
  Widget build(BuildContext context) {
    final normalizedAxis = _isEmptyTrend(points);
    final yTicks = _yAxisTicks(points);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(12, 16, 16, 12),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(kAnalyticsCardRadius),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: TextStyle(
              fontSize: 11.sp,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.4,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 150,
            width: double.infinity,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(
                  width: kAnalyticsTrendYAxisWidth,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: yTicks
                        .map(
                          (tick) => Text(
                            _formatYAxisTick(tick, normalized: normalizedAxis),
                            style: TextStyle(
                              fontSize: 11.sp,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textTertiary,
                              height: 1,
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: CustomPaint(
                    painter: _RevenueTrendPainter(
                      points: points,
                      minY: yTicks.last,
                      maxY: yTicks.first,
                    ),
                    child: const SizedBox.expand(),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: EdgeInsets.only(left: kAnalyticsTrendYAxisWidth + 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: _axisLabels(points, localeTag),
            ),
          ),
        ],
      ),
    );
  }

  bool _isEmptyTrend(List<AnalyticsTrendPoint> points) {
    if (points.isEmpty) return true;
    return points.every((point) => point.value <= 0);
  }

  List<double> _yAxisTicks(List<AnalyticsTrendPoint> points) {
    if (_isEmptyTrend(points)) return const [1, 0.5, 0];
    final values = points.map((p) => p.value).toList();
    final maxValue = values.reduce((a, b) => a > b ? a : b);
    return [maxValue, maxValue / 2, 0];
  }

  String _formatYAxisTick(double tick, {required bool normalized}) {
    if (normalized) {
      if (tick == 0) return '0';
      if (tick == 1) return '1';
      return tick.toStringAsFixed(1);
    }
    return formatVndAmount(tick);
  }

  List<Widget> _axisLabels(List<AnalyticsTrendPoint> points, String localeTag) {
    if (points.isEmpty) {
      return [const SizedBox.shrink()];
    }
    final fmt = DateFormat('MMM d', localeTag);
    final indices = <int>{0, points.length ~/ 2, points.length - 1};
    return indices.map((index) {
      final point = points[index];
      return Text(
        fmt.format(point.date),
        style: TextStyle(fontSize: 11.sp, color: AppColors.textTertiary),
      );
    }).toList();
  }
}

class _RevenueTrendPainter extends CustomPainter {
  _RevenueTrendPainter({
    required this.points,
    required this.minY,
    required this.maxY,
  });

  final List<AnalyticsTrendPoint> points;
  final double minY;
  final double maxY;

  static const double _verticalPadding = 6;

  double get _yRange {
    final range = maxY - minY;
    return range.abs() < 0.01 ? 1.0 : range;
  }

  double _valueToY(double value, double chartHeight) {
    final normalized = (value - minY) / _yRange;
    return chartHeight -
        (normalized * (chartHeight - _verticalPadding * 2)) -
        _verticalPadding;
  }

  List<Offset> _chartOffsets(Size size) {
    if (points.isEmpty) return const [];
    final values = points.map((p) => p.value).toList();
    final dx = points.length <= 1 ? 0.0 : size.width / (points.length - 1);
    return List.generate(points.length, (i) {
      return Offset(dx * i, _valueToY(values[i], size.height));
    });
  }

  void _appendSmoothCurve(Path path, List<Offset> offsets) {
    if (offsets.isEmpty) return;
    if (offsets.length == 1) {
      path.moveTo(offsets[0].dx, offsets[0].dy);
      return;
    }

    path.moveTo(offsets[0].dx, offsets[0].dy);
    for (var i = 0; i < offsets.length - 1; i++) {
      final p0 = offsets[i > 0 ? i - 1 : i];
      final p1 = offsets[i];
      final p2 = offsets[i + 1];
      final p3 = offsets[i + 2 < offsets.length ? i + 2 : i + 1];

      final segmentMinDy = math.min(p1.dy, p2.dy);
      final segmentMaxDy = math.max(p1.dy, p2.dy);

      final cp1 = Offset(
        p1.dx + (p2.dx - p0.dx) / 6,
        (p1.dy + (p2.dy - p0.dy) / 6).clamp(segmentMinDy, segmentMaxDy),
      );
      final cp2 = Offset(
        p2.dx - (p3.dx - p1.dx) / 6,
        (p2.dy - (p3.dy - p1.dy) / 6).clamp(segmentMinDy, segmentMaxDy),
      );
      path.cubicTo(cp1.dx, cp1.dy, cp2.dx, cp2.dy, p2.dx, p2.dy);
    }
  }

  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty) return;

    final offsets = _chartOffsets(size);
    if (offsets.isEmpty) return;

    final baselineY = _valueToY(minY, size.height);
    final topY = _valueToY(maxY, size.height);

    canvas.save();
    canvas.clipRect(Rect.fromLTRB(0, topY, size.width, baselineY));

    final linePath = Path();
    _appendSmoothCurve(linePath, offsets);

    final fillPath = Path.from(linePath);
    fillPath.lineTo(offsets.last.dx, baselineY);
    fillPath.lineTo(offsets.first.dx, baselineY);
    fillPath.close();

    final fillPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          AppColors.primary500.withValues(alpha: 0.22),
          AppColors.primary500.withValues(alpha: 0.02),
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));
    canvas.drawPath(fillPath, fillPaint);

    final linePaint = Paint()
      ..color = AppColors.primary500
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    canvas.drawPath(linePath, linePaint);

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _RevenueTrendPainter oldDelegate) {
    return oldDelegate.points != points ||
        oldDelegate.minY != minY ||
        oldDelegate.maxY != maxY;
  }
}

String formatAnalyticsDelta({
  required double? current,
  required double? previous,
}) {
  if (current == null || previous == null || previous <= 0) {
    return '';
  }
  final delta = ((current - previous) / previous) * 100;
  final sign = delta > 0 ? '+' : '';
  return '$sign${delta.round()}%';
}

String formatAnalyticsDeltaWithPeriod({
  required double? current,
  required double? previous,
  required int periodDays,
  required String previousDaysTemplate,
}) {
  final delta = formatAnalyticsDelta(current: current, previous: previous);
  if (delta.isEmpty) return '';
  final periodLabel = previousDaysTemplate.replaceAll('{days}', '$periodDays');
  return '$delta $periodLabel';
}

String formatAnalyticsSharePercent({
  required int part,
  required int total,
  String? labelTemplate,
}) {
  if (total <= 0) return '';
  final pct = ((part / total) * 100).round();
  if (labelTemplate == null || labelTemplate.isEmpty) {
    return '$pct%';
  }
  return labelTemplate.replaceAll('{pct}', '$pct');
}
