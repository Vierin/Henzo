import 'package:flutter/material.dart';

import '../../constants/brand_typography.dart';
import '../../constants/colors.dart';
import 'client_passes_tab.dart';
import 'client_schedule_tab.dart';

/// Bottom-nav Bookings: upcoming schedule + passes history.
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
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        title: Text(
          'Bookings',
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
          tabs: const [
            Tab(text: 'Upcoming'),
            Tab(text: 'Passes'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          ClientScheduleTab(),
          ClientPassesTab(),
        ],
      ),
    );
  }
}
