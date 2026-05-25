import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/brand_typography.dart';
import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import 'client_passes_tab.dart';
import 'client_schedule_tab.dart';

/// Bottom-nav Activity: upcoming and passes.
class ClientBookingsScreen extends StatefulWidget {
  const ClientBookingsScreen({super.key});

  @override
  State<ClientBookingsScreen> createState() => _ClientBookingsScreenState();
}

class _ClientBookingsScreenState extends State<ClientBookingsScreen>
    with SingleTickerProviderStateMixin {
  static const int _tabCount = 2;

  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabCount, vsync: this);
  }

  @override
  void reassemble() {
    super.reassemble();
    if (_tabController.length != _tabCount) {
      final index = _tabController.index.clamp(0, _tabCount - 1);
      _tabController.dispose();
      _tabController = TabController(
        length: _tabCount,
        vsync: this,
        initialIndex: index,
      );
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                kScreenPaddingHorizontal,
                12,
                kScreenPaddingHorizontal,
                20,
              ),
              child: Text(
                locale.t('clientActivity.title'),
                style: BrandTypography.greeting(context).copyWith(
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
          _ActivitySegmentedTabBar(
            controller: _tabController,
            upcomingLabel: locale.t('clientActivity.upcoming'),
            passesLabel: locale.t('clientActivity.passes'),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: const [ClientScheduleTab(), ClientPassesTab()],
            ),
          ),
        ],
      ),
    );
  }
}

/// Upcoming / Passes toggler — Browse-style track, sliding orange pill.
class _ActivitySegmentedTabBar extends StatefulWidget {
  const _ActivitySegmentedTabBar({
    required this.controller,
    required this.upcomingLabel,
    required this.passesLabel,
  });

  final TabController controller;
  final String upcomingLabel;
  final String passesLabel;

  @override
  State<_ActivitySegmentedTabBar> createState() =>
      _ActivitySegmentedTabBarState();
}

class _ActivitySegmentedTabBarState extends State<_ActivitySegmentedTabBar> {
  /// Matches Browse mode toggler (white track + inset pill).
  static const double _outerRadius = 14;
  static const double _innerRadius = 12;
  static const double _inset = 3;
  static const double _innerHeight = 38;
  static const Duration _tabAnimDuration = Duration(milliseconds: 280);

  TabController get _controller => widget.controller;

  double get _fraction {
    final animation = _controller.animation;
    if (animation != null) return animation.value.clamp(0.0, 1.0);
    return _controller.index.toDouble();
  }

  void _selectTab(int index) {
    if (_controller.index == index && !_controller.indexIsChanging) return;
    _controller.animateTo(
      index,
      duration: _tabAnimDuration,
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final animation = _controller.animation;
    final listenable = animation != null
        ? Listenable.merge([_controller, animation])
        : _controller;

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        kScreenPaddingHorizontal,
        0,
        kScreenPaddingHorizontal,
        8,
      ),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: AppColors.backgroundPrimary,
          borderRadius: BorderRadius.circular(_outerRadius),
        ),
        child: Padding(
          padding: const EdgeInsets.all(_inset),
          child: SizedBox(
            height: _innerHeight,
            width: double.infinity,
            child: AnimatedBuilder(
              animation: listenable,
              builder: (context, _) {
                final fraction = _fraction;
                return LayoutBuilder(
                  builder: (context, constraints) {
                    final tabWidth = constraints.maxWidth / 2;
                    final plateLeft = fraction * tabWidth;
                    final upcomingBlend = (1 - fraction).clamp(0.0, 1.0);
                    final passesBlend = fraction.clamp(0.0, 1.0);

                    return Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Transform.translate(
                          offset: Offset(plateLeft, 0),
                          child: Container(
                            width: tabWidth,
                            height: _innerHeight,
                            decoration: BoxDecoration(
                              color: AppColors.primary500,
                              borderRadius: BorderRadius.circular(
                                _innerRadius,
                              ),
                            ),
                          ),
                        ),
                        Row(
                          children: [
                            _segmentTab(
                              label: widget.upcomingLabel,
                              emphasis: upcomingBlend,
                              onTap: () => _selectTab(0),
                            ),
                            _segmentTab(
                              label: widget.passesLabel,
                              emphasis: passesBlend,
                              onTap: () => _selectTab(1),
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

  Widget _segmentTab({
    required String label,
    required double emphasis,
    required VoidCallback onTap,
  }) {
    final color = Color.lerp(
      AppColors.textPrimary,
      Colors.white,
      emphasis,
    )!;
    final fontWeight = emphasis > 0.5 ? FontWeight.w600 : FontWeight.w500;

    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: SizedBox(
          height: _innerHeight,
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 15,
                fontWeight: fontWeight,
                height: 1.1,
                color: color,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
