import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import '../shell/shell_tab_route_args.dart';
import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../services/auth_service.dart';
import '../../services/cache/bookings_cache.dart';
import '../../services/cache/salon_cache.dart';
import '../../services/push_notification_service.dart';
import '../../utils/owner_navigation_restore.dart';
import 'dashboard/dashboard_screen.dart';
import 'calendar_screen.dart';
import 'app_settings_screen.dart';
import 'add_training_screen.dart';
import 'services_screen.dart';
import 'staff_screen.dart';
import 'clients_screen.dart';
import 'all_bookings_screen.dart';
import 'owner_edit_training_session_screen.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => MainShellState();
}

class MainShellState extends State<MainShell> {
  /// Bottom bar: 0 Home, 1 Schedule, 2 Clients, 3 Settings.
  static const int scheduleTabIndex = 1;

  int _currentIndex = 0;

  int get currentTabIndex => _currentIndex;
  bool _salonLoading = true;
  final GlobalKey<CalendarScreenState> _scheduleCalendarKey =
      GlobalKey<CalendarScreenState>();
  final GlobalKey<NavigatorState> _homeNavigatorKey =
      GlobalKey<NavigatorState>();
  final GlobalKey<ClientsScreenState> _clientsTabKey =
      GlobalKey<ClientsScreenState>();

  late final List<Widget> _shellBodyTabs;

  @override
  void initState() {
    super.initState();
    _shellBodyTabs = <Widget>[
      _buildHomeNavigator(),
      CalendarScreen(key: _scheduleCalendarKey),
      ClientsScreen(key: _clientsTabKey),
      const AppSettingsScreen(embeddedInShell: true),
    ];
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _restoreShellTabIfNeeded();
      if (mounted) await _loadSalon();
    });
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
    if (saved < 0 || saved >= _shellBodyTabs.length) return;
    if (saved == _currentIndex) return;
    setState(() => _currentIndex = saved);
  }

  Future<void> _loadSalon() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) setState(() => _salonLoading = false);
      return;
    }
    final salonCache = context.read<SalonCache>();
    final bookingsCache = context.read<BookingsCache>();
    try {
      await salonCache.getSalon(token);
      await bookingsCache.getBookings(token);
    } catch (_) {
      // показываем интерфейс даже при ошибке
    }
    if (mounted) {
      setState(() => _salonLoading = false);
    }
    if (!mounted) return;
    final locale = context.read<LocaleProvider>();
    await PushNotificationService.requestNotificationPermission();
    if (mounted) {
      PushNotificationService.registerToken(
        accessToken: token,
        language: locale.localeCode,
      );
    }
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
    if (index < 0 || index >= _shellBodyTabs.length) return;
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
    setState(() => _currentIndex = 2);
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
    return Scaffold(
      body: Stack(
        children: [
          IndexedStack(index: _currentIndex, children: _shellBodyTabs),
          if (_salonLoading) const _SalonLoadingCurtain(),
        ],
      ),
      bottomNavigationBar: ColoredBox(
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
              border: Border.all(color: const Color(0xFFE6E3E2), width: 1),
            ),
            child: Consumer<LocaleProvider>(
              builder: (context, locale, _) {
                final t = locale.t;
                return LayoutBuilder(
                  builder: (context, constraints) {
                    final itemWidth = constraints.maxWidth / 4;
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
                                  WidgetsBinding.instance.addPostFrameCallback((_) {
                                    _scheduleCalendarKey.currentState
                                        ?.ensureSessionsLoaded();
                                  });
                                },
                              ),
                            ),
                            Expanded(
                              child: _NavItem(
                                svgAsset: 'assets/icons/icon-clients.svg',
                                label: t('shell.tabClients'),
                                isSelected: _currentIndex == 2,
                                onTap: () => setState(() => _currentIndex = 2),
                              ),
                            ),
                            Expanded(
                              child: _NavItem(
                                svgAsset: 'assets/icons/icon-settings.svg',
                                label: t('shell.tabSettings'),
                                isSelected: _currentIndex == 3,
                                onTap: () => setState(() => _currentIndex = 3),
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

  final String svgAsset;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _NavItem({
    required this.svgAsset,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final iconColor = isSelected ? AppColors.textInverse : _inactiveIconAndLabel;
    final textColor = isSelected ? AppColors.textInverse : _inactiveIconAndLabel;
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
              SvgPicture.asset(
                svgAsset,
                width: 20,
                height: 20,
                colorFilter: ColorFilter.mode(iconColor, BlendMode.srcIn),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11.sp,
                  fontWeight: FontWeight.w400,
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

/// Занавес при загрузке данных салона: логотип и подпись.
class _SalonLoadingCurtain extends StatelessWidget {
  const _SalonLoadingCurtain();

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: Material(
        color: AppColors.backgroundPrimary,
        child: SafeArea(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Image.asset(
                  'assets/logo.png',
                  height: 80,
                  width: 160,
                  fit: BoxFit.contain,
                  errorBuilder: (_, _, _) =>
                      Icon(Icons.store, size: 80, color: AppColors.primary500),
                ),
                const SizedBox(height: 24),
                Consumer<LocaleProvider>(
                  builder: (context, loc, _) => Text(
                    loc.t('shell.loadingWorkspace'),
                    style: TextStyle(
                      fontSize: 14.sp,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
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
      body: Center(child: CircularProgressIndicator(color: AppColors.primary500)),
    );
  }
}
