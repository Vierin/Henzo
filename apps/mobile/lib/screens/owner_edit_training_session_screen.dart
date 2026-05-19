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
  bool _loadingSubscription = true;
  bool _isProPlan = false;
  bool _saving = false;
  var _applyToFollowing = false;

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
        _applyToFollowing = m['applyToFollowing'] == true;
        m.remove('applyToFollowing');
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
        setState(() {
          _loadingTrainers = false;
          _loadingSubscription = false;
        });
      }
      return;
    }
    try {
      final salon = await context.read<SalonCache>().getSalon(token);
      if (salon == null || !mounted) {
        setState(() {
          _loadingTrainers = false;
          _loadingSubscription = false;
        });
        return;
      }
      final locale = context.read<LocaleProvider>();
      final list = await StaffApiService.getBySalon(token, salon.id);
      final sub = await DashboardApiService.getCurrentSubscription(token);
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
        _loadingSubscription = false;
        _isProPlan = (sub?.type.toUpperCase() ?? 'FREEMIUM') == 'PRO';
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _loadingTrainers = false;
          _loadingSubscription = false;
        });
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
      style: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.3,
        color: AppColors.textPrimary,
      ),
    ),
  );

  InputDecoration _fieldDecoration({Widget? suffixIcon}) {
    final r = BorderRadius.circular(_kFieldRadius);
    return InputDecoration(
      filled: true,
      fillColor: AppColors.backgroundPrimary,
      suffixIcon: suffixIcon,
      suffixIconConstraints: suffixIcon == null
          ? null
          : const BoxConstraints(minWidth: 44, minHeight: 44),
      border: OutlineInputBorder(
        borderRadius: r,
        borderSide: const BorderSide(color: AppColors.borderPrimary),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: r,
        borderSide: const BorderSide(color: AppColors.borderPrimary),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: r,
        borderSide: const BorderSide(color: AppColors.primary500, width: 1.6),
      ),
      contentPadding: const EdgeInsets.fromLTRB(16, 16, 8, 16),
    );
  }

  Widget _pickerField({
    required String value,
    Widget? suffixIcon,
    required VoidCallback? onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(_kFieldRadius),
        child: InputDecorator(
          decoration: _fieldDecoration(suffixIcon: suffixIcon),
          child: Text(
            value,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: onTap == null
                  ? AppColors.textSecondary
                  : AppColors.textPrimary,
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _pickStartDateThenTime() async {
    final initial = _startsAt;
    final d = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(initial.year - 1),
      lastDate: DateTime(initial.year + 2),
    );
    if (d == null || !mounted) return;
    final t = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
    );
    if (t == null || !mounted) return;
    setState(() {
      _sessionDate = DateTime(d.year, d.month, d.day);
      _sessionTime = t;
    });
  }

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
                          style: const TextStyle(fontWeight: FontWeight.w700),
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

  static const TextStyle _compactCaptionStyle = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w600,
    color: AppColors.textSecondary,
  );

  static const TextStyle _compactValueStyle = TextStyle(
    fontSize: 14,
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
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    if (address.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        address,
                        style: const TextStyle(
                          fontSize: 13,
                          height: 1.25,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ] else if (!_loadingTrainers) ...[
                      const SizedBox(height: 4),
                      Text(
                        locale.t('addTraining.noAddress'),
                        style: const TextStyle(
                          fontSize: 13,
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

  Future<void> _pickTrainer(LocaleProvider locale) async {
    if (_loadingTrainers || _loadingSubscription) return;

    final picked = await showHenzoModalBottomSheet<String?>(
      context: context,
      backgroundColor: AppColors.backgroundPrimary,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Text(
                  locale.t('ownerSession.selectTrainer').toUpperCase(),
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.35,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              ListTile(
                title: Text(locale.t('ownerSession.noTrainer')),
                trailing: _trainerId == null
                    ? const Icon(Icons.check, color: _kFormAccentPurple)
                    : null,
                onTap: () => Navigator.of(ctx).pop(''),
              ),
              ..._trainers.map(
                (t) => ListTile(
                  title: Text(t.name),
                  trailing: _trainerId == t.id
                      ? const Icon(Icons.check, color: _kFormAccentPurple)
                      : null,
                  onTap: () => Navigator.of(ctx).pop(t.id),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
    if (!mounted || picked == null) return;
    setState(() => _trainerId = picked.isEmpty ? null : picked);
  }

  Future<void> _showTrainerPlanInfo(LocaleProvider locale) async {
    await showHenzoDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(locale.t('ownerSession.trainerPlanInfoTitle')),
        content: Text(locale.t('ownerSession.trainerPlanInfoBody')),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(locale.t('common.close')),
          ),
        ],
      ),
    );
  }

  Widget _bulkTrainerField({
    required LocaleProvider locale,
    required bool completed,
  }) {
    final trainerReadOnly = completed || !_isProPlan || _loadingTrainers;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: _formLabel(locale.t('addTraining.step2.trainer')),
            ),
            InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: () => _showTrainerPlanInfo(locale),
              child: const Padding(
                padding: EdgeInsets.only(bottom: 10, right: 4),
                child: Icon(
                  Icons.info_outline,
                  size: 18,
                  color: AppColors.textSecondary,
                ),
              ),
            ),
          ],
        ),
        if (_loadingTrainers || _loadingSubscription)
          const Padding(
            padding: EdgeInsets.all(12),
            child: Center(child: CircularProgressIndicator()),
          )
        else
          Material(
            color: AppColors.backgroundPrimary,
            borderRadius: BorderRadius.circular(_kFieldRadius),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: trainerReadOnly ? null : () => _pickTrainer(locale),
              borderRadius: BorderRadius.circular(_kFieldRadius),
              child: InputDecorator(
                decoration: _fieldDecoration(
                  suffixIcon: trainerReadOnly
                      ? null
                      : const Icon(
                          CupertinoIcons.chevron_down,
                          color: _kFormAccentPurple,
                          size: 18,
                        ),
                ),
                child: Text(
                  _trainerDisplayName(locale),
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ),
          ),
        if (!_isProPlan && !completed)
          Padding(
            padding: const EdgeInsets.only(top: 8, left: 12),
            child: Text(
              locale.t('ownerSession.trainerFreePlanNote'),
              style: const TextStyle(
                fontSize: 12,
                height: 1.35,
                color: AppColors.textSecondary,
              ),
            ),
          ),
      ],
    );
  }

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
            style: const TextStyle(
              fontSize: 14,
              color: AppColors.textPrimary,
            ),
          ),
        ),
        if (!completed) ...[
          const SizedBox(height: 8),
          Text(
            locale.t('addTraining.step2.trainerProNote'),
            style: const TextStyle(
              fontSize: 12,
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
    final trainerName = _resolveTrainerNameForSession(base);
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
      trainerName: trainerName,
      trainerId: _trainerId,
      locationId:
          _selectedLocationId == 'default' ? null : _selectedLocationId,
      locationName: resolvedLocName,
    );
  }

  String _resolveTrainerNameForSession(OwnerTrainingSession base) {
    final id = _trainerId?.trim();
    if (id != null && id.isNotEmpty) {
      final match = _trainers.where((t) => t.id == id);
      if (match.isNotEmpty) return match.first.name;
    }
    final fallback = base.trainerName.trim();
    if (!_isTrainerNamePlaceholder(fallback)) return fallback;
    return '—';
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
    if (_applyToFollowing) {
      final trainerBefore = session.trainerId;
      final trainerAfter = _trainerId;
      if (_isProPlan && trainerBefore != trainerAfter) {
        body['trainerId'] = trainerAfter;
      }
    }

    if (body.isEmpty) {
      if (mounted) Navigator.of(context).pop();
      return;
    }
    if (_applyToFollowing) {
      body['applyToFollowing'] = true;
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
    final scope = await showOwnerSessionCancelScopeDialog(context);
    if (!mounted || scope == null) return;

    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;

    setState(() => _saving = true);
    try {
      final body = <String, dynamic>{'status': 'CANCELLED'};
      if (scope == OwnerSessionCancelScope.thisAndFollowing) {
        body['applyToFollowing'] = true;
      }
      await DashboardApiService.patchOwnerTrainingSession(
        token,
        session.sessionId,
        body,
      );
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
    final completed = !session.endsAt.toLocal().isAfter(DateTime.now());
    final canEditSchedule = !completed;
    final canPickLocation =
        canEditSchedule && !_loadingTrainers && _locations.length > 1;

    final screenTitle = _applyToFollowing
        ? locale.t('ownerSession.editScopeFollowing')
        : locale.t('ownerSession.editScopeThisOnly');

    final formChildren = _applyToFollowing
        ? _buildBulkFollowingForm(
            locale: locale,
            completed: completed,
            canEditSchedule: canEditSchedule,
            canPickLocation: canPickLocation,
            statusUpper: statusUpper,
          )
        : _buildThisClassOnlyForm(
            locale: locale,
            completed: completed,
            canEditSchedule: canEditSchedule,
            canPickLocation: canPickLocation,
            statusUpper: statusUpper,
          );

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: buildBrandedSettingsAppBar(context, title: screenTitle),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          kScreenPaddingHorizontal,
          8,
          kScreenPaddingHorizontal,
          24,
        ),
        children: formChildren,
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
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 13,
              height: 1.35,
            ),
          ),
        ),
      Text(
        locale.t('ownerSession.editSessionHint'),
        style: const TextStyle(
          color: AppColors.textSecondary,
          fontSize: 13,
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

  List<Widget> _buildBulkFollowingForm({
    required LocaleProvider locale,
    required bool completed,
    required bool canEditSchedule,
    required bool canPickLocation,
    required String statusUpper,
  }) {
    final matLoc = MaterialLocalizations.of(context);
    final startsLocal = _startsAt;
    final dateTimeLabel =
        '${matLoc.formatFullDate(startsLocal)} · '
        '${matLoc.formatTimeOfDay(
          TimeOfDay.fromDateTime(startsLocal),
          alwaysUse24HourFormat: true,
        )}';

    return [
      Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Material(
          color: AppColors.primary50,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Text(
              locale.t('ownerSession.editBulkSessionsBanner'),
              style: const TextStyle(
                fontSize: 13,
                height: 1.35,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ),
      ),
      if (completed)
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text(
            locale.t('ownerSession.editSessionCompleted'),
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 13,
              height: 1.35,
            ),
          ),
        ),
      Text(
        locale.t('ownerSession.editScopeFollowingHint'),
        style: const TextStyle(
          color: AppColors.textSecondary,
          fontSize: 13,
          height: 1.35,
        ),
      ),
      const SizedBox(height: 20),
      _formLabel(locale.t('booking.dateTime')),
      _pickerField(
        value: dateTimeLabel,
        suffixIcon: const Icon(
          Icons.schedule,
          color: AppColors.textSecondary,
          size: 22,
        ),
        onTap: canEditSchedule ? _pickStartDateThenTime : null,
      ),
      const SizedBox(height: 18),
      _formLabel(locale.t('addTraining.addressSectionLabel')),
      _locationField(locale: locale, canEdit: canPickLocation),
      const SizedBox(height: 18),
      _bulkTrainerField(locale: locale, completed: completed),
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
