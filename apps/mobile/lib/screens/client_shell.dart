import 'package:flutter/material.dart';

import '../constants/colors.dart';
import '../widgets/shell/shell_nav_item.dart';
import 'client/client_bookings_screen.dart';
import 'client/client_profile_screen.dart';
import 'client/client_search_screen.dart';
import 'client/client_shell_scope.dart';
import 'client_map_screen.dart';
import 'public_home_screen.dart';

class ClientShell extends StatefulWidget {
  const ClientShell({super.key});

  @override
  State<ClientShell> createState() => _ClientShellState();
}

class _ClientShellState extends State<ClientShell> {
  int _currentIndex = 0;
  bool _showMapScreen = false;
  final GlobalKey<ClientSearchScreenState> _exploreScreenKey =
      GlobalKey<ClientSearchScreenState>();

  void goToExploreTab({int? categoryId}) {
    setState(() => _currentIndex = 1);
    _exploreScreenKey.currentState?.ensureExploreLoaded();
    if (categoryId != null) {
      _exploreScreenKey.currentState?.selectCategory(categoryId);
    }
  }

  List<Widget> get _screens => [
    PublicHomeScreen(
      onOpenMap: () => setState(() => _showMapScreen = true),
      onOpenBrowse: () => goToExploreTab(),
      onCategorySelected: (id) => goToExploreTab(categoryId: id),
      onOpenBookings: () => setState(() => _currentIndex = 2),
    ),
    ClientSearchScreen(key: _exploreScreenKey),
    const ClientBookingsScreen(),
    const ClientProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return ClientShellScope(
      goToExplore: () => goToExploreTab(),
      child: Scaffold(
        backgroundColor: AppColors.backgroundSecondary,
        body: Stack(
          children: [
            IndexedStack(index: _currentIndex, children: _screens),
            if (_showMapScreen)
              Positioned.fill(
                child: ClientMapScreen(
                  onBack: () => setState(() => _showMapScreen = false),
                ),
              ),
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
                border: Border.all(color: const Color(0xFFE6E3E2)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: ShellNavItem(
                      svgAsset: 'assets/icons/icon-house.svg',
                      label: 'Home',
                      isSelected: _currentIndex == 0,
                      onTap: () => setState(() => _currentIndex = 0),
                    ),
                  ),
                  Expanded(
                    child: ShellNavItem(
                      svgAsset: 'assets/icons/icon-search.svg',
                      label: 'Explore',
                      isSelected: _currentIndex == 1,
                      onTap: () => goToExploreTab(),
                    ),
                  ),
                  Expanded(
                    child: ShellNavItem(
                      svgAsset: 'assets/icons/icon-schedule.svg',
                      label: 'Bookings',
                      isSelected: _currentIndex == 2,
                      onTap: () => setState(() => _currentIndex = 2),
                    ),
                  ),
                  Expanded(
                    child: ShellNavItem(
                      svgAsset: 'assets/icons/icon-profile.svg',
                      label: 'Profile',
                      isSelected: _currentIndex == 3,
                      inactiveIconColor: AppColors.textPrimary,
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
