import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../services/auth_service.dart';
import '../services/push_notification_service.dart';
import '../widgets/client/browse_map_button.dart';
import '../widgets/shell/shell_nav_item.dart';
import 'client/client_bookings_screen.dart';
import 'client/client_profile_screen.dart';
import 'client/client_search_screen.dart';
import 'client/client_shell_scope.dart';
import 'client_map_screen.dart';
import 'public_home_screen.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class ClientShell extends StatefulWidget {
  const ClientShell({super.key});

  @override
  State<ClientShell> createState() => _ClientShellState();
}

class _ClientShellState extends State<ClientShell> {
  int _currentIndex = 0;
  final GlobalKey<ClientSearchScreenState> _exploreScreenKey =
      GlobalKey<ClientSearchScreenState>();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _registerPushToken());
  }

  Future<void> _registerPushToken() async {
    if (!mounted) return;
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;
    final locale = context.read<LocaleProvider>();
    await PushNotificationService.requestNotificationPermission();
    if (!mounted) return;
    PushNotificationService.registerToken(
      accessToken: token,
      language: locale.localeCode,
    );
  }

  void _openMapScreen() {
    unawaited(ClientMapScreen.open(context));
  }

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
      onOpenMap: _openMapScreen,
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
            if (_currentIndex == 1)
              Positioned(
                left: 0,
                right: 0,
                bottom: 6,
                child: Center(
                  child: BrowseMapButton(
                    label: locale.t('clientShell.map'),
                    onTap: _openMapScreen,
                  ),
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
              child: LayoutBuilder(
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
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }
}
