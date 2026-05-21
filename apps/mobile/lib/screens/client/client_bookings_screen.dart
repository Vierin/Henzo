import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/brand_typography.dart';
import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../widgets/common/henzo_header_back_button.dart';
import 'client_favorites_tab.dart';
import 'client_passes_tab.dart';
import 'client_schedule_tab.dart';

/// Bottom-nav Activity: upcoming, passes, favorites.
class ClientBookingsScreen extends StatefulWidget {
  const ClientBookingsScreen({super.key});

  @override
  State<ClientBookingsScreen> createState() => _ClientBookingsScreenState();
}

class _ClientBookingsScreenState extends State<ClientBookingsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
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
      appBar: AppBar(
        leading: henzoAppBarLeading(context),
        leadingWidth: 56,
        automaticallyImplyLeading: false,
        title: Text(
          locale.t('clientActivity.title'),
          style: BrandTypography.appBarTitle(context),
        ),
        centerTitle: false,
        backgroundColor: AppColors.backgroundSecondary,
        elevation: 0,
        scrolledUnderElevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary500,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.primary500,
          indicatorSize: TabBarIndicatorSize.tab,
          dividerColor: AppColors.borderPrimary,
          tabs: [
            Tab(text: locale.t('clientActivity.upcoming')),
            Tab(text: locale.t('clientActivity.passes')),
            Tab(text: locale.t('clientActivity.favorites')),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          ClientScheduleTab(),
          ClientPassesTab(),
          ClientFavoritesTab(),
        ],
      ),
    );
  }
}
