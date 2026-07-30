import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../models/studio.dart';
import '../../services/auth_service.dart';
import '../../services/cache/studio_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/show_api_error.dart';
import '../common/henzo_modal.dart';
import '../common/sheet_action_button_style.dart';

Future<bool> saveAutoConfirmBookings(
  BuildContext context,
  Studio studio,
  bool autoConfirm,
) async {
  final token = context.read<AuthService>().accessToken;
  if (token == null || token.isEmpty) return false;
  try {
    final payload = <String, dynamic>{
      'name': studio.name ?? '',
      if (studio.description != null) 'description': studio.description,
      if (studio.address != null) 'address': studio.address,
      if (studio.phone != null) 'phone': studio.phone,
      if (studio.email != null && studio.email!.trim().isNotEmpty)
        'email': studio.email,
      if (studio.website != null) 'website': studio.website,
      if (studio.instagram != null) 'instagram': studio.instagram,
      if (studio.photos != null) 'photos': studio.photos,
      if (studio.workingHours != null) 'workingHours': studio.workingHours,
      if (studio.latitude != null) 'latitude': studio.latitude,
      if (studio.longitude != null) 'longitude': studio.longitude,
      if (studio.reminderSettings != null)
        'reminderSettings': studio.reminderSettings,
      'autoConfirmBookings': autoConfirm,
    };
    await DashboardApiService.updateCurrentStudio(token, payload);
    if (!context.mounted) return false;
    context.read<StudioCache>().invalidate();
    final loc = context.read<LocaleProvider>();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(loc.t('settings.owner.autoConfirmBookingsSaved'))),
    );
    return true;
  } catch (e) {
    if (context.mounted) showApiError(context, e);
    return false;
  }
}

String autoConfirmBookingsSummary(Studio? studio, LocaleProvider locale) {
  final on = studio?.autoConfirmBookings ?? true;
  return on
      ? locale.t('settings.owner.autoConfirmOn')
      : locale.t('settings.owner.autoConfirmOff');
}

Future<bool?> showOwnerAutoConfirmSheet(
  BuildContext context, {
  required Studio studio,
}) async {
  final locale = context.read<LocaleProvider>();
  final startValue = studio.autoConfirmBookings ?? true;

  return showHenzoModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) {
      var localValue = startValue;
      var applying = false;

      return StatefulBuilder(
        builder: (context, setModalState) {
          Future<void> onApply() async {
            if (applying) return;
            setModalState(() => applying = true);
            final ok = await saveAutoConfirmBookings(
              context,
              studio,
              localValue,
            );
            if (!sheetContext.mounted) return;
            setModalState(() => applying = false);
            if (ok) Navigator.of(sheetContext).pop(true);
          }

          return SafeArea(
            top: false,
            child: Container(
              margin: const EdgeInsets.only(top: 24),
              decoration: const BoxDecoration(
                color: AppColors.backgroundPrimary,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Padding(
                padding: EdgeInsets.fromLTRB(
                  16,
                  16,
                  16,
                  16 + MediaQuery.of(context).viewInsets.bottom,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      locale.t('settings.owner.autoConfirmBookings'),
                      style: TextStyle(
                        fontSize: 18.sp,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      locale.t(
                        'settings.owner.autoConfirmBookingsDescription',
                      ),
                      style: TextStyle(
                        fontSize: 13.sp,
                        height: 1.35,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    SwitchListTile.adaptive(
                      contentPadding: EdgeInsets.zero,
                      title: Text(
                        localValue
                            ? locale.t('settings.owner.autoConfirmOn')
                            : locale.t('settings.owner.autoConfirmOff'),
                        style: TextStyle(
                          fontSize: 15.sp,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      value: localValue,
                      activeTrackColor: AppColors.primary500,
                      onChanged: applying
                          ? null
                          : (v) => setModalState(() => localValue = v),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: SizedBox(
                            height: 46,
                            child: OutlinedButton(
                              onPressed: applying
                                  ? null
                                  : () =>
                                        Navigator.of(sheetContext).pop(false),
                              style: sheetCancelButtonStyle(),
                              child: Text(locale.t('common.cancel')),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: SizedBox(
                            height: 46,
                            child: FilledButton(
                              onPressed: applying ? null : onApply,
                              style: sheetPrimaryButtonStyle(),
                              child: applying
                                  ? const SizedBox(
                                      height: 20,
                                      width: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : Text(locale.t('common.save')),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      );
    },
  );
}
