/// Injected into [Navigator.pushNamed] `arguments` when [MainShellState]
/// switches from another bottom tab to tab 0 before pushing a route.
/// The pushed screen should read this and restore the tab when popping.
const String kRestoreShellTabRouteArg = '_restoreShellTabIndex';

/// When [tabIndexBeforeSwitch] is not 0, merges [kRestoreShellTabRouteArg]
/// into [arguments] so the pushed route can restore the previous tab.
Object? mergeRestoreShellTabArguments(
  Object? arguments,
  int tabIndexBeforeSwitch,
) {
  if (tabIndexBeforeSwitch == 0) return arguments;
  final extra = <String, dynamic>{
    kRestoreShellTabRouteArg: tabIndexBeforeSwitch,
  };
  if (arguments == null) return extra;
  if (arguments is Map<String, dynamic>) {
    return <String, dynamic>{...arguments, ...extra};
  }
  if (arguments is Map) {
    final base = <String, dynamic>{};
    (arguments as Map).forEach((k, v) {
      base['$k'] = v;
    });
    return <String, dynamic>{...base, ...extra};
  }
  return extra;
}
