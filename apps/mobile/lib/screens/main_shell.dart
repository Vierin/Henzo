import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import '../shell/shell_tab_route_args.dart';
import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../services/auth_service.dart';
import '../../services/cache/bookings_cache.dart';
import '../../models/subscription.dart';
import '../../services/cache/studio_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../services/notifications_store.dart';
import '../../services/push_notification_service.dart';
import '../../services/subscription_refresh_notifier.dart';
import '../../utils/owner_navigation_restore.dart';
import '../../utils/subscription_plan_features.dart';
import 'dashboard/dashboard_screen.dart';
import 'calendar_screen.dart';
import 'app_settings_screen.dart';
import 'analytics_screen.dart';
import 'add_training_screen.dart';
import 'services_screen.dart';
import 'staff_screen.dart';
import 'clients_screen.dart';
import 'all_bookings_screen.dart';
import 'owner_edit_training_session_screen.dart';
import '../widgets/common/workspace_loading_view.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => MainShellState();
}

class MainShellState extends State<MainShell> with WidgetsBindingObserver {
  /// Bottom bar: 0 Home, 1 Schedule, 2 Clients, [3 Analytics], Settings.
  static const int scheduleTabIndex = 1;
  static const int clientsTabIndex = 2;

  int _currentIndex = 0;

  int get currentTabIndex => _currentIndex;
  bool _studioLoading = true;

  /// Full-screen routes (inside the home tab) that hide the bottom nav bar.
  static const Set<String> _navHiddenRoutes = {'/trainings/new'};
  bool _hideBottomNav = false;
  late final _HideNavRouteObserver _homeRouteObserver = _HideNavRouteObserver(
    hiddenRouteNames: _navHiddenRoutes,
    onChanged: _onHomeRouteChanged,
  );

  void _onHomeRouteChanged(bool hide) {
    if (hide == _hideBottomNav) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && hide != _hideBottomNav) {
        setState(() => _hideBottomNav = hide);
      }
    });
  }

  bool _showAnalyticsTab = false;
  SubscriptionRefreshNotifier? _subRefresh;
  final GlobalKey<CalendarScreenState> _scheduleCalendarKey =
      GlobalKey<CalendarScreenState>();
  final GlobalKey<NavigatorState> _homeNavigatorKey =
      GlobalKey<NavigatorState>();
  final GlobalKey<ClientsScreenState> _clientsTabKey =
      GlobalKey<ClientsScreenState>();

  int get _settingsTabIndex => _showAnalyticsTab ? 4 : 3;

  int get _tabCount => _showAnalyticsTab ? 5 : 4;

  List<Widget> _buildShellBodyTabs() => <Widget>[
    _buildHomeNavigator(),
    CalendarScreen(key: _scheduleCalendarKey),
    ClientsScreen(key: _clientsTabKey),
    if (_showAnalyticsTab) const AnalyticsScreen(),
    const AppSettingsScreen(embeddedInShell: true),
  ];

  void _clampCurrentIndex() {
    final maxIndex = _tabCount - 1;
    if (_currentIndex > maxIndex) _currentIndex = maxIndex;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      _subRefresh = context.read<SubscriptionRefreshNotifier>();
      _subRefresh!.addListener(_onSubscriptionRefresh);
      await _loadStudio();
      if (mounted) await _restoreShellTabIfNeeded();
    });
  }

  @override
  void dispose() {
    _subRefresh?.removeListener(_onSubscriptionRefresh);
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  void _onSubscriptionRefresh() {
    if (mounted) unawaited(_refreshAnalyticsTabVisibility());
  }

  void _applyAnalyticsTabForSubscription(Subscription? subscription) {
    final show = subscriptionPlanHasAnalyticsAccess(subscription);
    if (show == _showAnalyticsTab) return;
    setState(() {
      _showAnalyticsTab = show;
      _clampCurrentIndex();
    });
  }

  Future<void> _refreshAnalyticsTabVisibility() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;
    try {
      final subscription = await DashboardApiService.getCurrentSubscription(
        token,
      );
      if (!mounted) return;
      _applyAnalyticsTabForSubscription(subscription);
    } catch (_) {
      // Keep current tab layout on transient errors.
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed || !mounted) return;
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;
    unawaited(_refreshAnalyticsTabVisibility());
    final locale = context.read<LocaleProvider>();
    unawaited(
      PushNotificationService.registerToken(
        accessToken: token,
        language: locale.localeCode,
      ),
    );
    unawaited(context.read<NotificationsStore>().syncFromServer(token));
  }

  Future<void> _restoreShellTabIfNeeded() async {
    final pendingPhoto =
        await OwnerNavigationRestore.hasPendingProfilePhotoUpload();
    if (!pendingPhoto) {
      await OwnerNavigationRestore.clearShellTabIndex();
      return;
    }
    final saved = await OwnerNavigationRestore.readShellTabIndex();
    if (!mounted || saved == null) return;
    if (saved < 0 || saved >= _tabCount) return;
    if (saved == _currentIndex) return;
    setState(() => _currentIndex = saved);
  }

  Future<void> _loadStudio() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) setState(() => _studioLoading = false);
      return;
    }
    final studioCache = context.read<StudioCache>();
    final bookingsCache = context.read<BookingsCache>();

    // Analytics tab must not depend on studio/bookings prefetch failures.
    try {
      await Future.wait<void>([
        _refreshAnalyticsTabVisibility(),
        studioCache.getStudio(token).then((_) {}, onError: (_) {}),
        bookingsCache.getBookings(token).then((_) {}, onError: (_) {}),
      ]).timeout(const Duration(seconds: 12));
    } catch (_) {
      // Timed out / failed — still enter the shell.
    }

    if (mounted) {
      setState(() => _studioLoading = false);
    }
    if (!mounted) return;

    // Never block the owner shell on the system notification prompt.
    unawaited(() async {
      try {
        unawaited(_refreshAnalyticsTabVisibility());
        final locale = context.read<LocaleProvider>();
        await PushNotificationService.requestNotificationPermission();
        if (!mounted) return;
        await PushNotificationService.registerToken(
          accessToken: token,
          language: locale.localeCode,
        );
        if (!mounted) return;
        await context.read<NotificationsStore>().syncFromServer(token);
      } catch (_) {}
    }());
  }

  /// Переключиться на первую вкладку и открыть маршрут (например /trainers, /offerings).
  void navigateToTab0Route(String routeName, {Object? arguments}) {
    final nav = _homeNavigatorKey.currentState;
    final tabBeforeSwitch = _currentIndex;
    if (_currentIndex != 0) {
      setState(() => _currentIndex = 0);
    }
    final pushArgs = mergeRestoreShellTabArguments(arguments, tabBeforeSwitch);
    void push(NavigatorState n) {
      if (pushArgs != null) {
        n.pushNamed(routeName, arguments: pushArgs);
      } else {
        n.pushNamed(routeName);
      }
    }

    if (nav != null) {
      push(nav);
      return;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final n = _homeNavigatorKey.currentState;
      if (n != null) push(n);
    });
  }

  /// Вернуть нижнюю навигацию на вкладку (после закрытия экрана с другой вкладки).
  void restoreShellTab(int index) {
    if (!mounted) return;
    if (index < 0 || index >= _tabCount) return;
    setState(() => _currentIndex = index);
  }

  /// Дашборд «See all»: открыть календарь на сегодня (вкладка Schedule).
  void openScheduleTabForToday() {
    setState(() => _currentIndex = scheduleTabIndex);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scheduleCalendarKey.currentState?.ensureSessionsLoaded();
      _scheduleCalendarKey.currentState?.jumpToToday();
    });
  }

  void _openHomeTab() {
    setState(() => _currentIndex = 0);
    final nav = _homeNavigatorKey.currentState;
    if (nav != null && nav.canPop()) {
      nav.popUntil((route) => route.isFirst);
    }
  }

  /// Opens the Clients shell tab and applies optional filter/search (one list).
  void openClientsTab({String? initialFilter, String? initialQuery}) {
    setState(() => _currentIndex = clientsTabIndex);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _clientsTabKey.currentState?.applyRouteArgs(
        filter: initialFilter,
        query: initialQuery,
      );
    });
  }

  Widget _buildHomeNavigator() {
    return Navigator(
      key: _homeNavigatorKey,
      initialRoute: '/',
      observers: [_homeRouteObserver],
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case '/':
            return MaterialPageRoute(builder: (_) => const DashboardScreen());
          case '/trainings/new':
            return MaterialPageRoute<bool?>(
              builder: (_) => const AddTrainingScreen(),
              settings: settings,
            );
          case '/owner/session/edit':
            return MaterialPageRoute<bool?>(
              builder: (_) => const OwnerEditTrainingSessionScreen(),
              settings: settings,
            );
          case '/offerings':
          case '/services':
            return MaterialPageRoute<bool?>(
              builder: (_) => const ServicesScreen(),
              settings: settings,
            );
          case '/trainers':
          case '/staff':
            return MaterialPageRoute(builder: (_) => const StaffScreen());
          case '/clients':
            return MaterialPageRoute<void>(
              builder: (_) => _ClientsTabOpener(args: settings.arguments),
            );
          case '/all-bookings':
            return MaterialPageRoute(builder: (_) => const AllBookingsScreen());
          default:
            return MaterialPageRoute(builder: (_) => const DashboardScreen());
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_studioLoading) {
      return const Scaffold(body: WorkspaceLoadingView());
    }

    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: _buildShellBodyTabs()),
      bottomNavigationBar: _hideBottomNav
          ? null
          : ColoredBox(
        color: AppColors.backgroundSecondary,
        child: SafeArea(
          top: false,
          minimum: const EdgeInsets.fromLTRB(10, 10, 10, 18),
          child: Container(
            height: 70,
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.backgroundPrimary,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Consumer<LocaleProvider>(
              builder: (context, locale, _) {
                final t = locale.t;
                return LayoutBuilder(
                  builder: (context, constraints) {
                    final tabCount = _tabCount;
                    final itemWidth = constraints.maxWidth / tabCount;
                    final settingsIndex = _settingsTabIndex;
                    return Stack(
                      children: [
                        AnimatedPositioned(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOutCubic,
                          left: _currentIndex * itemWidth,
                          top: 0,
                          bottom: 0,
                          width: itemWidth,
                          child: Container(
                            margin: const EdgeInsets.all(2),
                            decoration: BoxDecoration(
                              color: AppColors.primary500,
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                        Row(
                          children: [
                            Expanded(
                              child: _NavItem(
                                svgAsset: 'assets/icons/icon-house.svg',
                                label: t('shell.tabHome'),
                                isSelected: _currentIndex == 0,
                                onTap: _openHomeTab,
                              ),
                            ),
                            Expanded(
                              child: _NavItem(
                                svgAsset: 'assets/icons/icon-schedule.svg',
                                label: t('shell.tabSchedule'),
                                isSelected: _currentIndex == 1,
                                onTap: () {
                                  setState(() => _currentIndex = 1);
                                  WidgetsBinding.instance.addPostFrameCallback((
                                    _,
                                  ) {
                                    _scheduleCalendarKey.currentState
                                        ?.ensureSessionsLoaded();
                                    _scheduleCalendarKey.currentState
                                        ?.jumpToToday();
                                  });
                                },
                              ),
                            ),
                            Expanded(
                              child: _NavItem(
                                svgAsset: 'assets/icons/icon-people.svg',
                                label: t('shell.tabClients'),
                                isSelected: _currentIndex == clientsTabIndex,
                                onTap: () => setState(
                                  () => _currentIndex = clientsTabIndex,
                                ),
                              ),
                            ),
                            if (_showAnalyticsTab)
                              Expanded(
                                child: _NavItem(
                                  svgAsset: 'assets/icons/icon-trending.svg',
                                  label: t('shell.tabAnalytics'),
                                  isSelected: _currentIndex == 3,
                                  onTap: () =>
                                      setState(() => _currentIndex = 3),
                                ),
                              ),
                            Expanded(
                              child: _NavItem(
                                svgAsset: 'assets/icons/icon-settings.svg',
                                label: t('shell.tabSettings'),
                                isSelected: _currentIndex == settingsIndex,
                                iconSize: 22,
                                onTap: () =>
                                    setState(() => _currentIndex = settingsIndex),
                              ),
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
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  static const _inactiveIconAndLabel = AppColors.brandText;

  final String? svgAsset;
  final IconData? icon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  final double iconSize;

  const _NavItem({
    this.svgAsset,
    this.icon,
    required this.label,
    required this.isSelected,
    required this.onTap,
    this.iconSize = 20,
  }) : assert(
         (svgAsset != null) ^ (icon != null),
         'Provide either svgAsset or icon',
       );

  @override
  Widget build(BuildContext context) {
    final iconColor = isSelected
        ? AppColors.textInverse
        : _inactiveIconAndLabel;
    final textColor = isSelected
        ? AppColors.textInverse
        : _inactiveIconAndLabel;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
        child: SizedBox(
          height: 62,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (svgAsset != null)
                SvgPicture.asset(
                  svgAsset!,
                  width: iconSize,
                  height: iconSize,
                  colorFilter: ColorFilter.mode(iconColor, BlendMode.srcIn),
                )
              else
                Icon(icon, size: iconSize, color: iconColor),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11.sp,
                  fontWeight: FontWeight.w500,
                  color: textColor,
                  height: 1,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Pops immediately and switches the shell Clients tab (avoids a second list).
class _ClientsTabOpener extends StatefulWidget {
  const _ClientsTabOpener({this.args});

  final Object? args;

  @override
  State<_ClientsTabOpener> createState() => _ClientsTabOpenerState();
}

class _ClientsTabOpenerState extends State<_ClientsTabOpener> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final shell = context.findAncestorStateOfType<MainShellState>();
      String? f;
      String? q;
      if (widget.args is Map<String, dynamic>) {
        final m = widget.args! as Map<String, dynamic>;
        f = m['filter']?.toString();
        q = m['query']?.toString();
      }
      Navigator.of(context).pop();
      shell?.openClientsTab(initialFilter: f, initialQuery: q);
    });
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(color: AppColors.primary500),
      ),
    );
  }
}

/// Notifies when the home navigator's top route enters/leaves a full-screen
/// route that should hide the shell bottom navigation bar.
class _HideNavRouteObserver extends NavigatorObserver {
  _HideNavRouteObserver({
    required this.hiddenRouteNames,
    required this.onChanged,
  });

  final Set<String> hiddenRouteNames;
  final ValueChanged<bool> onChanged;

  void _update(Route<dynamic>? top) {
    final name = top?.settings.name;
    onChanged(name != null && hiddenRouteNames.contains(name));
  }

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) =>
      _update(route);

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) =>
      _update(previousRoute);

  @override
  void didRemove(Route<dynamic> route, Route<dynamic>? previousRoute) =>
      _update(previousRoute);

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) =>
      _update(newRoute);
}
