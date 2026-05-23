import 'package:flutter/material.dart';

/// Opens Browse; [showClasses] false = Studios, true = Classes (default).
typedef ClientGoToExploreCallback = void Function({bool showClasses});

/// Lets nested client screens (e.g. Favorites empty state) trigger shell actions.
class ClientShellScope extends InheritedWidget {
  const ClientShellScope({
    super.key,
    required this.goToExplore,
    required super.child,
  });

  final ClientGoToExploreCallback goToExplore;

  static ClientShellScope? maybeOf(BuildContext context) {
    return context.findAncestorWidgetOfExactType<ClientShellScope>();
  }

  @override
  bool updateShouldNotify(covariant ClientShellScope oldWidget) {
    return goToExplore != oldWidget.goToExplore;
  }
}
