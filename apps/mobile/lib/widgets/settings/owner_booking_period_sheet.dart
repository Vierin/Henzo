import 'package:flutter/material.dart';
import '../common/henzo_modal.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../models/salon.dart';
import '../../services/auth_service.dart';
import '../../services/cache/salon_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/show_api_error.dart';
import '../common/sheet_action_button_style.dart';
import 'settings_form_tokens.dart';

/// 4 weeks — default booking window for new studios.
const int kDefaultBookingPeriodDays = 28;
const int kMinBookingPeriodDays = 1;
const int kMaxBookingPeriodDays = 60;

int? extractBookingPeriodDays(Salon? salon) {
  final settings = salon?.reminderSettings;
  if (settings == null) return null;
  final raw = settings['bookingPeriodDays'];
  if (raw is int) return raw;
  if (raw is num) return raw.toInt();
  if (raw is String) return int.tryParse(raw);
  return null;
}

Future<bool> saveBookingPeriodDays(
  BuildContext context,
  Salon salon,
  int days,
) async {
  final token = context.read<AuthService>().accessToken;
  if (token == null || token.isEmpty) return false;
  try {
    final reminderSettings = <String, dynamic>{
      ...?salon.reminderSettings,
      'bookingPeriodDays': days,
    };
    final payload = <String, dynamic>{
      'name': salon.name ?? '',
      if (salon.description != null) 'description': salon.description,
      if (salon.address != null) 'address': salon.address,
      if (salon.phone != null) 'phone': salon.phone,
      if (salon.email != null) 'email': salon.email,
      if (salon.website != null) 'website': salon.website,
      if (salon.instagram != null) 'instagram': salon.instagram,
      if (salon.photos != null) 'photos': salon.photos,
      if (salon.workingHours != null) 'workingHours': salon.workingHours,
      if (salon.latitude != null) 'latitude': salon.latitude,
      if (salon.longitude != null) 'longitude': salon.longitude,
      if (salon.autoConfirmBookings != null)
        'autoConfirmBookings': salon.autoConfirmBookings,
      'reminderSettings': reminderSettings,
    };
    await DashboardApiService.updateCurrentSalon(token, payload);
    if (!context.mounted) return false;
    context.read<SalonCache>().invalidate();
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
  required Salon salon,
  int? initialDays,
}) async {
  final locale = context.read<LocaleProvider>();
  final startDays =
      initialDays ??
      extractBookingPeriodDays(salon) ??
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
            final ok = await saveBookingPeriodDays(context, salon, localDays);
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
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      locale.t('settings.owner.bookingPeriodHint'),
                      style: const TextStyle(
                        fontSize: 13,
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
                              labelText: locale.t(
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
