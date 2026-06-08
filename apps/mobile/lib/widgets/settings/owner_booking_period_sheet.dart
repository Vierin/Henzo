import 'package:flutter/material.dart';
import '../common/henzo_modal.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../models/studio.dart';
import '../../services/auth_service.dart';
import '../../services/cache/studio_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/show_api_error.dart';
import '../common/sheet_action_button_style.dart';
import 'settings_form_tokens.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// 4 weeks — default booking window for new studios.
const int kDefaultBookingPeriodDays = 30;
const int kMinBookingPeriodDays = 1;
const int kMaxBookingPeriodDays = 60;

int? extractBookingPeriodDays(Studio? studio) {
  final settings = studio?.reminderSettings;
  if (settings == null) return null;
  final raw = settings['bookingPeriodDays'];
  if (raw is int) return raw;
  if (raw is num) return raw.toInt();
  if (raw is String) return int.tryParse(raw);
  return null;
}

Future<bool> saveBookingPeriodDays(
  BuildContext context,
  Studio studio,
  int days,
) async {
  final token = context.read<AuthService>().accessToken;
  if (token == null || token.isEmpty) return false;
  try {
    final reminderSettings = <String, dynamic>{
      ...?studio.reminderSettings,
      'bookingPeriodDays': days,
    };
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
      if (studio.autoConfirmBookings != null)
        'autoConfirmBookings': studio.autoConfirmBookings,
      'reminderSettings': reminderSettings,
    };
    await DashboardApiService.updateCurrentStudio(token, payload);
    if (!context.mounted) return false;
    context.read<StudioCache>().invalidate();
    final loc = context.read<LocaleProvider>();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(loc.t('settings.owner.bookingPeriodSaved'))),
    );
    return true;
  } catch (e) {
    if (context.mounted) showApiError(context, e);
    return false;
  }
}

/// Bottom sheet: booking window (1–60 days).
Future<bool?> showOwnerBookingPeriodSheet(
  BuildContext context, {
  required Studio studio,
  int? initialDays,
}) async {
  final locale = context.read<LocaleProvider>();
  final startDays =
      initialDays ??
      extractBookingPeriodDays(studio) ??
      kDefaultBookingPeriodDays;

  return showHenzoModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) {
      int localDays = startDays;
      final controller = TextEditingController(text: localDays.toString());
      var applying = false;

      return StatefulBuilder(
        builder: (context, setModalState) {
          void applyDays(int value) {
            final clamped = value.clamp(
              kMinBookingPeriodDays,
              kMaxBookingPeriodDays,
            );
            localDays = clamped;
            controller.value = TextEditingValue(
              text: clamped.toString(),
              selection: TextSelection.collapsed(
                offset: clamped.toString().length,
              ),
            );
            setModalState(() {});
          }

          Future<void> onApply() async {
            if (applying) return;
            setModalState(() => applying = true);
            final ok = await saveBookingPeriodDays(context, studio, localDays);
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
                      locale.t('settings.owner.bookingPeriodTitle'),
                      style: TextStyle(
                        fontSize: 18.sp,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      locale.t('settings.owner.bookingPeriodHint'),
                      style: TextStyle(
                        fontSize: 13.sp,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        IconButton.outlined(
                          onPressed: applying
                              ? null
                              : () => applyDays(localDays - 1),
                          icon: const Icon(Icons.remove, size: 22),
                          style: IconButton.styleFrom(
                            fixedSize: const Size(48, 48),
                            padding: EdgeInsets.zero,
                            foregroundColor: AppColors.primary500,
                            side: const BorderSide(
                              color: AppColors.primary500,
                              width: 1.5,
                            ),
                            shape: const CircleBorder(),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(
                            controller: controller,
                            keyboardType: TextInputType.number,
                            textAlign: TextAlign.center,
                            enabled: !applying,
                            decoration: settingsInputDecoration(
                              hintText: locale.t(
                                'settings.owner.bookingPeriodDaysLabel',
                              ),
                            ),
                            onChanged: (value) {
                              final parsed = int.tryParse(value.trim());
                              if (parsed != null) applyDays(parsed);
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        IconButton.filled(
                          onPressed: applying
                              ? null
                              : () => applyDays(localDays + 1),
                          icon: const Icon(Icons.add),
                          style: IconButton.styleFrom(
                            fixedSize: const Size(48, 48),
                            padding: EdgeInsets.zero,
                            backgroundColor: AppColors.primary500,
                            foregroundColor: Colors.white,
                            shape: const CircleBorder(),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: SizedBox(
                            height: 46,
                            child: OutlinedButton(
                              onPressed: applying
                                  ? null
                                  : () => Navigator.of(sheetContext).pop(false),
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
