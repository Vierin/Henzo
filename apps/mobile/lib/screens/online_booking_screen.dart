import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../models/studio.dart';
import '../../services/auth_service.dart';
import '../../services/cache/studio_cache.dart';
import '../../utils/show_api_error.dart';
import '../../widgets/common/henzo_header_back_button.dart';
import '../../widgets/settings/owner_booking_period_sheet.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class OnlineBookingScreen extends StatefulWidget {
  const OnlineBookingScreen({super.key});

  @override
  State<OnlineBookingScreen> createState() => _OnlineBookingScreenState();
}

class _OnlineBookingScreenState extends State<OnlineBookingScreen> {
  Studio? _studio;
  bool _loading = true;
  int _bookingPeriodDays = kDefaultBookingPeriodDays;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadStudio());
  }

  Future<void> _loadStudio() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    try {
      final studio = await context.read<StudioCache>().getStudio(token);
      if (!mounted) return;
      setState(() {
        _studio = studio;
        _bookingPeriodDays =
            extractBookingPeriodDays(studio) ?? kDefaultBookingPeriodDays;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      showApiError(context, e);
    }
  }

  Future<void> _openBookingPeriodModal() async {
    final studio = _studio;
    if (studio == null) return;
    final changed = await showOwnerBookingPeriodSheet(
      context,
      studio: studio,
      initialDays: _bookingPeriodDays,
    );
    if (changed == true && mounted) await _loadStudio();
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
        title: Text(locale.t('settings.owner.onlineBooking')),
        backgroundColor: AppColors.backgroundPrimary,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary500),
            )
          : ListView(
              padding: const EdgeInsets.all(12),
              children: [
                Material(
                  color: AppColors.backgroundPrimary,
                  borderRadius: BorderRadius.circular(12),
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(
                    onTap: _studio == null ? null : _openBookingPeriodModal,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 14,
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              locale.t('settings.owner.bookingPeriodTitle'),
                              style: TextStyle(
                                fontSize: 15.sp,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                          Text(
                            locale
                                .t('settings.owner.bookingWindowDays')
                                .replaceAll('{count}', '$_bookingPeriodDays'),
                            style: TextStyle(
                              fontSize: 14.sp,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(
                            Icons.chevron_right,
                            size: 20,
                            color: AppColors.textSecondary,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
