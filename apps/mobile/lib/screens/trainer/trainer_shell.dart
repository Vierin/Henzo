import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../services/auth_service.dart';
import '../../services/push_notification_service.dart';
import '../../widgets/shell/shell_nav_item.dart';
import '../calendar_screen.dart';
import '../dashboard/dashboard_screen.dart';
import 'trainer_profile_screen.dart';

class TrainerShell extends StatefulWidget {
  const TrainerShell({super.key});

  @override
  State<TrainerShell> createState() => TrainerShellState();
}

class TrainerShellState extends State<TrainerShell> {
  static const int scheduleTabIndex = 1;

  int _currentIndex = 0;
  final GlobalKey<CalendarScreenState> _scheduleCalendarKey =
      GlobalKey<CalendarScreenState>();

  late final List<Widget> _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = [
      const DashboardScreen(trainerMode: true),
      CalendarScreen(key: _scheduleCalendarKey, trainerMode: true),
      const TrainerProfileScreen(),
    ];
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _registerPush();
    });
  }

  void openScheduleTabForToday() {
    setState(() => _currentIndex = scheduleTabIndex);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scheduleCalendarKey.currentState?.ensureSessionsLoaded();
      _scheduleCalendarKey.currentState?.jumpToToday();
    });
  }

  Future<void> _registerPush() async {
    final token = context.read<AuthService>().accessToken;
    final locale = context.read<LocaleProvider>();
    if (token == null) return;
    await PushNotificationService.requestNotificationPermission();
    if (!mounted) return;
    await PushNotificationService.registerToken(
      accessToken: token,
      language: locale.localeCode,
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final t = locale.t;

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: IndexedStack(index: _currentIndex, children: _tabs),
      bottomNavigationBar: ColoredBox(
        color: AppColors.backgroundSecondary,
        child: SafeArea(
          top: false,
          minimum: const EdgeInsets.fromLTRB(10, 10, 10, 18),
          child: Container(
            height: 70,
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.backgroundPrimary,
              borderRadius: BorderRadius.circular(16),
            ),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final itemWidth = constraints.maxWidth / 3;
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
                            label: t('shell.tabHome'),
                            isSelected: _currentIndex == 0,
                            onTap: () => setState(() => _currentIndex = 0),
                          ),
                        ),
                        Expanded(
                          child: ShellNavItem(
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
                          child: ShellNavItem(
                            svgAsset: 'assets/icons/icon-profile-large.svg',
                            label: t('clientShell.profile'),
                            isSelected: _currentIndex == 2,
                            onTap: () => setState(() => _currentIndex = 2),
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
    );
  }
}
