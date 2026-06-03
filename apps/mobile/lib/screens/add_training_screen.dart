import 'package:flutter/material.dart';
import '../widgets/common/henzo_modal.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../constants/layout.dart';
import '../models/studio.dart';
import '../models/service_item.dart';
import '../models/training_category_option.dart';
import '../models/training_location_item.dart';
import '../l10n/locale_provider.dart';
import '../services/auth_service.dart';
import '../services/dashboard_api_service.dart';
import '../services/cache/owner_sessions_cache.dart';
import '../services/cache/studio_cache.dart';
import '../services/cache/services_staff_cache.dart';
import '../services/services_api_service.dart';
import '../utils/plan_limit_dialogs.dart';
import '../utils/show_api_error.dart';
import '../utils/training_locations_storage.dart';
import '../widgets/address_picker_modal.dart';
import '../widgets/auth/auth_form_styles.dart';
import '../widgets/schedule_style_date_picker.dart';
import '../widgets/common/henzo_header_back_button.dart';
import '../widgets/training/training_location_picker_sheet.dart';
import 'main_shell.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Matches registration / mock secondary controls (chevron, pin tint).
const Color _kFormAccentPurple = Color(0xFF6C5CE7);

const Color _kRegHintMuted = Color(0x993F3F3F);

String _formatThousandsDots(int value) {
  final raw = value.abs().toString();
  final chars = raw.split('').reversed.toList();
  final parts = <String>[];
  for (var i = 0; i < chars.length; i++) {
    parts.add(chars[i]);
    if ((i + 1) % 3 == 0 && i + 1 < chars.length) {
      parts.add('.');
    }
  }
  return parts.reversed.join();
}

class AddTrainingScreen extends StatefulWidget {
  const AddTrainingScreen({super.key});

  @override
  State<AddTrainingScreen> createState() => _AddTrainingScreenState();
}

class _AddTrainingScreenState extends State<AddTrainingScreen> {
  final _nameController = TextEditingController();
  final _nameFocusNode = FocusNode();
  final _durationFocusNode = FocusNode();
  final _durationController = TextEditingController(text: '60');
  final _priceController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _capacityController = TextEditingController(text: '10');

  bool _loading = true;
  bool _saving = false;
  int _step = 1;
  bool _isRecurring = false;
  final Set<int> _recurringDays = {1, 3, 5};
  final Map<int, TimeOfDay> _recurringDayTimes = {};
  DateTime _sessionDate = DateTime.now();
  TimeOfDay _sessionTime = const TimeOfDay(hour: 9, minute: 0);
  DateTime _recurringEndDate = DateTime.now();
  Studio? _studio;
  List<TrainingLocationItem> _locations = [];
  String _selectedLocationId = 'default';
  List<ServiceItem> _existing = [];
  List<TrainingCategoryOption> _categories = [];
  int? _selectedCategoryId;

  bool _step1NameError = false;
  bool _step1DurationError = false;
  bool _step1CapacityError = false;
  bool _step1PriceError = false;
  bool _step1CategoryError = false;

  @override
  void initState() {
    super.initState();
    for (final day in _recurringDays) {
      _recurringDayTimes[day] = _sessionTime;
    }
    _durationFocusNode.addListener(_onDurationFocusChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  void _onDurationFocusChanged() => setState(() {});

  @override
  void dispose() {
    _nameController.dispose();
    _nameFocusNode.dispose();
    _durationFocusNode.removeListener(_onDurationFocusChanged);
    _durationFocusNode.dispose();
    _durationController.dispose();
    _priceController.dispose();
    _descriptionController.dispose();
    _capacityController.dispose();
    super.dispose();
  }

  TrainingLocationItem? get _selectedLocation {
    for (final loc in _locations) {
      if (loc.id == _selectedLocationId) return loc;
    }
    return _locations.isNotEmpty ? _locations.first : null;
  }

  void _applyLocationsFromStudio(Studio? studio, LocaleProvider locale) {
    _locations = TrainingLocationItem.listFromStudio(
      studio,
      mainStudioName: locale.t('locations.mainStudio'),
    );
    if (_locations.isEmpty) {
      _selectedLocationId = 'default';
      return;
    }
    final stillValid = _locations.any((l) => l.id == _selectedLocationId);
    if (!stillValid) {
      _selectedLocationId = _locations.first.id;
    }
  }

  Future<void> _openLocationPicker() async {
    final locale = context.read<LocaleProvider>();
    if (_locations.isEmpty && _studio != null) {
      _applyLocationsFromStudio(_studio, locale);
    }
    if (_locations.isEmpty) return;

    final result = await showTrainingLocationPickerSheet(
      context,
      locations: _locations,
      selectedId: _selectedLocationId,
      onDeleteLocation: _deleteTrainingLocation,
    );
    if (!mounted || result == null) return;

    switch (result) {
      case TrainingLocationPicked(:final location):
        setState(() => _selectedLocationId = location.id);
      case TrainingLocationAddRequested():
        await _addNewTrainingLocation();
    }
  }

  Future<bool> _deleteTrainingLocation(TrainingLocationItem loc) async {
    final studio = _studio;
    if (studio == null || loc.id == 'default') return false;

    final updated = _locations.where((l) => l.id != loc.id).toList();
    try {
      final updatedStudio = await persistExtraTrainingLocations(
        context,
        studio,
        updated,
      );
      if (!mounted) return false;
      final locale = context.read<LocaleProvider>();
      setState(() {
        _studio = updatedStudio ?? studio;
        _applyLocationsFromStudio(_studio, locale);
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

  Future<void> _addNewTrainingLocation() async {
    final locale = context.read<LocaleProvider>();
    final studio = _studio;
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
      final updatedStudio = await persistExtraTrainingLocations(
        context,
        studio,
        updatedList,
      );
      if (!mounted) return;
      setState(() {
        _studio = updatedStudio ?? studio;
        _locations = TrainingLocationItem.listFromStudio(
          _studio,
          mainStudioName: locale.t('locations.mainStudio'),
        );
        _selectedLocationId = newLoc.id;
      });
    } catch (e) {
      if (mounted) showApiError(context, e);
    }
  }

  String _timeToHm(TimeOfDay t) {
    final hh = t.hour.toString().padLeft(2, '0');
    final mm = t.minute.toString().padLeft(2, '0');
    return '$hh:$mm';
  }

  int _weekdayFromDate(DateTime date) {
    final wd = date.weekday;
    return wd == 0 ? 7 : wd;
  }

  int _parsePriceDigits() {
    final raw = _priceController.text.trim().replaceAll('.', '');
    return int.tryParse(raw) ?? 0;
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
                        child: const Text('Отмена'),
                      ),
                      const Spacer(),
                      TextButton(
                        onPressed: () => Navigator.of(ctx).pop(selected),
                        child: Text(
                          'Готово',
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

  /// Same geometry and typography as [BusinessRegistrationScreen] fields.
  InputDecoration _regInputDecoration({
    required bool invalid,
    String? hintText,
    IconData? prefixIcon,
    Widget? suffix,
    String? suffixText,
  }) {
    const radius = BorderRadius.all(Radius.circular(12));
    final errorSide = BorderSide(color: AppColors.error600, width: 1.2);
    final noneSide = BorderSide.none;
    final focusSide = BorderSide(
      color: invalid ? AppColors.error600 : AppColors.primary500,
      width: 1.2,
    );
    return InputDecoration(
      hintText: hintText,
      hintStyle: TextStyle(
        color: _kRegHintMuted,
        fontSize: 16.sp,
        fontWeight: FontWeight.w500,
      ),
      prefixIcon: prefixIcon == null
          ? null
          : Padding(
              padding: const EdgeInsets.only(left: 13, right: 8),
              child: Icon(prefixIcon, color: _kFormAccentPurple, size: 22),
            ),
      prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
      suffix: suffix,
      suffixText: suffixText,
      suffixStyle: TextStyle(
        fontSize: 16.sp,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimary,
      ),
      filled: true,
      fillColor: AppColors.backgroundPrimary,
      contentPadding: EdgeInsets.only(
        top: 8,
        bottom: 12,
        right: 18,
        left: prefixIcon == null ? 13 : 0,
      ),
      border: OutlineInputBorder(borderRadius: radius, borderSide: noneSide),
      enabledBorder: OutlineInputBorder(
        borderRadius: radius,
        borderSide: invalid ? errorSide : noneSide,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: radius,
        borderSide: focusSide,
      ),
    );
  }

  /// Duration with unit immediately after digits (not trailing the full field).
  Widget _durationMinutesField(LocaleProvider loc) {
    const radius = BorderRadius.all(Radius.circular(12));
    final invalid = _step1DurationError;
    final focused = _durationFocusNode.hasFocus;
    final errorSide = BorderSide(color: AppColors.error600, width: 1.2);
    final noneSide = BorderSide.none;
    final focusSide = BorderSide(
      color: invalid ? AppColors.error600 : AppColors.primary500,
      width: 1.2,
    );
    final side = invalid ? errorSide : (focused ? focusSide : noneSide);
    return Container(
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: radius,
        border: Border.fromBorderSide(side),
      ),
      padding: const EdgeInsets.only(top: 2, bottom: 4, right: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const Padding(
            padding: EdgeInsets.only(left: 13, right: 8),
            child: Icon(
              Icons.access_time_rounded,
              color: _kFormAccentPurple,
              size: 22,
            ),
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              SizedBox(
                width: 52,
                child: TextField(
                  controller: _durationController,
                  focusNode: _durationFocusNode,
                  style: _stepFieldInputStyle,
                  keyboardType: TextInputType.number,
                  textInputAction: TextInputAction.next,
                  onChanged: (_) => setState(() => _step1DurationError = false),
                  decoration: InputDecoration(
                    hintText: '60',
                    hintStyle: TextStyle(
                      color: _kRegHintMuted,
                      fontSize: 16.sp,
                      fontWeight: FontWeight.w500,
                    ),
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    isDense: true,
                    contentPadding: const EdgeInsets.only(
                      top: 8,
                      bottom: 10,
                      right: 2,
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Text(
                  loc.t('addTraining.durationSuffix'),
                  style: TextStyle(
                    fontSize: 16.sp,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ],
          ),
          const Spacer(),
        ],
      ),
    );
  }

  static final TextStyle _stepFieldInputStyle = TextStyle(
    fontSize: 16.sp,
    color: AppColors.textPrimary,
  );

  Widget _stepFormLabel(String text) => Padding(
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

  void _onCloseAddTraining() {
    context.findAncestorStateOfType<MainShellState>()?.restoreShellTab(
      MainShellState.scheduleTabIndex,
    );
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  Widget _step1CloseLeading() {
    return Padding(
      padding: const EdgeInsets.only(left: 8),
      child: Center(
        child: Material(
          color: AppColors.backgroundPrimary,
          shape: const CircleBorder(),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: _onCloseAddTraining,
            child: const SizedBox(
              width: 40,
              height: 40,
              child: Icon(
                Icons.close,
                size: 20,
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _step2BackLeading() {
    return HenzoHeaderBackButton(
      onPressed: () => setState(() => _step = 1),
    );
  }

  bool _validateStep1() {
    final nameOk = _nameController.text.trim().isNotEmpty;
    final duration = int.tryParse(_durationController.text.trim()) ?? 0;
    final durationOk = duration > 0;
    final capacity = int.tryParse(_capacityController.text.trim()) ?? 0;
    final capacityOk = capacity > 0;
    final priceOk = _parsePriceDigits() > 0;
    final categoryOk = _categories.isEmpty || _selectedCategoryId != null;

    setState(() {
      _step1NameError = !nameOk;
      _step1DurationError = !durationOk;
      _step1CapacityError = !capacityOk;
      _step1PriceError = !priceOk;
      _step1CategoryError = !categoryOk;
    });

    if (nameOk && durationOk && capacityOk && priceOk && categoryOk) {
      return true;
    }

    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      SnackBar(
        content: Text(context.read<LocaleProvider>().t('addTraining.checkErrors')),
      ),
    );
    return false;
  }

  void _applyExistingTrainingSelection(ServiceItem found) {
    setState(() {
      _nameController.text = found.displayName;
      _step1NameError = false;
      final d = found.duration;
      if (d != null && d > 0) {
        _durationController.text = d.toString();
        _step1DurationError = false;
      }
      final p = found.price;
      if (p != null && p > 0) {
        _priceController.text = _formatThousandsDots(p.round());
        _step1PriceError = false;
      }
      final cid = found.trainingCategoryId;
      if (cid != null && _categories.any((c) => c.id == cid)) {
        _selectedCategoryId = cid;
        _step1CategoryError = false;
      }
      final desc = found.description?.trim();
      if (desc != null && desc.isNotEmpty) {
        _descriptionController.text = desc;
      }
    });
  }

  String _suggestionSubtitle(ServiceItem e) {
    final parts = <String>[];
    final d = e.duration;
    if (d != null && d > 0) parts.add('$d min');
    final p = e.price;
    if (p != null && p > 0) {
      parts.add('${_formatThousandsDots(p.round())} ₫');
    }
    return parts.isEmpty ? '—' : parts.join(' · ');
  }

  String _categoryLabel(LocaleProvider loc) {
    final id = _selectedCategoryId;
    if (id == null) return loc.t('addTraining.pickCategory');
    final code = loc.localeCode;
    for (final c in _categories) {
      if (c.id == id) return c.label(code);
    }
    return loc.t('addTraining.pickCategory');
  }

  Future<void> _openCategoryBottomSheet() async {
    if (_categories.isEmpty) return;
    final loc = context.read<LocaleProvider>();
    final localeCode = loc.localeCode;
    final result = await showHenzoModalBottomSheet<_CategoryPickResult?>(
      context: context,
      showDragHandle: false,
      isScrollControlled: true,
      backgroundColor: AppColors.backgroundPrimary,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      sheetAnimationStyle: const AnimationStyle(
        duration: Duration(milliseconds: 320),
        reverseDuration: Duration(milliseconds: 220),
      ),
      builder: (sheetCtx) {
        final h = MediaQuery.sizeOf(sheetCtx).height;
        void popCancel() =>
            Navigator.of(sheetCtx).pop(const _CategoryPickResult.cancelled());
        return SafeArea(
          child: Padding(
            padding: EdgeInsets.fromLTRB(
              16,
              8,
              8,
              12 + MediaQuery.viewInsetsOf(sheetCtx).bottom,
            ),
            child: SizedBox(
              height: h * 0.42,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(top: 4, left: 4),
                          child: Text(
                            loc.t('addTraining.categorySheetTitle'),
                            style: TextStyle(
                              fontSize: 13.sp,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.4,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: popCancel,
                        icon: const Icon(Icons.close),
                        color: AppColors.textSecondary,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Expanded(
                    child: SingleChildScrollView(
                      child: Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: _categories.map((c) {
                          final selected = _selectedCategoryId == c.id;
                          final isOther = c.isOtherCategory;
                          final Color bg;
                          final Color fg;
                          if (isOther) {
                            bg = AppColors.backgroundPrimary;
                            fg = AppColors.textPrimary;
                          } else {
                            final chipBg = c.backgroundColor(
                              AppColors.neutral500,
                            );
                            bg = chipBg;
                            fg = c.foregroundColorOn(chipBg);
                          }
                          final borderW = selected ? 2.0 : 1.0;
                          final borderColor = selected
                              ? AppColors.primary500
                              : (isOther
                                    ? AppColors.primary300
                                    : Colors.transparent);
                          final chipLabel = isOther
                              ? loc.t('addTraining.categoryOtherChip')
                              : c.label(localeCode);
                          return Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () => Navigator.of(
                                sheetCtx,
                              ).pop(_CategoryPickResult.apply(c.id)),
                              borderRadius: BorderRadius.circular(999),
                              child: Ink(
                                decoration: BoxDecoration(
                                  color: bg,
                                  borderRadius: BorderRadius.circular(999),
                                  border: Border.all(
                                    color: borderColor,
                                    width: borderW,
                                  ),
                                ),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 10,
                                ),
                                child: Text(
                                  chipLabel,
                                  style: TextStyle(
                                    color: fg,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 13.sp,
                                  ),
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
    if (!mounted) return;
    if (result == null || !result.applied) return;
    setState(() {
      _selectedCategoryId = result.categoryId;
      _step1CategoryError = false;
    });
  }

  DateTime _addCalendarMonths(DateTime dayOnly, int months) =>
      DateTime(dayOnly.year, dayOnly.month + months, dayOnly.day);

  DateTime _recurringRangeCap() {
    final start = DateTime(
      _sessionDate.year,
      _sessionDate.month,
      _sessionDate.day,
    );
    return _addCalendarMonths(start, 2);
  }

  void _clampRecurringEndToPolicy() {
    final start = DateTime(
      _sessionDate.year,
      _sessionDate.month,
      _sessionDate.day,
    );
    final cap = _recurringRangeCap();
    if (_recurringEndDate.isBefore(start)) {
      _recurringEndDate = start;
    } else if (_recurringEndDate.isAfter(cap)) {
      _recurringEndDate = cap;
    }
  }

  String _formatYMMMd(DateTime d, LocaleProvider loc) =>
      DateFormat.yMMMd(loc.localeCode).format(d);

  String _narrowWeekday(int weekday, LocaleProvider loc) {
    final d = DateTime(2024, 1, weekday);
    return DateFormat.E(loc.localeCode).format(d).toUpperCase();
  }

  String _fullWeekday(int weekday, LocaleProvider loc) {
    final d = DateTime(2024, 1, weekday);
    final raw = DateFormat.EEEE(loc.localeCode).format(d);
    if (raw.isEmpty) return raw;
    return raw.substring(0, 1).toUpperCase() + raw.substring(1);
  }

  List<DateTime> _buildRecurringPreview() {
    if (!_isRecurring || _recurringDays.isEmpty) return [];
    final start = DateTime(
      _sessionDate.year,
      _sessionDate.month,
      _sessionDate.day,
    );
    var endDay = DateTime(
      _recurringEndDate.year,
      _recurringEndDate.month,
      _recurringEndDate.day,
    );
    final cap = _recurringRangeCap();
    if (endDay.isAfter(cap)) endDay = cap;
    if (endDay.isBefore(start)) endDay = start;
    final sortedDays = _recurringDays.toList()..sort();
    final dates = <DateTime>[];
    for (var i = 0; ; i++) {
      final day = start.add(Duration(days: i));
      if (day.isAfter(endDay)) break;
      final weekday = _weekdayFromDate(day);
      if (!sortedDays.contains(weekday)) continue;
      final t = _recurringDayTimes[weekday] ?? _sessionTime;
      final candidate = DateTime(
        day.year,
        day.month,
        day.day,
        t.hour,
        t.minute,
      );
      dates.add(candidate);
    }
    dates.sort((a, b) => a.compareTo(b));
    return dates;
  }

  Future<void> _pickSessionDateOnStep2() async {
    final picked = await showScheduleStyleDatePicker(
      context: context,
      initialDate: _sessionDate,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null && mounted) {
      setState(() {
        _sessionDate = picked;
        _clampRecurringEndToPolicy();
      });
    }
  }

  Future<void> _pickRecurringEndDateOnStep2() async {
    final start = DateTime(
      _sessionDate.year,
      _sessionDate.month,
      _sessionDate.day,
    );
    final cap = _recurringRangeCap();
    final last = cap.isBefore(start) ? start : cap;
    final picked = await showScheduleStyleDatePicker(
      context: context,
      initialDate: _recurringEndDate.isBefore(start)
          ? start
          : (_recurringEndDate.isAfter(last) ? last : _recurringEndDate),
      firstDate: start,
      lastDate: last,
    );
    if (picked != null && mounted) {
      setState(() {
        _recurringEndDate = DateTime(picked.year, picked.month, picked.day);
        _clampRecurringEndToPolicy();
      });
    }
  }

  static const double _kStep2FieldRadius = 12;

  InputDecoration _step2FieldDecoration({Widget? suffixIcon}) {
    final r = BorderRadius.circular(_kStep2FieldRadius);
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

  Widget _step2RadioDot({required bool selected}) {
    return Container(
      width: 22,
      height: 22,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: _kFormAccentPurple, width: 2),
        color: selected ? _kFormAccentPurple : Colors.transparent,
      ),
      alignment: Alignment.center,
      child: selected
          ? Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white,
              ),
            )
          : null,
    );
  }

  Widget _step2WeekdayChip(LocaleProvider loc, int day) {
    final selected = _recurringDays.contains(day);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => setState(() {
          if (selected) {
            _recurringDays.remove(day);
            _recurringDayTimes.remove(day);
          } else {
            _recurringDays.add(day);
            _recurringDayTimes[day] = _sessionTime;
          }
        }),
        borderRadius: BorderRadius.circular(999),
        child: Ink(
          height: 38,
          decoration: BoxDecoration(
            color: selected
                ? AppColors.primary500
                : AppColors.backgroundPrimary,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: selected ? AppColors.primary500 : AppColors.borderPrimary,
              width: 1,
            ),
          ),
          child: Center(
            child: Text(
              _narrowWeekday(day, loc),
              style: TextStyle(
                fontSize: 12.sp,
                fontWeight: FontWeight.w700,
                color: selected ? AppColors.textInverse : AppColors.textPrimary,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _step2RangeDateCard({
    required String caption,
    required String value,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: Material(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(_kStep2FieldRadius),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(_kStep2FieldRadius),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 8, 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        caption,
                        style: TextStyle(
                          fontSize: 11.sp,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        value,
                        style: TextStyle(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.calendar_today_outlined,
                  size: 18,
                  color: AppColors.textTertiary,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildStep2Widgets(LocaleProvider loc) {
    final w = <Widget>[
      const SizedBox(height: 4),
      InkWell(
        onTap: () => setState(() => _isRecurring = false),
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 1),
                child: _step2RadioDot(selected: !_isRecurring),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  loc.t('addTraining.step2.oneTraining').toUpperCase(),
                  style: TextStyle(
                    fontSize: 14.sp,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.35,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      InkWell(
        onTap: () => setState(() {
          _isRecurring = true;
          final now = DateTime.now();
          final today = DateTime(now.year, now.month, now.day);
          _sessionDate = today;
          _recurringEndDate = _addCalendarMonths(today, 2);
          _clampRecurringEndToPolicy();
        }),
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 1),
                child: _step2RadioDot(selected: _isRecurring),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      loc.t('addTraining.step2.repeatedTraining').toUpperCase(),
                      style: TextStyle(
                        fontSize: 14.sp,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.35,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      loc.t('addTraining.step2.repeatedHint'),
                      style: TextStyle(
                        fontSize: 12.sp,
                        height: 1.35,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      const SizedBox(height: 18),
    ];

    if (!_isRecurring) {
      w.addAll([
        _stepFormLabel(loc.t('addTraining.step2.date')),
        InkWell(
          onTap: _pickSessionDateOnStep2,
          borderRadius: BorderRadius.circular(_kStep2FieldRadius),
          child: InputDecorator(
            decoration: _step2FieldDecoration(
              suffixIcon: const Icon(
                Icons.calendar_today_outlined,
                size: 20,
                color: AppColors.textSecondary,
              ),
            ),
            child: Text(
              _formatYMMMd(_sessionDate, loc),
              style: TextStyle(
                fontSize: 15.sp,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ),
        const SizedBox(height: 18),
        _stepFormLabel(loc.t('addTraining.step2.time')),
        InkWell(
          onTap: () async {
            final picked = await _pickTimeWithWheel(_sessionTime);
            if (picked != null && mounted) {
              setState(() => _sessionTime = picked);
            }
          },
          borderRadius: BorderRadius.circular(_kStep2FieldRadius),
          child: InputDecorator(
            decoration: _step2FieldDecoration(
              suffixIcon: const Icon(
                CupertinoIcons.chevron_down,
                color: _kFormAccentPurple,
                size: 18,
              ),
            ),
            child: Text(
              _timeToHm(_sessionTime),
              style: TextStyle(
                fontSize: 15.sp,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ),
        const SizedBox(height: 28),
        SizedBox(
          height: 56,
          width: double.infinity,
          child: FilledButton(
            onPressed: _saving ? null : _save,
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary500,
              foregroundColor: AppColors.textInverse,
              shape: const StadiumBorder(),
            ),
            child: _saving
                ? const SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.textInverse,
                    ),
                  )
                : Text(
                    loc.t('addTraining.step2.createClass'),
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 16.sp,
                    ),
                  ),
          ),
        ),
      ]);
    } else {
      w.addAll([
        _stepFormLabel(loc.t('addTraining.step2.dateRange')),
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            _step2RangeDateCard(
              caption: loc.t('addTraining.step2.startDate'),
              value: _formatYMMMd(
                DateTime(
                  _sessionDate.year,
                  _sessionDate.month,
                  _sessionDate.day,
                ),
                loc,
              ),
              onTap: _pickSessionDateOnStep2,
            ),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 6),
              child: Icon(
                Icons.arrow_forward_rounded,
                size: 22,
                color: AppColors.textSecondary,
              ),
            ),
            _step2RangeDateCard(
              caption: loc.t('addTraining.step2.endDate'),
              value: _formatYMMMd(
                DateTime(
                  _recurringEndDate.year,
                  _recurringEndDate.month,
                  _recurringEndDate.day,
                ),
                loc,
              ),
              onTap: _pickRecurringEndDateOnStep2,
            ),
          ],
        ),
        const SizedBox(height: 20),
        _stepFormLabel(loc.t('addTraining.step2.repeatOn')),
        const SizedBox(height: 10),
        Row(
          children: List.generate(7, (i) {
            final day = i + 1;
            return Expanded(
              child: Padding(
                padding: EdgeInsets.only(left: i == 0 ? 0 : 4),
                child: _step2WeekdayChip(loc, day),
              ),
            );
          }),
        ),
        const SizedBox(height: 20),
        _stepFormLabel(loc.t('addTraining.step2.schedule')),
        const SizedBox(height: 6),
        Text(
          loc.t('addTraining.step2.scheduleHint'),
          style: TextStyle(
            fontSize: 12.sp,
            height: 1.35,
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 10),
        ...(_recurringDays.toList()..sort()).map((day) {
          final time = _recurringDayTimes[day] ?? _sessionTime;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Material(
              color: AppColors.backgroundPrimary,
              borderRadius: BorderRadius.circular(_kStep2FieldRadius),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                child: Row(
                  children: [
                    SizedBox(
                      width: 110,
                      child: Text(
                        _fullWeekday(day, loc),
                        style: TextStyle(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    Expanded(
                      child: InkWell(
                        onTap: () async {
                          final picked = await _pickTimeWithWheel(time);
                          if (picked != null && mounted) {
                            setState(() => _recurringDayTimes[day] = picked);
                          }
                        },
                        borderRadius: BorderRadius.circular(10),
                        child: InputDecorator(
                          decoration: InputDecoration(
                            filled: true,
                            fillColor: AppColors.backgroundPrimary,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(
                                color: AppColors.borderPrimary,
                              ),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(
                                color: AppColors.borderPrimary,
                              ),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(
                                color: AppColors.primary500,
                                width: 1.4,
                              ),
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 10,
                            ),
                            suffixIcon: const Icon(
                              CupertinoIcons.chevron_down,
                              color: _kFormAccentPurple,
                              size: 18,
                            ),
                          ),
                          child: Text(
                            _timeToHm(time),
                            style: TextStyle(
                              fontSize: 14.sp,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: () => setState(() {
                        _recurringDays.remove(day);
                        _recurringDayTimes.remove(day);
                      }),
                      icon: const Icon(Icons.delete_outline_rounded),
                      color: AppColors.primary500,
                      tooltip: loc.t('common.delete'),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
        Builder(
          builder: (ctx) {
            final n = _buildRecurringPreview().length;
            return Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                loc
                    .t('addTraining.step2.sessionsPlanned')
                    .replaceAll('{count}', '$n'),
                style: TextStyle(
                  fontSize: 12.sp,
                  color: AppColors.textSecondary,
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 20),
        Row(
          children: [
            Expanded(
              child: SizedBox(
                height: 48,
                child: OutlinedButton(
                  onPressed: _saving ? null : () => setState(() => _step = 1),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.textPrimary,
                    side: const BorderSide(
                      color: AppColors.primary500,
                      width: 1.2,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    loc.t('addTraining.step2.back'),
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: SizedBox(
                height: 48,
                child: FilledButton(
                  onPressed: _saving ? null : _save,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary500,
                    foregroundColor: AppColors.textInverse,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _saving
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.textInverse,
                          ),
                        )
                      : Text(
                          loc.t('common.save'),
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                ),
              ),
            ),
          ],
        ),
      ]);
    }

    w.add(const SizedBox(height: 24));
    return w;
  }

  Future<void> _load() async {
    final authService = context.read<AuthService>();
    final studioCache = context.read<StudioCache>();
    final servicesStaffCache = context.read<ServicesStaffCache>();
    final token = authService.accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    try {
      final studio = await studioCache.getStudio(token);
      final list = studio != null
          ? await servicesStaffCache.getServicesForStudio(token, studio.id)
          : <ServiceItem>[];
      final categories = await ServicesApiService.getTrainingCategories(token);
      if (!mounted) return;
      final locale = context.read<LocaleProvider>();
      setState(() {
        _studio = studio;
        _applyLocationsFromStudio(studio, locale);
        _existing = list;
        _categories = TrainingCategoryOption.withOtherLast(categories);
        _loading = false;
        final start = DateTime(
          _sessionDate.year,
          _sessionDate.month,
          _sessionDate.day,
        );
        _recurringEndDate = _addCalendarMonths(start, 2);
        _clampRecurringEndToPolicy();
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      showApiError(context, e);
    }
  }

  Future<void> _save() async {
    final token = context.read<AuthService>().accessToken;
    final studioId = _studio?.id;
    final name = _nameController.text.trim();
    final duration = int.tryParse(_durationController.text.trim()) ?? 0;
    final priceInt = _parsePriceDigits();
    final price = priceInt.toDouble();
    final capacity = int.tryParse(_capacityController.text.trim()) ?? 0;
    if (token == null || token.isEmpty || studioId == null) return;
    if (name.isEmpty) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(content: Text(context.read<LocaleProvider>().t('addTraining.enterName'))),
      );
      return;
    }
    if (duration <= 0 || capacity <= 0 || price <= 0) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(
          content: Text(context.read<LocaleProvider>().t('addTraining.invalidValues')),
        ),
      );
      return;
    }
    final recurringDays = _isRecurring
        ? (_recurringDays.toList()..sort())
        : <int>[_weekdayFromDate(_sessionDate)];
    if (_isRecurring) {
      if (recurringDays.isEmpty) {
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(
          SnackBar(content: Text(context.read<LocaleProvider>().t('addTraining.selectDays'))),
        );
        return;
      }
    }
    setState(() => _saving = true);
    try {
      final created = await ServicesApiService.create(
        token,
        studioId: studioId,
        name: name,
        duration: duration,
        price: price,
        trainingCategoryId: _selectedCategoryId,
        description: _descriptionController.text.trim(),
      );
      if (!mounted) return;
      if (created != null) {
        final recurringResult =
            await DashboardApiService.createRecurringTrainingSessions(
              token,
              studioId: studioId,
              trainingId: created.id,
              locationId: _selectedLocationId,
              capacity: capacity,
              daysOfWeek: _isRecurring ? null : recurringDays,
              startTime: _isRecurring ? null : _timeToHm(_sessionTime),
              slots: _isRecurring
                  ? recurringDays
                        .map(
                          (d) => RecurringSlot(
                            day: d,
                            startTime: _timeToHm(
                              _recurringDayTimes[d] ?? _sessionTime,
                            ),
                          ),
                        )
                        .toList()
                  : null,
              startsFromDate: DateTime(
                _sessionDate.year,
                _sessionDate.month,
                _sessionDate.day,
              ),
            );
        if (!mounted) return;
        final skippedText = recurringResult.skippedCount > 0
            ? ', пропущено из-за конфликтов: ${recurringResult.skippedCount}'
            : '';
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(
          SnackBar(
            content: Text(
              _isRecurring
                  ? 'Тренировка добавлена. Создано занятий: ${recurringResult.createdCount}$skippedText'
                  : 'Тренировка добавлена. Создано сессий: ${recurringResult.createdCount}$skippedText',
            ),
          ),
        );
        context.read<ServicesStaffCache>().invalidateServices(studioId);
        context.read<OwnerSessionsCache>().invalidate();
        Navigator.of(context).pop(true);
      } else {
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(
          SnackBar(content: Text(context.read<LocaleProvider>().t('common.errorGeneric'))),
        );
      }
    } catch (e) {
      if (!mounted) return;
      if (isSessionPlanLimitError(e)) {
        await showSessionPlanLimitDialog(
          context,
          error: e,
          offerUpgrade: true,
        );
      } else {
        showApiError(context, e);
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final loc = context.watch<LocaleProvider>();
    final user = context.read<AuthService>().user;
    final ownerName = user?.name?.trim().isNotEmpty == true
        ? user!.name!.trim()
        : (user?.email ?? 'Владелец студии');
    final textTheme = Theme.of(context).textTheme;
    return PopScope(
      canPop: _step == 1,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop && _step == 2) {
          setState(() => _step = 1);
        }
      },
      child: Scaffold(
        backgroundColor: AppColors.backgroundSecondary,
        appBar: AppBar(
          automaticallyImplyLeading: false,
          leading: _step == 1 ? _step1CloseLeading() : _step2BackLeading(),
          leadingWidth: 56,
          title: Text(
            _step == 1
                ? loc.t('addTraining.newClassStep1')
                : loc.t('addTraining.newClassStep2'),
            style: TextStyle(
              fontSize: 14.sp,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          centerTitle: true,
          backgroundColor: AppColors.backgroundSecondary,
          foregroundColor: AppColors.textPrimary,
          elevation: 0,
          scrolledUnderElevation: 0,
        ),
        body: _loading
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.primary500),
              )
            : ListView(
                padding: const EdgeInsets.symmetric(
                  horizontal: kScreenPaddingHorizontal,
                  vertical: 10,
                ),
                children: _step == 1
                    ? [
                        _stepFormLabel('Название'),
                        if (_existing.isEmpty)
                          TextField(
                            controller: _nameController,
                            style: _stepFieldInputStyle,
                            textInputAction: TextInputAction.next,
                            onChanged: (_) =>
                                setState(() => _step1NameError = false),
                            decoration: _regInputDecoration(
                              invalid: _step1NameError,
                              hintText: context.read<LocaleProvider>().t('addTraining.nameExample'),
                            ),
                          )
                        else
                          RawAutocomplete<ServiceItem>(
                            textEditingController: _nameController,
                            focusNode: _nameFocusNode,
                            displayStringForOption: (option) =>
                                option.displayName,
                            optionsBuilder: (value) {
                              final q = value.text.trim().toLowerCase();
                              final sorted = [..._existing]
                                ..sort(
                                  (a, b) => a.displayName
                                      .toLowerCase()
                                      .compareTo(b.displayName.toLowerCase()),
                                );
                              if (q.isEmpty) return sorted.take(8);
                              return sorted
                                  .where(
                                    (e) =>
                                        e.displayName.toLowerCase().contains(q),
                                  )
                                  .take(8);
                            },
                            onSelected: _applyExistingTrainingSelection,
                            fieldViewBuilder:
                                (context, ctrl, focusNode, onSubmit) {
                                  return TextField(
                                    controller: ctrl,
                                    focusNode: focusNode,
                                    style: _stepFieldInputStyle,
                                    textInputAction: TextInputAction.next,
                                    onChanged: (_) =>
                                        setState(() => _step1NameError = false),
                                    decoration: _regInputDecoration(
                                      invalid: _step1NameError,
                                      hintText: context.read<LocaleProvider>().t('addTraining.nameExample'),
                                    ),
                                  );
                                },
                            optionsViewBuilder: (context, onSelected, options) {
                              return Align(
                                alignment: Alignment.topLeft,
                                child: Material(
                                  elevation: 4,
                                  borderRadius: BorderRadius.circular(12),
                                  child: ConstrainedBox(
                                    constraints: BoxConstraints(
                                      maxHeight:
                                          MediaQuery.of(context).size.height *
                                          0.4,
                                      maxWidth:
                                          MediaQuery.of(context).size.width -
                                          2 * kScreenPaddingHorizontal,
                                    ),
                                    child: ListView(
                                      shrinkWrap: true,
                                      padding: EdgeInsets.zero,
                                      children: options.map((e) {
                                        final sub = _suggestionSubtitle(e);
                                        return ListTile(
                                          dense: true,
                                          title: Text(
                                            e.displayName,
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          subtitle: Text(
                                            sub,
                                            style: TextStyle(
                                              fontSize: 12.sp,
                                              color: AppColors.textSecondary,
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                          onTap: () => onSelected(e),
                                        );
                                      }).toList(),
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        if (_existing.isEmpty) ...[
                          const SizedBox(height: 8),
                          Text(
                            context.read<LocaleProvider>().t('addTraining.noExistingTrainings'),
                            style: TextStyle(
                              fontSize: 12.sp,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                        const SizedBox(height: 22),
                        Consumer<LocaleProvider>(
                          builder: (context, locale, _) {
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                _stepFormLabel('Категория'),
                                InkWell(
                                  borderRadius: BorderRadius.circular(999),
                                  onTap: _categories.isEmpty
                                      ? null
                                      : _openCategoryBottomSheet,
                                  child: InputDecorator(
                                    decoration: _regInputDecoration(
                                      invalid: _step1CategoryError,
                                      suffix: const Icon(
                                        CupertinoIcons.chevron_down,
                                        color: _kFormAccentPurple,
                                        size: 18,
                                      ),
                                    ),
                                    child: Text(
                                      _categoryLabel(locale),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 16.sp,
                                        fontWeight: FontWeight.w400,
                                        color: _selectedCategoryId == null
                                            ? AppColors.textSecondary
                                            : AppColors.textPrimary,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                        const SizedBox(height: 22),
                        Consumer<LocaleProvider>(
                          builder: (context, loc, _) {
                            final selected = _selectedLocation;
                            final displayName =
                                selected?.name.trim().isNotEmpty == true
                                ? selected!.name
                                : loc.t('addTraining.studioNameFallback');
                            final address = selected?.address.trim() ?? '';
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                _stepFormLabel(
                                  loc.t('addTraining.addressSectionLabel'),
                                ),
                                Material(
                                  color: AppColors.backgroundPrimary,
                                  borderRadius: BorderRadius.circular(12),
                                  clipBehavior: Clip.antiAlias,
                                  child: InkWell(
                                    onTap: _openLocationPicker,
                                    borderRadius: BorderRadius.circular(12),
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 14,
                                      ),
                                      child: Row(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Padding(
                                            padding: const EdgeInsets.only(
                                              top: 2,
                                            ),
                                            child: SvgPicture.asset(
                                              'assets/icons/icon-pin.svg',
                                              width: 15,
                                              height: 21,
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  displayName,
                                                  style: TextStyle(
                                                    fontSize: 19.sp,
                                                    fontWeight: FontWeight.w700,
                                                    color:
                                                        AppColors.textPrimary,
                                                  ),
                                                ),
                                                if (address.isNotEmpty) ...[
                                                  const SizedBox(height: 4),
                                                  Text(
                                                    address,
                                                    style: TextStyle(
                                                      fontSize: 14.sp,
                                                      height: 1.25,
                                                      fontWeight:
                                                          FontWeight.w400,
                                                      color: AppColors
                                                          .textSecondary,
                                                    ),
                                                  ),
                                                ] else
                                                  Padding(
                                                    padding:
                                                        const EdgeInsets.only(
                                                          top: 4,
                                                        ),
                                                    child: Text(
                                                      loc.t(
                                                        'addTraining.noAddress',
                                                      ),
                                                      style: TextStyle(
                                                        fontSize: 14.sp,
                                                        color: AppColors
                                                            .textTertiary,
                                                      ),
                                                    ),
                                                  ),
                                              ],
                                            ),
                                          ),
                                          const Padding(
                                            padding: EdgeInsets.only(top: 4),
                                            child: Icon(
                                              CupertinoIcons.chevron_forward,
                                              color: _kFormAccentPurple,
                                              size: 18,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                        const SizedBox(height: 22),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  _stepFormLabel('Длительность'),
                                  Consumer<LocaleProvider>(
                                    builder: (context, loc, _) =>
                                        _durationMinutesField(loc),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  _stepFormLabel('Вместительность'),
                                  TextField(
                                    controller: _capacityController,
                                    style: _stepFieldInputStyle,
                                    keyboardType: TextInputType.number,
                                    textInputAction: TextInputAction.next,
                                    onChanged: (_) => setState(
                                      () => _step1CapacityError = false,
                                    ),
                                    decoration: _regInputDecoration(
                                      invalid: _step1CapacityError,
                                      hintText: '10',
                                      prefixIcon: Icons.groups_rounded,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 22),
                        _stepFormLabel('Цена'),
                        TextField(
                          controller: _priceController,
                          style: _stepFieldInputStyle,
                          keyboardType: TextInputType.number,
                          textInputAction: TextInputAction.next,
                          inputFormatters: [_VndThousandsFormatter()],
                          onChanged: (_) =>
                              setState(() => _step1PriceError = false),
                          decoration: _regInputDecoration(
                            invalid: _step1PriceError,
                            hintText: context.read<LocaleProvider>().t('addTraining.enterPrice'),
                          ),
                        ),
                        const SizedBox(height: 22),
                        _stepFormLabel('Описание'),
                        TextField(
                          controller: _descriptionController,
                          style: _stepFieldInputStyle,
                          keyboardType: TextInputType.multiline,
                          textInputAction: TextInputAction.newline,
                          minLines: 3,
                          maxLines: 5,
                          decoration: _regInputDecoration(
                            invalid: false,
                            hintText: context.read<LocaleProvider>().t('addTraining.descriptionOptional'),
                          ),
                        ),
                        const SizedBox(height: 22),
                        _stepFormLabel(loc.t('addTraining.step2.trainer')),
                        InputDecorator(
                          decoration: InputDecoration(
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(
                                color: AppColors.borderPrimary,
                              ),
                            ),
                            filled: true,
                            fillColor: AppColors.backgroundPrimary,
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 14,
                            ),
                          ),
                          child: Text(
                            ownerName,
                            style: TextStyle(
                              fontSize: 14.sp,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          loc.t('addTraining.step2.trainerProNote'),
                          style: TextStyle(
                            fontSize: 12.sp,
                            height: 1.35,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 30),
                        SizedBox(
                          height: 60,
                          child: FilledButton(
                            onPressed: () {
                              if (!_validateStep1()) return;
                              setState(() => _step = 2);
                            },
                            style: AuthFormStyles.primaryButtonStyle(),
                            child: Text(
                              context.read<LocaleProvider>().t('addTraining.nextStep'),
                              style: textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w600,
                                fontSize: 16.sp,
                                color: AppColors.textInverse,
                              ),
                            ),
                          ),
                        ),
                      ]
                    : _buildStep2Widgets(loc),
              ),
      ),
    );
  }
}

/// [applied] false: sheet closed without confirming (barrier / Cancel / X).
class _CategoryPickResult {
  const _CategoryPickResult.cancelled() : applied = false, categoryId = null;

  const _CategoryPickResult.apply(this.categoryId) : applied = true;

  final bool applied;
  final int? categoryId;
}

class _VndThousandsFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = newValue.text.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.isEmpty) return const TextEditingValue(text: '');

    final number = int.tryParse(digits);
    if (number == null) return oldValue;
    final formatted = _formatWithDots(number);

    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }

  String _formatWithDots(int value) {
    final raw = value.toString();
    final chars = raw.split('').reversed.toList();
    final parts = <String>[];
    for (var i = 0; i < chars.length; i++) {
      parts.add(chars[i]);
      if ((i + 1) % 3 == 0 && i + 1 < chars.length) {
        parts.add('.');
      }
    }
    return parts.reversed.join();
  }
}
