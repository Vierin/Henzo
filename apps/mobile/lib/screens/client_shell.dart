import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../services/auth_service.dart';
import '../services/client_favorites_store.dart';
import '../widgets/client/client_nav_item.dart';
import 'client/client_favorites_screen.dart';
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

  void goToExploreTab() {
    setState(() => _currentIndex = 1);
    _exploreScreenKey.currentState?.ensureExploreLoaded();
  }

  List<Widget> get _screens => [
    PublicHomeScreen(
      onOpenMap: () => setState(() {
        _showMapScreen = true;
      }),
    ),
    ClientSearchScreen(key: _exploreScreenKey),
    const ClientFavoritesScreen(),
    const ClientProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return ClientShellScope(
      goToExplore: goToExploreTab,
      child: Scaffold(
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
          color: AppColors.backgroundPrimary,
          child: SafeArea(
            top: false,
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.backgroundPrimary,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 8,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              constraints: const BoxConstraints(minHeight: 42, maxHeight: 56),
              padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 6),
              child: Row(
              children: [
                Expanded(
                  child: ClientNavItem(
                    icon: Icons.home_outlined,
                    activeIcon: Icons.home,
                    label: 'Home',
                    isSelected: _currentIndex == 0,
                    onTap: () => setState(() => _currentIndex = 0),
                  ),
                ),
                Expanded(
                  child: ClientNavItem(
                    icon: Icons.search_outlined,
                    activeIcon: Icons.search,
                    label: 'Explore',
                    isSelected: _currentIndex == 1,
                    onTap: () {
                      setState(() => _currentIndex = 1);
                      _exploreScreenKey.currentState?.ensureExploreLoaded();
                    },
                  ),
                ),
                Expanded(
                  child: ClientNavItem(
                    icon: Icons.favorite_border,
                    activeIcon: Icons.favorite,
                    label: 'Favorites',
                    isSelected: _currentIndex == 2,
                    onTap: () {
                      setState(() => _currentIndex = 2);
                      final t = context.read<AuthService>().accessToken;
                      context.read<ClientFavoritesStore>().sync(t, force: false);
                    },
                  ),
                ),
                Expanded(
                  child: ClientNavItem(
                    icon: Icons.person_outline,
                    activeIcon: Icons.person,
                    label: 'Profile',
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
