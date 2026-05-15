import 'package:flutter/material.dart';

import '../../constants/brand_typography.dart';
import '../../constants/colors.dart';
import 'client_schedule_tab.dart';

/// Bottom-nav «Bookings» — upcoming client schedule.
class ClientBookingsScreen extends StatelessWidget {
  const ClientBookingsScreen({super.key});

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
      ),
      body: const ClientScheduleTab(),
    );
  }
}
