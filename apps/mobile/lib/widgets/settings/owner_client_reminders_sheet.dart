import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../models/studio.dart';
import '../../services/auth_service.dart';
import '../../services/cache/studio_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/show_api_error.dart';
import '../common/henzo_modal.dart';
import '../common/sheet_action_button_style.dart';
import '../training/training_time_picker_sheet.dart';

const int kMinReminderHours = 1;
const int kMaxReminderHours = 48;

/// One configurable client reminder rule.
class ClientReminderRule {
  ClientReminderRule({
    required this.enabled,
    required this.mode,
    required this.hours,
    required this.time,
  });

  bool enabled;
  String mode; // 'hoursBefore' | 'eveningBefore'
  int hours;
  TimeOfDay time;

  Map<String, dynamic> toJson() => mode == 'eveningBefore'
      ? {
          'mode': 'eveningBefore',
          'time': trainingTimeToHm(time),
          'enabled': enabled,
        }
      : {'mode': 'hoursBefore', 'hours': hours, 'enabled': enabled};

  ClientReminderRule copy() => ClientReminderRule(
        enabled: enabled,
        mode: mode,
        hours: hours,
        time: time,
      );
}

ClientReminderRule _ruleFromJson(Map<String, dynamic> j) {
  final mode = j['mode'] == 'eveningBefore' ? 'eveningBefore' : 'hoursBefore';
  final enabled = j['enabled'] != false;
  final hoursRaw = j['hours'];
  final hours = hoursRaw is num
      ? hoursRaw.toInt()
      : int.tryParse('${hoursRaw ?? ''}') ?? 24;
  final timeStr = j['time'] is String ? j['time'] as String : '20:00';
  final parts = timeStr.split(':');
  final tod = TimeOfDay(
    hour: int.tryParse(parts.isNotEmpty ? parts[0] : '') ?? 20,
    minute: parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0,
  );
  return ClientReminderRule(
    enabled: enabled,
    mode: mode,
    hours: hours.clamp(kMinReminderHours, kMaxReminderHours),
    time: tod,
  );
}

/// Reads the studio's two reminder slots (defaults: 24h + 1h, both on).
List<ClientReminderRule> extractClientReminders(Studio? studio) {
  final defaults = [
    ClientReminderRule(
      enabled: true,
      mode: 'hoursBefore',
      hours: 24,
      time: const TimeOfDay(hour: 20, minute: 0),
    ),
    ClientReminderRule(
      enabled: true,
      mode: 'hoursBefore',
      hours: 1,
      time: const TimeOfDay(hour: 20, minute: 0),
    ),
  ];
  final raw = studio?.reminderSettings?['clientReminders'];
  if (raw is! List || raw.isEmpty) return defaults;

  final rules = <ClientReminderRule>[];
  for (final e in raw.take(2)) {
    if (e is Map) rules.add(_ruleFromJson(Map<String, dynamic>.from(e)));
  }
  while (rules.length < 2) {
    final d = defaults[rules.length];
    rules.add(
      ClientReminderRule(
        enabled: false,
        mode: d.mode,
        hours: d.hours,
        time: d.time,
      ),
    );
  }
  return rules;
}

/// Short summary of enabled reminders for the settings row trailing text.
String clientRemindersSummary(Studio? studio, LocaleProvider locale) {
  final rules = extractClientReminders(studio).where((r) => r.enabled);
  final parts = rules
      .map(
        (r) => r.mode == 'eveningBefore'
            ? trainingTimeToHm(r.time)
            : locale
                .t('settings.owner.reminderHoursShort')
                .replaceAll('{h}', '${r.hours}'),
      )
      .toList();
  return parts.join(', ');
}

Future<bool> _saveClientReminders(
  BuildContext context,
  Studio studio,
  List<ClientReminderRule> rules,
) async {
  final token = context.read<AuthService>().accessToken;
  if (token == null || token.isEmpty) return false;
  try {
    final reminderSettings = <String, dynamic>{
      ...?studio.reminderSettings,
      'clientReminders': rules.map((r) => r.toJson()).toList(),
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
      SnackBar(content: Text(loc.t('settings.owner.clientRemindersSaved'))),
    );
    return true;
  } catch (e) {
    if (context.mounted) showApiError(context, e);
    return false;
  }
}

/// Bottom sheet: configure up to two pre-class reminders sent to clients.
Future<bool?> showOwnerClientRemindersSheet(
  BuildContext context, {
  required Studio studio,
}) async {
  final locale = context.read<LocaleProvider>();
  final rules = extractClientReminders(studio).map((r) => r.copy()).toList();

  return showHenzoModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) {
      var applying = false;

      return StatefulBuilder(
        builder: (context, setModalState) {
          Future<void> onApply() async {
            if (applying) return;
            setModalState(() => applying = true);
            final ok = await _saveClientReminders(context, studio, rules);
            if (!sheetContext.mounted) return;
            setModalState(() => applying = false);
            if (ok) Navigator.of(sheetContext).pop(true);
          }

          Widget modeButton({
            required String label,
            required bool selected,
            required VoidCallback onTap,
          }) {
            return Expanded(
              child: GestureDetector(
                onTap: applying ? null : onTap,
                child: Container(
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: selected
                        ? AppColors.primary500
                        : AppColors.backgroundSecondary,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: selected
                          ? AppColors.primary500
                          : AppColors.borderPrimary,
                    ),
                  ),
                  child: Text(
                    label,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12.sp,
                      fontWeight: FontWeight.w600,
                      color: selected ? Colors.white : AppColors.textPrimary,
                    ),
                  ),
                ),
              ),
            );
          }

          Widget ruleEditor(int index) {
            final rule = rules[index];
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.backgroundSecondary,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          locale
                              .t('settings.owner.reminderSlot')
                              .replaceAll('{n}', '${index + 1}'),
                          style: TextStyle(
                            fontSize: 14.sp,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      Switch(
                        value: rule.enabled,
                        activeThumbColor: AppColors.primary500,
                        onChanged: applying
                            ? null
                            : (v) => setModalState(() => rule.enabled = v),
                      ),
                    ],
                  ),
                  if (rule.enabled) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        modeButton(
                          label: locale.t('settings.owner.reminderModeHours'),
                          selected: rule.mode == 'hoursBefore',
                          onTap: () =>
                              setModalState(() => rule.mode = 'hoursBefore'),
                        ),
                        const SizedBox(width: 8),
                        modeButton(
                          label: locale.t('settings.owner.reminderModeEvening'),
                          selected: rule.mode == 'eveningBefore',
                          onTap: () =>
                              setModalState(() => rule.mode = 'eveningBefore'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (rule.mode == 'hoursBefore')
                      Row(
                        children: [
                          IconButton.outlined(
                            onPressed: applying
                                ? null
                                : () => setModalState(() {
                                    rule.hours = (rule.hours - 1).clamp(
                                      kMinReminderHours,
                                      kMaxReminderHours,
                                    );
                                  }),
                            icon: const Icon(Icons.remove, size: 20),
                            style: IconButton.styleFrom(
                              fixedSize: const Size(44, 44),
                              foregroundColor: AppColors.primary500,
                              side: const BorderSide(
                                color: AppColors.primary500,
                                width: 1.5,
                              ),
                              shape: const CircleBorder(),
                            ),
                          ),
                          Expanded(
                            child: Text(
                              locale
                                  .t('settings.owner.reminderHoursValue')
                                  .replaceAll('{h}', '${rule.hours}'),
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 15.sp,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                          IconButton.filled(
                            onPressed: applying
                                ? null
                                : () => setModalState(() {
                                    rule.hours = (rule.hours + 1).clamp(
                                      kMinReminderHours,
                                      kMaxReminderHours,
                                    );
                                  }),
                            icon: const Icon(Icons.add, size: 20),
                            style: IconButton.styleFrom(
                              fixedSize: const Size(44, 44),
                              backgroundColor: AppColors.primary500,
                              foregroundColor: Colors.white,
                              shape: const CircleBorder(),
                            ),
                          ),
                        ],
                      )
                    else
                      InkWell(
                        borderRadius: BorderRadius.circular(10),
                        onTap: applying
                            ? null
                            : () async {
                                final picked = await showTrainingTimePickerSheet(
                                  context,
                                  rule.time,
                                );
                                if (picked != null) {
                                  setModalState(() => rule.time = picked);
                                }
                              },
                        child: Container(
                          height: 46,
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          decoration: BoxDecoration(
                            color: AppColors.backgroundPrimary,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.borderPrimary),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  locale.t('settings.owner.reminderTimeLabel'),
                                  style: TextStyle(
                                    fontSize: 14.sp,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ),
                              Text(
                                trainingTimeToHm(rule.time),
                                style: TextStyle(
                                  fontSize: 15.sp,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const Icon(
                                Icons.chevron_right,
                                color: AppColors.textSecondary,
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ],
              ),
            );
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
                      locale.t('settings.owner.clientRemindersTitle'),
                      style: TextStyle(
                        fontSize: 18.sp,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      locale.t('settings.owner.clientRemindersDescription'),
                      style: TextStyle(
                        fontSize: 13.sp,
                        height: 1.35,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 16),
                    ruleEditor(0),
                    ruleEditor(1),
                    const SizedBox(height: 8),
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
