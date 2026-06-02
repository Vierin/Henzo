import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../constants/layout.dart';
import '../l10n/locale_provider.dart';
import '../models/salon.dart';
import '../models/staff_member.dart';
import '../models/training_location_item.dart';
import '../services/auth_service.dart';
import '../services/cache/salon_cache.dart';
import '../services/cache/owner_sessions_cache.dart';
import '../services/dashboard_api_service.dart';
import '../services/staff_api_service.dart';
import '../utils/show_api_error.dart';
import '../utils/training_locations_storage.dart';
import '../widgets/address_picker_modal.dart';
import '../widgets/auth/auth_form_styles.dart';
import '../widgets/common/henzo_modal.dart';
import '../widgets/schedule_style_date_picker.dart';
import '../widgets/settings/branded_settings_app_bar.dart';
import '../widgets/training/owner_session_cancel_scope_dialog.dart';
import '../widgets/training/training_location_picker_sheet.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Matches [AddTrainingScreen] step-2 pickers.
const Color _kFormAccentPurple = Color(0xFF6C5CE7);
const double _kFieldRadius = 12;

/// Редактирование одного слота (время, место, тренер, отмена).
class OwnerEditTrainingSessionScreen extends StatefulWidget {
  const OwnerEditTrainingSessionScreen({super.key});

  @override
  State<OwnerEditTrainingSessionScreen> createState() =>
      _OwnerEditTrainingSessionScreenState();
}

class _OwnerEditTrainingSessionScreenState
    extends State<OwnerEditTrainingSessionScreen> {
  OwnerTrainingSession? _initial;
  late DateTime _sessionDate;
  late TimeOfDay _sessionTime;
  String? _trainerId;
  String _selectedLocationId = 'default';
  List<StaffMember> _trainers = [];
  List<TrainingLocationItem> _locations = [];
  Salon? _salon;
  bool _loadingTrainers = true;
  bool _saving = false;

  DateTime get _startsAt => DateTime(
    _sessionDate.year,
    _sessionDate.month,
    _sessionDate.day,
    _sessionTime.hour,
    _sessionTime.minute,
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initial != null) return;
    final raw = ModalRoute.of(context)?.settings.arguments;
    if (raw is Map) {
      try {
        final m = Map<String, dynamic>.from(raw);
        _initial = OwnerTrainingSession.fromRouteArgs(m);
        final local = _initial!.startsAt.toLocal();
        _sessionDate = DateTime(local.year, local.month, local.day);
        _sessionTime = TimeOfDay.fromDateTime(local);
        _trainerId = _initial!.trainerId;
        _selectedLocationId = _effectiveLocationId(_initial!.locationId);
      } catch (_) {
        _initial = null;
      }
    }
    if (_initial != null) {
      _loadTrainers();
    }
  }

  Future<void> _loadTrainers() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) {
        setState(() => _loadingTrainers = false);
      }
      return;
    }
    try {
      final salon = await context.read<SalonCache>().getSalon(token);
      if (salon == null || !mounted) {
        setState(() => _loadingTrainers = false);
        return;
      }
      final locale = context.read<LocaleProvider>();
      final list = await StaffApiService.getBySalon(token, salon.id);
      final locations = TrainingLocationItem.listFromSalon(
        salon,
        mainStudioName: locale.t('locations.mainStudio'),
      );
      var selectedLocationId = _selectedLocationId;
      if (!locations.any((l) => l.id == selectedLocationId)) {
        selectedLocationId =
            locations.isNotEmpty ? locations.first.id : 'default';
      }
      var selectedTrainerId = _trainerId?.trim();
      if (selectedTrainerId != null && selectedTrainerId.isEmpty) {
        selectedTrainerId = null;
      }
      if (selectedTrainerId == null) {
        final currentName = _initial?.trainerName.trim() ?? '';
        if (!_isTrainerNamePlaceholder(currentName)) {
          final matched = list.where(
            (t) => t.name.trim().toLowerCase() == currentName.toLowerCase(),
          );
          if (matched.isNotEmpty) {
            selectedTrainerId = matched.first.id;
          }
        }
      } else if (!list.any((t) => t.id == selectedTrainerId)) {
        // Keep id from session even if not in roster (API may still accept it).
        selectedTrainerId = _trainerId?.trim();
      }
      if (!mounted) return;
      setState(() {
        _salon = salon;
        _trainers = list;
        _trainerId = selectedTrainerId;
        _locations = locations;
        _selectedLocationId = selectedLocationId;
        _loadingTrainers = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() => _loadingTrainers = false);
      }
    }
  }

  String _effectiveLocationId(String? raw) {
    final id = raw?.trim();
    if (id == null || id.isEmpty) return 'default';
    return id;
  }

  TrainingLocationItem? get _selectedLocation {
    for (final l in _locations) {
      if (l.id == _selectedLocationId) return l;
    }
    return null;
  }

  String _formatYMMMd(DateTime d, LocaleProvider loc) =>
      DateFormat.yMMMd(loc.localeCode).format(d);

  String _timeToHm(TimeOfDay t) {
    final hh = t.hour.toString().padLeft(2, '0');
    final mm = t.minute.toString().padLeft(2, '0');
    return '$hh:$mm';
  }

  Widget _formLabel(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 10, left: 12),
    child: Text(
      text.toUpperCase(),
      style: TextStyle(
        fontSize: 13.sp,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.3,
        color: AppColors.textPrimary,
      ),
    ),
  );

  Future<void> _pickSessionDate() async {
    final picked = await showScheduleStyleDatePicker(
      context: context,
      initialDate: _sessionDate,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
    );
    if (picked != null && mounted) {
      setState(() {
        _sessionDate = DateTime(picked.year, picked.month, picked.day);
      });
    }
  }

  Future<TimeOfDay?> _pickTimeWithWheel(TimeOfDay initialTime) {
    var selected = initialTime;
    final initialDateTime = DateTime(
      2000,
      1,
      1,
      initialTime.hour,
      initialTime.minute,
    );
    final loc = context.read<LocaleProvider>();
    return showHenzoModalBottomSheet<TimeOfDay>(
      context: context,
      backgroundColor: AppColors.backgroundPrimary,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: SizedBox(
            height: 320,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 6),
                  child: Row(
                    children: [
                      TextButton(
                        onPressed: () => Navigator.of(ctx).pop(),
                        child: Text(loc.t('common.cancel')),
                      ),
                      const Spacer(),
                      TextButton(
                        onPressed: () => Navigator.of(ctx).pop(selected),
                        child: Text(
                          loc.t('common.done'),
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),
                Expanded(
                  child: CupertinoDatePicker(
                    mode: CupertinoDatePickerMode.time,
                    use24hFormat: true,
                    minuteInterval: 5,
                    initialDateTime: initialDateTime,
                    onDateTimeChanged: (value) {
                      selected = TimeOfDay(
                        hour: value.hour,
                        minute: value.minute,
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _openLocationPicker(LocaleProvider locale) async {
    if (_locations.isEmpty && _salon != null) {
      _locations = TrainingLocationItem.listFromSalon(
        _salon,
        mainStudioName: locale.t('locations.mainStudio'),
      );
    }
    if (_locations.isEmpty) return;

    final result = await showTrainingLocationPickerSheet(
      context,
      locations: _locations,
      selectedId: _selectedLocationId,
      titleL10nKey: 'addTraining.locationSheetTitle',
      onDeleteLocation: _deleteTrainingLocation,
    );
    if (!mounted || result == null) return;

    switch (result) {
      case TrainingLocationPicked(:final location):
        setState(() => _selectedLocationId = location.id);
      case TrainingLocationAddRequested():
        await _addNewTrainingLocation(locale);
    }
  }

  Future<bool> _deleteTrainingLocation(TrainingLocationItem loc) async {
    final studio = _salon;
    if (studio == null || loc.id == 'default') return false;

    final updated = _locations.where((l) => l.id != loc.id).toList();
    try {
      final updatedSalon = await persistExtraTrainingLocations(
        context,
        studio,
        updated,
      );
      if (!mounted) return false;
      final locale = context.read<LocaleProvider>();
      setState(() {
        _salon = updatedSalon ?? studio;
        _locations = TrainingLocationItem.listFromSalon(
          _salon,
          mainStudioName: locale.t('locations.mainStudio'),
        );
        if (_selectedLocationId == loc.id && _locations.isNotEmpty) {
          _selectedLocationId = _locations.first.id;
        }
      });
      return true;
    } catch (e) {
      if (mounted) showApiError(context, e);
      return false;
    }
  }

  Future<void> _addNewTrainingLocation(LocaleProvider locale) async {
    final studio = _salon;
    if (studio == null) return;

    final selection = await AddressPickerModal.show(
      context,
      initialAddress: '',
    );
    if (!mounted || selection == null) return;

    final newLoc = TrainingLocationItem(
      id: 'loc_${DateTime.now().millisecondsSinceEpoch}',
      name: selection.locationName,
      address: selection.address.trim(),
      latitude: selection.lat,
      longitude: selection.lon,
    );
    final updatedList = [..._locations, newLoc];

    try {
      final updatedSalon = await persistExtraTrainingLocations(
        context,
        studio,
        updatedList,
      );
      if (!mounted) return;
      setState(() {
        _salon = updatedSalon ?? studio;
        _locations = TrainingLocationItem.listFromSalon(
          _salon,
          mainStudioName: locale.t('locations.mainStudio'),
        );
        _selectedLocationId = newLoc.id;
      });
    } catch (e) {
      if (mounted) showApiError(context, e);
    }
  }

  String _locationDisplayName(LocaleProvider locale) {
    final selected = _selectedLocation;
    if (_loadingTrainers) {
      final n = _initial?.locationName?.trim();
      if (n != null && n.isNotEmpty) return n;
      return locale.t('common.loading');
    }
    if (selected?.name.trim().isNotEmpty == true) return selected!.name;
    final n = _initial?.locationName?.trim();
    if (n != null && n.isNotEmpty) return n;
    return locale.t('addTraining.studioNameFallback');
  }

  static final TextStyle _compactCaptionStyle = TextStyle(
    fontSize: 11.sp,
    fontWeight: FontWeight.w600,
    color: AppColors.textSecondary,
  );

  static final TextStyle _compactValueStyle = TextStyle(
    fontSize: 14.sp,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
  );

  Widget _locationField({
    required LocaleProvider locale,
    required bool canEdit,
  }) {
    final displayName = _locationDisplayName(locale);
    final address = _selectedLocation?.address.trim() ?? '';

    return Material(
      color: AppColors.backgroundPrimary,
      borderRadius: BorderRadius.circular(_kFieldRadius),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: canEdit ? () => _openLocationPicker(locale) : null,
        borderRadius: BorderRadius.circular(_kFieldRadius),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: SvgPicture.asset(
                  'assets/icons/icon-pin.svg',
                  width: 15,
                  height: 21,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      displayName,
                      style: TextStyle(
                        fontSize: 15.sp,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    if (address.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        address,
                        style: TextStyle(
                          fontSize: 13.sp,
                          height: 1.25,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ] else if (!_loadingTrainers) ...[
                      const SizedBox(height: 4),
                      Text(
                        locale.t('addTraining.noAddress'),
                        style: TextStyle(
                          fontSize: 13.sp,
                          color: AppColors.textTertiary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (canEdit)
                const Icon(
                  Icons.chevron_right,
                  color: AppColors.textSecondary,
                  size: 22,
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _compactPickerCard({
    required String caption,
    required String value,
    Widget? trailing,
    VoidCallback? onTap,
  }) {
    final valueStyle = _compactValueStyle.copyWith(
      color: onTap == null ? AppColors.textSecondary : AppColors.textPrimary,
    );
    return Expanded(
      child: Material(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(_kFieldRadius),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(_kFieldRadius),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 8, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  caption.toUpperCase(),
                  style: _compactCaptionStyle,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        value,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: valueStyle,
                      ),
                    ),
                    if (trailing != null) trailing,
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _trainerInputDecoration() => const InputDecoration(
    border: InputBorder.none,
    enabledBorder: InputBorder.none,
    focusedBorder: InputBorder.none,
    filled: true,
    fillColor: AppColors.backgroundPrimary,
    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 14),
  );

  Widget _thisClassOnlyTrainerField({
    required LocaleProvider locale,
    required bool completed,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _formLabel(locale.t('addTraining.step2.trainer')),
        InputDecorator(
          decoration: _trainerInputDecoration(),
          child: Text(
            _trainerDisplayName(locale),
            style: TextStyle(
              fontSize: 14.sp,
              color: AppColors.textPrimary,
            ),
          ),
        ),
        if (!completed) ...[
          const SizedBox(height: 8),
          Text(
            locale.t('addTraining.step2.trainerProNote'),
            style: TextStyle(
              fontSize: 12.sp,
              height: 1.35,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ],
    );
  }

  bool _isTrainerNamePlaceholder(String name) {
    final n = name.trim();
    return n.isEmpty || n == '—' || n == '-';
  }

  String _trainerDisplayName(LocaleProvider locale) {
    final fallback = _initial?.trainerName.trim() ?? '';
    final hasFallback = !_isTrainerNamePlaceholder(fallback);

    if (_loadingTrainers) {
      if (hasFallback) return fallback;
      return locale.t('common.loading');
    }

    final id = _trainerId?.trim();
    if (id != null && id.isNotEmpty) {
      final match = _trainers.where((t) => t.id == id);
      if (match.isNotEmpty) return match.first.name;
      if (hasFallback) return fallback;
    }

    if (hasFallback) return fallback;

    return locale.t('ownerSession.noTrainer');
  }

  OwnerTrainingSession _buildUpdatedSession({String? statusOverride}) {
    final base = _initial!;
    final durationMin = base.trainingDurationMinutes ?? 60;
    final loc = _selectedLocation;
    final locName = loc?.name.trim();
    final resolvedLocName =
        locName != null && locName.isNotEmpty ? locName : base.locationName;
    return OwnerTrainingSession(
      sessionId: base.sessionId,
      trainingId: base.trainingId,
      startsAt: _startsAt,
      endsAt: _startsAt.add(Duration(minutes: durationMin)),
      status: statusOverride ?? base.status,
      capacity: base.capacity,
      enrolledCount: base.enrolledCount,
      attendedCount: base.attendedCount,
      trainingName: base.trainingName,
      trainingPrice: base.trainingPrice,
      trainingDurationMinutes: base.trainingDurationMinutes,
      trainingDisplayColorHex: base.trainingDisplayColorHex,
      trainingCategoryNameEn: base.trainingCategoryNameEn,
      trainingCategoryNameRu: base.trainingCategoryNameRu,
      trainingCategoryNameVn: base.trainingCategoryNameVn,
      trainerName: base.trainerName,
      trainerId: base.trainerId,
      locationId:
          _selectedLocationId == 'default' ? null : _selectedLocationId,
      locationName: resolvedLocName,
    );
  }

  bool _sameStartLocal(OwnerTrainingSession session) {
    final a = session.startsAt.toLocal();
    final b = _startsAt;
    return a.year == b.year &&
        a.month == b.month &&
        a.day == b.day &&
        a.hour == b.hour &&
        a.minute == b.minute;
  }

  Future<void> _save(LocaleProvider locale) async {
    final session = _initial;
    if (session == null) return;
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;

    final body = <String, dynamic>{};
    if (!_sameStartLocal(session)) {
      body['startsAt'] = _startsAt.toUtc().toIso8601String();
    }
    final locationBefore = _effectiveLocationId(session.locationId);
    if (_selectedLocationId != locationBefore) {
      body['locationId'] = _selectedLocationId;
    }

    if (body.isEmpty) {
      if (mounted) Navigator.of(context).pop();
      return;
    }

    setState(() => _saving = true);
    try {
      await DashboardApiService.patchOwnerTrainingSession(
        token,
        session.sessionId,
        body,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(locale.t('common.changesSaved'))),
      );
      context.read<OwnerSessionsCache>().invalidate();
      Navigator.of(context).pop(_buildUpdatedSession());
    } catch (e) {
      if (mounted) showApiError(context, e);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _cancelSession(LocaleProvider locale) async {
    final session = _initial;
    if (session == null) return;
    if (!session.effectiveEndsAt.isAfter(DateTime.now()) ||
        session.status.toUpperCase() == 'CANCELLED' ||
        session.status.toUpperCase() == 'COMPLETED') {
      return;
    }
    final scope = await showOwnerSessionCancelScopeDialog(context);
    if (!mounted || scope == null) return;

    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;

    setState(() => _saving = true);
    try {
      if (scope == OwnerSessionCancelScope.thisAndFollowing) {
        await DashboardApiService.patchOwnerTrainingSession(
          token,
          session.sessionId,
          {'status': 'CANCELLED', 'applyToFollowing': true},
        );
      } else {
        await DashboardApiService.updateOwnerTrainingSessionStatus(
          token,
          session.sessionId,
          'CANCELLED',
        );
      }
      if (!mounted) return;
      final msg = scope == OwnerSessionCancelScope.thisAndFollowing
          ? locale.t('ownerSession.sessionCancelledBulk')
          : locale.t('ownerSession.sessionCancelled');
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      context.read<OwnerSessionsCache>().invalidate();
      Navigator.of(context).pop(
        _buildUpdatedSession(statusOverride: 'CANCELLED'),
      );
    } catch (e) {
      if (mounted) showApiError(context, e);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = _initial;
    final locale = context.watch<LocaleProvider>();

    if (session == null) {
      return Scaffold(
        appBar: buildBrandedSettingsAppBar(
          context,
          title: locale.t('ownerSession.detailTitle'),
        ),
        body: Center(child: Text(locale.t('common.nothingFound'))),
      );
    }

    final statusUpper = session.status.toUpperCase();
    final completed = !session.effectiveEndsAt.isAfter(DateTime.now());
    final canEditSchedule = !completed;
    final canPickLocation =
        canEditSchedule && !_loadingTrainers && _locations.length > 1;

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: buildBrandedSettingsAppBar(
        context,
        title: locale.t('ownerSession.editScopeThisOnly'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          kScreenPaddingHorizontal,
          8,
          kScreenPaddingHorizontal,
          24,
        ),
        children: _buildThisClassOnlyForm(
          locale: locale,
          completed: completed,
          canEditSchedule: canEditSchedule,
          canPickLocation: canPickLocation,
          statusUpper: statusUpper,
        ),
      ),
    );
  }

  List<Widget> _buildThisClassOnlyForm({
    required LocaleProvider locale,
    required bool completed,
    required bool canEditSchedule,
    required bool canPickLocation,
    required String statusUpper,
  }) {
    return [
      if (completed)
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text(
            locale.t('ownerSession.editSessionCompleted'),
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 13.sp,
              height: 1.35,
            ),
          ),
        ),
      Text(
        locale.t('ownerSession.editSessionHint'),
        style: TextStyle(
          color: AppColors.textSecondary,
          fontSize: 13.sp,
          height: 1.35,
        ),
      ),
      const SizedBox(height: 20),
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _compactPickerCard(
            caption: locale.t('addTraining.step2.date'),
            value: _formatYMMMd(_sessionDate, locale),
            trailing: const Icon(
              Icons.calendar_today_outlined,
              size: 18,
              color: AppColors.textSecondary,
            ),
            onTap: canEditSchedule ? _pickSessionDate : null,
          ),
          const SizedBox(width: 12),
          _compactPickerCard(
            caption: locale.t('addTraining.step2.time'),
            value: _timeToHm(_sessionTime),
            trailing: const Icon(
              CupertinoIcons.chevron_down,
              color: _kFormAccentPurple,
              size: 18,
            ),
            onTap: canEditSchedule
                ? () async {
                    final picked = await _pickTimeWithWheel(_sessionTime);
                    if (picked != null && mounted) {
                      setState(() => _sessionTime = picked);
                    }
                  }
                : null,
          ),
        ],
      ),
      const SizedBox(height: 18),
      _formLabel(locale.t('addTraining.addressSectionLabel')),
      _locationField(locale: locale, canEdit: canPickLocation),
      const SizedBox(height: 18),
      _thisClassOnlyTrainerField(locale: locale, completed: completed),
      ..._saveCancelActions(locale, completed, statusUpper),
    ];
  }

  List<Widget> _saveCancelActions(
    LocaleProvider locale,
    bool completed,
    String statusUpper,
  ) {
    return [
      const SizedBox(height: 28),
      SizedBox(
        width: double.infinity,
        height: AuthFormStyles.buttonHeight,
        child: FilledButton(
          onPressed: (_saving || completed) ? null : () => _save(locale),
          style: AuthFormStyles.primaryButtonStyle(),
          child: _saving
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppColors.textInverse,
                  ),
                )
              : Text(locale.t('common.save')),
        ),
      ),
      if (!completed && statusUpper != 'CANCELLED') ...[
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          height: AuthFormStyles.buttonHeight,
          child: OutlinedButton(
            onPressed: _saving ? null : () => _cancelSession(locale),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.error600,
              side: const BorderSide(color: AppColors.error600),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(
                  AuthFormStyles.fieldBorderRadius,
                ),
              ),
            ),
            child: Text(locale.t('ownerSession.cancelSessionConfirm')),
          ),
        ),
      ],
    ];
  }
}
