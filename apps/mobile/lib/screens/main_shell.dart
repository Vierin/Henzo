import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../services/auth_service.dart';
import '../../services/cache/bookings_cache.dart';
import '../../services/cache/salon_cache.dart';
import '../../services/push_notification_service.dart';
import 'dashboard/dashboard_screen.dart';
import 'calendar_screen.dart';
import 'app_settings_screen.dart';
import 'profile_screen.dart';
import 'add_training_screen.dart';
import 'services_screen.dart';
import 'staff_screen.dart';
import 'clients_screen.dart';
import 'all_bookings_screen.dart';
import 'owner_edit_training_session_screen.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => MainShellState();
}

/// Состояние MainShell — можно использовать для навигации на экраны первой вкладки с сохранением нижней панели.
class MainShellState extends State<MainShell> {
  int _currentIndex = 0;
  bool _salonLoading = true;
  final GlobalKey<NavigatorState> _homeNavigatorKey =
      GlobalKey<NavigatorState>();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadSalon());
  }

  Future<void> _loadSalon() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) setState(() => _salonLoading = false);
      return;
    }
    try {
      await context.read<SalonCache>().getSalon(token);
      await context.read<BookingsCache>().getBookings(token);
    } catch (_) {
      // показываем интерфейс даже при ошибке
    }
    if (mounted) {
      setState(() => _salonLoading = false);
      final locale = context.read<LocaleProvider>();
      await PushNotificationService.requestNotificationPermission();
      if (mounted) {
        PushNotificationService.registerToken(
          accessToken: token,
          language: locale.localeCode,
        );
      }
    }
  }

  /// Переключиться на первую вкладку и открыть маршрут (например /trainers, /offerings).
  void navigateToTab0Route(String routeName, {Object? arguments}) {
    final nav = _homeNavigatorKey.currentState;
    if (_currentIndex != 0) {
      setState(() => _currentIndex = 0);
    }
    void push(NavigatorState n) {
      if (arguments != null) {
        n.pushNamed(routeName, arguments: arguments);
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

  Widget _buildHomeNavigator() {
    return Navigator(
      key: _homeNavigatorKey,
      initialRoute: '/',
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case '/':
            return MaterialPageRoute(builder: (_) => const DashboardScreen());
          case '/trainings/new':
            return MaterialPageRoute(builder: (_) => const AddTrainingScreen());
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
            final args = settings.arguments;
            if (args is Map<String, dynamic>) {
              return MaterialPageRoute(
                builder: (_) => ClientsScreen(
                  initialFilter: args['filter']?.toString(),
                  initialQuery: args['query']?.toString(),
                ),
              );
            }
            return MaterialPageRoute(builder: (_) => const ClientsScreen());
          case '/profile':
            return MaterialPageRoute(builder: (_) => const ProfileScreen());
          case '/all-bookings':
            return MaterialPageRoute(builder: (_) => const AllBookingsScreen());
          default:
            return MaterialPageRoute(builder: (_) => const DashboardScreen());
        }
      },
    );
  }

  List<Widget> get _screens => [
    _buildHomeNavigator(),
    CalendarScreen(),
    const ClientsScreen(),
    const AppSettingsScreen(
      initialSection: SettingsHubSection.studio,
      embeddedInShell: true,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          IndexedStack(index: _currentIndex, children: _screens),
          if (_salonLoading) const _SalonLoadingCurtain(),
        ],
      ),
      bottomNavigationBar: ColoredBox(
        color: AppColors.backgroundSecondary,
        child: SafeArea(
          top: false,
          minimum: const EdgeInsets.fromLTRB(8, 8, 8, 8),
          child: Container(
            height: 88,
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.backgroundPrimary,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE6E3E2), width: 1),
            ),
            child: Consumer<LocaleProvider>(
              builder: (context, locale, _) => Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: _NavItem(
                      icon: Icons.home_outlined,
                      activeIcon: Icons.home_rounded,
                      label: 'Today',
                      isSelected: _currentIndex == 0,
                      onTap: () => setState(() => _currentIndex = 0),
                    ),
                  ),
                  Expanded(
                    child: _NavItem(
                      icon: Icons.calendar_today_outlined,
                      activeIcon: Icons.calendar_month_rounded,
                      label: 'Schedule',
                      isSelected: _currentIndex == 1,
                      onTap: () => setState(() => _currentIndex = 1),
                    ),
                  ),
                  Expanded(
                    child: _NavItem(
                      icon: Icons.group_outlined,
                      activeIcon: Icons.groups_rounded,
                      label: 'Clients',
                      isSelected: _currentIndex == 2,
                      onTap: () => setState(() => _currentIndex = 2),
                    ),
                  ),
                  Expanded(
                    child: _NavItem(
                      icon: Icons.settings_outlined,
                      activeIcon: Icons.settings_rounded,
                      label: 'Settings',
                      isSelected: _currentIndex == 3,
                      onTap: () => setState(() => _currentIndex = 3),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final iconColor = isSelected
        ? AppColors.textInverse
        : const Color(0xFF655B58);
    final textColor = isSelected
        ? AppColors.textInverse
        : const Color(0xFF655B58);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(28),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 170),
          curve: Curves.easeOutCubic,
          height: 70,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary500 : Colors.transparent,
            borderRadius: BorderRadius.circular(18),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(isSelected ? activeIcon : icon, size: 24, color: iconColor),
              const SizedBox(height: 3),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: textColor,
                  height: 1.05,
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

/// Занавес при загрузке данных салона: логотип и подпись «Подгружаем данные».
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
                  errorBuilder: (_, __, ___) =>
                      Icon(Icons.store, size: 80, color: AppColors.primary500),
                ),
                const SizedBox(height: 24),
                Text(
                  'Подгружаем данные',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary,
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
