import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
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

  void goToExploreTab({int? categoryId, bool showClasses = true}) {
    setState(() => _currentIndex = 1);
    _exploreScreenKey.currentState?.ensureExploreLoaded();
    _exploreScreenKey.currentState?.applyBrowseListMode(
      showClasses: showClasses,
    );
    if (categoryId != null) {
      _exploreScreenKey.currentState?.selectCategory(categoryId);
    }
  }

  List<Widget> get _screens => [
    PublicHomeScreen(
      onOpenMap: () => setState(() => _showMapScreen = true),
      onOpenBrowseStudios: () => goToExploreTab(showClasses: false),
      onOpenBrowseClasses: () => goToExploreTab(showClasses: true),
      onCategorySelected: (id) => goToExploreTab(categoryId: id),
      onOpenBookings: () => setState(() => _currentIndex = 2),
    ),
    ClientSearchScreen(key: _exploreScreenKey),
    const ClientBookingsScreen(),
    const ClientProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();

    return ClientShellScope(
      goToExplore: ({bool showClasses = true}) =>
          goToExploreTab(showClasses: showClasses),
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
                border: Border.all(color: const Color(0xFFE6E3E2), width: 1),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: ShellNavItem(
                      svgAsset: 'assets/icons/icon-house.svg',
                      label: locale.t('clientShell.home'),
                      isSelected: _currentIndex == 0,
                      onTap: () => setState(() => _currentIndex = 0),
                    ),
                  ),
                  Expanded(
                    child: ShellNavItem(
                      svgAsset: 'assets/icons/icon-search.svg',
                      label: locale.t('clientShell.browse'),
                      isSelected: _currentIndex == 1,
                      onTap: () => goToExploreTab(showClasses: true),
                    ),
                  ),
                  Expanded(
                    child: ShellNavItem(
                      svgAsset: 'assets/icons/icon-schedule.svg',
                      label: locale.t('clientShell.activity'),
                      isSelected: _currentIndex == 2,
                      onTap: () => setState(() => _currentIndex = 2),
                    ),
                  ),
                  Expanded(
                    child: ShellNavItem(
                      svgAsset: 'assets/icons/icon-profile-large.svg',
                      label: locale.t('clientShell.profile'),
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
