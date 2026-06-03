import 'dart:ui';

import 'package:flutter/material.dart';

/// Modal / bottom-sheet barrier: #F4DCBA @ 40% + backdrop blur.
abstract final class HenzoModalBarrier {
  static const Color tint = Color(0x66F4DCBA);
  static const double blurSigma = 8;
}

Widget _barrierLayer({VoidCallback? onDismiss}) {
  return Positioned.fill(
    child: GestureDetector(
      onTap: onDismiss,
      behavior: HitTestBehavior.opaque,
      child: BackdropFilter(
        filter: ImageFilter.blur(
          sigmaX: HenzoModalBarrier.blurSigma,
          sigmaY: HenzoModalBarrier.blurSigma,
        ),
        child: const ColoredBox(color: HenzoModalBarrier.tint),
      ),
    ),
  );
}

Widget _sheetDragHandle() {
  return Padding(
    padding: const EdgeInsets.only(top: 10, bottom: 6),
    child: Center(
      child: Container(
        width: 40,
        height: 4,
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(999),
        ),
      ),
    ),
  );
}

/// Bottom sheet with Henzo barrier (replaces [showModalBottomSheet]).
Future<T?> showHenzoModalBottomSheet<T>({
  required BuildContext context,
  required WidgetBuilder builder,
  bool isScrollControlled = false,
  bool isDismissible = true,
  bool useRootNavigator = false,
  bool enableDrag = true,
  bool showDragHandle = false,
  bool useSafeArea = false,
  Color? backgroundColor,
  ShapeBorder? shape,
  Clip? clipBehavior,
  AnimationStyle? sheetAnimationStyle,
}) {
  final duration =
      sheetAnimationStyle?.duration ?? const Duration(milliseconds: 280);

  return showGeneralDialog<T>(
    context: context,
    barrierDismissible: isDismissible,
    barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
    barrierColor: Colors.transparent,
    useRootNavigator: useRootNavigator,
    transitionDuration: duration,
    pageBuilder: (ctx, animation, secondaryAnimation) {
      var sheet = builder(ctx);
      if (showDragHandle) {
        sheet = Column(
          mainAxisSize: MainAxisSize.min,
          children: [_sheetDragHandle(), sheet],
        );
      }
      final wrapped = backgroundColor != null
          ? Material(
              color: backgroundColor,
              shape: shape,
              clipBehavior: clipBehavior ?? Clip.none,
              child: sheet,
            )
          : sheet;
      final needsSafeArea = useSafeArea || !isScrollControlled;
      return Align(
        alignment: Alignment.bottomCenter,
        child: needsSafeArea ? SafeArea(top: false, child: wrapped) : wrapped,
      );
    },
    transitionBuilder: (ctx, animation, secondaryAnimation, child) {
      final nav = Navigator.of(ctx);
      final slide = CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutCubic,
        reverseCurve: Curves.easeInCubic,
      );
      return Stack(
        fit: StackFit.expand,
        children: [
          _barrierLayer(onDismiss: isDismissible ? () => nav.maybePop() : null),
          SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0, 1),
              end: Offset.zero,
            ).animate(slide),
            child: child,
          ),
        ],
      );
    },
  );
}

/// Centered dialog with Henzo barrier (replaces [showDialog]).
Future<T?> showHenzoDialog<T>({
  required BuildContext context,
  required WidgetBuilder builder,
  bool barrierDismissible = true,
  bool useRootNavigator = true,
  RouteSettings? routeSettings,
  Offset? anchorPoint,
}) {
  return showGeneralDialog<T>(
    context: context,
    barrierDismissible: barrierDismissible,
    barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
    barrierColor: Colors.transparent,
    useRootNavigator: useRootNavigator,
    routeSettings: routeSettings,
    anchorPoint: anchorPoint,
    transitionDuration: const Duration(milliseconds: 220),
    pageBuilder: (ctx, animation, secondaryAnimation) {
      return Center(child: builder(ctx));
    },
    transitionBuilder: (ctx, animation, secondaryAnimation, child) {
      final nav = Navigator.of(ctx);
      final curve = CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutCubic,
        reverseCurve: Curves.easeIn,
      );
      return Stack(
        fit: StackFit.expand,
        children: [
          _barrierLayer(
            onDismiss: barrierDismissible ? () => nav.maybePop() : null,
          ),
          FadeTransition(
            opacity: curve,
            child: ScaleTransition(
              scale: Tween<double>(begin: 0.97, end: 1).animate(curve),
              child: child,
            ),
          ),
        ],
      );
    },
  );
}
