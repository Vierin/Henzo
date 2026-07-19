import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../constants/layout.dart';
import '../models/staff_member.dart';
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
import '../services/trainers_api_service.dart';
import '../utils/owner_paid_plan.dart';
import '../utils/plan_limit_dialogs.dart';
import '../utils/recurring_session_occurrences.dart';
import '../utils/show_api_error.dart';
import '../utils/training_locations_storage.dart';
import '../widgets/address_picker_modal.dart';
import '../widgets/auth/auth_form_styles.dart';
import '../widgets/schedule_style_date_picker.dart';
import '../widgets/common/henzo_header_back_button.dart';
import '../widgets/common/shimmer_box.dart';
import '../widgets/training/training_category_picker_sheet.dart';
import '../widgets/training/training_location_picker_sheet.dart';
import '../widgets/training/training_time_picker_sheet.dart';
import '../widgets/training/training_trainer_picker_sheet.dart';
import 'main_shell.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Matches registration / mock secondary controls (chevron, pin tint).
const Color _kFormAccentPurple = Color(0xFF6C5CE7);

/// Max class duration in minutes (8 hours).
const int _kMaxDurationMinutes = 480;

const Color _kRegHintMuted = Color(0x993F3F3F);

TextStyle _regHintTextStyle() => TextStyle(
  color: _kRegHintMuted,
  fontSize: 16.sp,
  fontWeight: FontWeight.w500,
  letterSpacing: -0.3,
);

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
  String _selectedLanguage = 'en';
  bool _isProPlan = false;
  List<StaffMember> _trainers = [];
  String? _selectedTrainerId;
  bool _loadingTrainers = false;

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
      hintStyle: _regHintTextStyle(),
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
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    _MaxIntValueFormatter(_kMaxDurationMinutes),
                  ],
                  onChanged: (_) => setState(() => _step1DurationError = false),
                  decoration: InputDecoration(
                    hintText: '60',
                    hintStyle: _regHintTextStyle(),
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
                    fontWeight: FontWeight.w500,
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
    padding: const EdgeInsets.only(bottom: 10),
    child: Text(
      text.toUpperCase(),
      style: TextStyle(
        fontSize: 13.sp,
        fontWeight: FontWeight.w500,
        letterSpacing: -0.2,
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
    return HenzoHeaderBackButton(onPressed: () => setState(() => _step = 1));
  }

  bool _validateStep1() {
    final nameOk = _nameController.text.trim().isNotEmpty;
    final duration = int.tryParse(_durationController.text.trim()) ?? 0;
    final durationOk = duration > 0 && duration <= _kMaxDurationMinutes;
    final capacity = int.tryParse(_capacityController.text.trim()) ?? 0;
    final capacityOk = capacity > 0 && capacity <= 30;
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
        content: Text(
          context.read<LocaleProvider>().t('addTraining.checkErrors'),
        ),
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

  static const _kLanguageOptions = [
    ('en', 'English'),
    ('ru', 'Русский'),
    ('vi', 'Tiếng Việt'),
  ];

  String _languageLabel() {
    return _kLanguageOptions
        .firstWhere(
          (l) => l.$1 == _selectedLanguage,
          orElse: () => (_selectedLanguage, _selectedLanguage),
        )
        .$2;
  }

  Future<void> _openLanguagePicker() async {
    final selected = await showModalBottomSheet<String>(
      context: context,
      useRootNavigator: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            for (final (code, name) in _kLanguageOptions)
              ListTile(
                title: Text(name),
                trailing: _selectedLanguage == code
                    ? const Icon(
                        Icons.check_rounded,
                        color: AppColors.primary500,
                      )
                    : null,
                onTap: () => Navigator.of(ctx).pop(code),
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (!mounted || selected == null) return;
    setState(() => _selectedLanguage = selected);
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
    final result = await showTrainingCategoryPickerSheet(
      context: context,
      locale: loc,
      categories: _categories,
      selectedCategoryId: _selectedCategoryId,
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

  DateTime get _sessionDayOnly =>
      DateTime(_sessionDate.year, _sessionDate.month, _sessionDate.day);

  DateTime get _recurringEndDayOnly {
    var end = DateTime(
      _recurringEndDate.year,
      _recurringEndDate.month,
      _recurringEndDate.day,
    );
    final cap = _recurringRangeCap();
    if (end.isAfter(cap)) end = cap;
    if (end.isBefore(_sessionDayOnly)) end = _sessionDayOnly;
    return end;
  }

  int _weeksCountForRecurringApi() {
    final days = _recurringEndDayOnly.difference(_sessionDayOnly).inDays + 1;
    return ((days + 6) ~/ 7).clamp(1, 26);
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

  int _plannedRecurringSessionCount() {
    if (!_isRecurring || _recurringDays.isEmpty) return 0;
    return countPlannedRecurringSessions(
      studio: _studio,
      startsFromDate: _sessionDayOnly,
      endsOnDate: _recurringEndDayOnly,
      daysOfWeek: _recurringDays.toList(),
      weeksCount: _weeksCountForRecurringApi(),
    );
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

  TextStyle get _step2InputTextStyle => TextStyle(
    fontSize: 15.sp,
    fontWeight: FontWeight.w500,
    color: AppColors.textPrimary,
  );

  TextStyle get _step2ScheduleTimeTextStyle => TextStyle(
    fontSize: 14.sp,
    fontWeight: FontWeight.w500,
    color: AppColors.textPrimary,
  );

  TextStyle get _step2HintTextStyle => TextStyle(
    fontSize: 15.sp,
    fontWeight: FontWeight.w500,
    color: AppColors.textSecondary,
    letterSpacing: -0.3,
  );

  Widget _step2CalendarIcon({
    double width = 13,
    Color color = AppColors.textSecondary,
  }) {
    return SvgPicture.asset(
      'assets/icons/icon-calendar.svg',
      width: width,
      height: width * 12 / 13,
      fit: BoxFit.contain,
      excludeFromSemantics: true,
      colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
    );
  }

  Widget _step2CalendarIconBox({Color color = AppColors.textSecondary}) {
    return SizedBox(
      width: 16,
      height: 16,
      child: _step2CalendarIcon(color: color),
    );
  }

  Widget _step2DateField({
    required String value,
    required VoidCallback onTap,
    Color iconColor = AppColors.textSecondary,
  }) {
    return Material(
      color: AppColors.backgroundPrimary,
      borderRadius: BorderRadius.circular(_kStep2FieldRadius),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(_kStep2FieldRadius),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 12, 16),
          child: Row(
            children: [
              Expanded(child: Text(value, style: _step2InputTextStyle)),
              _step2CalendarIconBox(color: iconColor),
            ],
          ),
        ),
      ),
    );
  }

  InputDecoration _step2FieldDecoration({Widget? suffixIcon}) {
    final r = BorderRadius.circular(_kStep2FieldRadius);
    const noneSide = BorderSide.none;
    const focusSide = BorderSide(color: AppColors.primary500, width: 1.2);
    return InputDecoration(
      hintStyle: _step2HintTextStyle,
      filled: true,
      fillColor: AppColors.backgroundPrimary,
      suffixIcon: suffixIcon,
      suffixIconConstraints: suffixIcon == null
          ? null
          : const BoxConstraints(minWidth: 36, minHeight: 44),
      border: OutlineInputBorder(borderRadius: r, borderSide: noneSide),
      enabledBorder: OutlineInputBorder(borderRadius: r, borderSide: noneSide),
      focusedBorder: OutlineInputBorder(borderRadius: r, borderSide: focusSide),
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
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
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
                      Text(value, style: _step2ScheduleTimeTextStyle),
                    ],
                  ),
                ),
                _step2CalendarIconBox(color: AppColors.textTertiary),
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
                    fontWeight: FontWeight.w500,
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
                        fontWeight: FontWeight.w500,
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
        _step2DateField(
          value: _formatYMMMd(_sessionDate, loc),
          onTap: _pickSessionDateOnStep2,
        ),
        const SizedBox(height: 18),
        _stepFormLabel(loc.t('addTraining.step2.time')),
        InkWell(
          onTap: () async {
            final picked = await showTrainingTimePickerSheet(
              context,
              _sessionTime,
            );
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
            child: Text(_timeToHm(_sessionTime), style: _step2InputTextStyle),
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
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
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
                          final picked = await showTrainingTimePickerSheet(
                            context,
                            time,
                          );
                          if (picked != null && mounted) {
                            setState(() => _recurringDayTimes[day] = picked);
                          }
                        },
                        borderRadius: BorderRadius.circular(10),
                        child: InputDecorator(
                          decoration: InputDecoration(
                            hintStyle: _step2HintTextStyle.copyWith(
                              fontSize: 14.sp,
                            ),
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
                                width: 1.2,
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
                            style: _step2ScheduleTimeTextStyle,
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
            final n = _plannedRecurringSessionCount();
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
                          loc.t('common.add'),
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
      final isPaidPlan = await resolveOwnerHasPaidPlan(token);
      List<StaffMember> trainers = [];
      if (studio != null) {
        trainers = await TrainersApiService.getByStudio(token, studio.id);
      }
      if (!mounted) return;
      final locale = context.read<LocaleProvider>();
      final authUser = authService.user;
      String? defaultTrainerId;
      final ownerEmail = authUser?.email.trim().toLowerCase();
      if (ownerEmail != null && ownerEmail.isNotEmpty) {
        final ownerMatch = trainers.where(
          (t) => (t.email ?? '').trim().toLowerCase() == ownerEmail,
        );
        if (ownerMatch.isNotEmpty) defaultTrainerId = ownerMatch.first.id;
      }
      defaultTrainerId ??= trainers.isNotEmpty ? trainers.first.id : null;
      setState(() {
        _studio = studio;
        _applyLocationsFromStudio(studio, locale);
        _existing = list;
        _categories = TrainingCategoryOption.withOtherLast(categories);
        _isProPlan = isPaidPlan;
        _trainers = trainers;
        _selectedTrainerId = defaultTrainerId;
        _loadingTrainers = false;
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

  StaffMember? get _selectedTrainer {
    final id = _selectedTrainerId;
    if (id == null) return null;
    for (final t in _trainers) {
      if (t.id == id) return t;
    }
    return null;
  }

  String _trainerDisplayLabel(String ownerFallback) {
    if (_loadingTrainers) return ownerFallback;
    final selected = _selectedTrainer;
    if (selected != null && selected.name.trim().isNotEmpty) {
      return selected.name.trim();
    }
    return ownerFallback;
  }

  Future<void> _openTrainerPicker() async {
    if (!_isProPlan || _trainers.isEmpty) return;
    final picked = await showTrainingTrainerPickerSheet(
      context,
      trainers: _trainers,
      selectedId: _selectedTrainerId,
    );
    if (!mounted || picked == null) return;
    setState(() => _selectedTrainerId = picked);
  }

  Widget _trainerFieldDecoration({required Widget child}) {
    return InputDecorator(
      decoration: InputDecoration(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        filled: true,
        fillColor: AppColors.backgroundPrimary,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 14,
        ),
      ),
      child: child,
    );
  }

  Widget _buildTrainerField(LocaleProvider loc, String ownerName) {
    final canPick = _isProPlan && !_loadingTrainers && _trainers.isNotEmpty;
    final label = _trainerDisplayLabel(ownerName);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _stepFormLabel(loc.t('addTraining.step2.trainer')),
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: canPick ? _openTrainerPicker : null,
            borderRadius: BorderRadius.circular(14),
            child: _trainerFieldDecoration(
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      label,
                      style: TextStyle(
                        fontSize: 14.sp,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  if (canPick)
                    const Icon(
                      CupertinoIcons.chevron_down,
                      color: _kFormAccentPurple,
                      size: 18,
                    ),
                ],
              ),
            ),
          ),
        ),
        if (!_isProPlan) ...[
          const SizedBox(height: 8),
          Text(
            loc.t('addTraining.step2.trainerProNote'),
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

  Future<void> _save() async {
    final token = context.read<AuthService>().accessToken;
    final studioId = _studio?.id;
    final name = _nameController.text.trim();
    final duration = int.tryParse(_durationController.text.trim()) ?? 0;
    final priceInt = _parsePriceDigits();
    final price = priceInt.toDouble();
    final capacity = int.tryParse(_capacityController.text.trim()) ?? 0;
    if (token == null || token.isEmpty || studioId == null) {
      if (!mounted) return;
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(
          content: Text(
            context.read<LocaleProvider>().t('common.setupSalonFirst'),
          ),
        ),
      );
      return;
    }
    if (name.isEmpty) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(
          content: Text(
            context.read<LocaleProvider>().t('addTraining.enterName'),
          ),
        ),
      );
      return;
    }
    if (duration <= 0 ||
        duration > _kMaxDurationMinutes ||
        capacity <= 0 ||
        capacity > 30 ||
        price <= 0) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(
          content: Text(
            context.read<LocaleProvider>().t('addTraining.invalidValues'),
          ),
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
          SnackBar(
            content: Text(
              context.read<LocaleProvider>().t('addTraining.selectDays'),
            ),
          ),
        );
        return;
      }
    }
    setState(() => _saving = true);
    try {
      // A training name is unique per studio. If one with this name already
      // exists (e.g. picked from search to extend it with more sessions), reuse
      // it instead of creating a duplicate (which would fail).
      String? trainingId;
      for (final e in _existing) {
        if (e.name.trim() == name) {
          trainingId = e.id;
          break;
        }
      }
      if (trainingId == null) {
        final created = await ServicesApiService.create(
          token,
          studioId: studioId,
          name: name,
          duration: duration,
          price: price,
          trainingCategoryId: _selectedCategoryId,
          description: _descriptionController.text.trim(),
          language: _selectedLanguage,
        );
        if (!mounted) return;
        if (created == null) {
          ScaffoldMessenger.maybeOf(context)?.showSnackBar(
            SnackBar(
              content: Text(
                context.read<LocaleProvider>().t('common.errorGeneric'),
              ),
            ),
          );
          return;
        }
        trainingId = created.id;
      }

      final sessionDay = _sessionDayOnly;
      final recurringResult =
          await DashboardApiService.createRecurringTrainingSessions(
            token,
            studioId: studioId,
            trainingId: trainingId,
            trainerId: _isProPlan ? _selectedTrainerId : null,
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
            weeksCount: _isRecurring ? _weeksCountForRecurringApi() : 1,
            startsFromDate: sessionDay,
            endsOnDate: _isRecurring ? _recurringEndDayOnly : sessionDay,
          );
      if (!mounted) return;
      final skippedText = recurringResult.skippedCount > 0
          ? ', пропущено из-за конфликтов: ${recurringResult.skippedCount}'
          : '';
      final createdN = recurringResult.createdCount;
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(
          content: Text(
            _isRecurring
                ? 'Тренировка добавлена. Создано занятий: $createdN$skippedText'
                : createdN == 1
                ? 'Тренировка и занятие добавлены$skippedText'
                : 'Тренировка добавлена. Создано занятий: $createdN$skippedText',
          ),
        ),
      );
      context.read<ServicesStaffCache>().invalidateServices(studioId);
      context.read<OwnerSessionsCache>().invalidate();
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      if (isSessionPlanLimitError(e)) {
        await showSessionPlanLimitDialog(context, error: e, offerUpgrade: true);
      } else {
        showApiError(context, e);
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  /// Skeleton mirroring the step-1 form layout, shown while data loads so the
  /// page renders instantly instead of blocking on a full-screen spinner.
  Widget _buildStep1Skeleton() {
    Widget label() =>
        const ShimmerBox(height: 12, width: 110, borderRadius: 4);
    Widget field({double height = 56}) =>
        ShimmerBox(height: height, borderRadius: 12);
    Widget block({double fieldHeight = 56}) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        label(),
        const SizedBox(height: 10),
        field(height: fieldHeight),
      ],
    );

    return ListView(
      padding: const EdgeInsets.symmetric(
        horizontal: kScreenPaddingHorizontal,
        vertical: 10,
      ),
      children: [
        block(),
        const SizedBox(height: 22),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: block()),
            const SizedBox(width: 12),
            Expanded(child: block()),
          ],
        ),
        const SizedBox(height: 22),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: block()),
            const SizedBox(width: 12),
            Expanded(child: block()),
          ],
        ),
        const SizedBox(height: 22),
        block(fieldHeight: 110),
        const SizedBox(height: 22),
        block(),
        const SizedBox(height: 30),
        field(height: 60),
      ],
    );
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
            ? _buildStep1Skeleton()
            : GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => FocusScope.of(context).unfocus(),
                child: ListView(
                padding: const EdgeInsets.symmetric(
                  horizontal: kScreenPaddingHorizontal,
                  vertical: 10,
                ),
                children: _step == 1
                    ? [
                        _stepFormLabel(loc.t('addTraining.trainingName')),
                        if (_existing.isEmpty)
                          TextField(
                            controller: _nameController,
                            style: _stepFieldInputStyle,
                            textInputAction: TextInputAction.next,
                            onChanged: (_) =>
                                setState(() => _step1NameError = false),
                            decoration: _regInputDecoration(
                              invalid: _step1NameError,
                              hintText: context.read<LocaleProvider>().t(
                                'addTraining.nameExample',
                              ),
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
                                      hintText: context
                                          .read<LocaleProvider>()
                                          .t('addTraining.nameExample'),
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
                            context.read<LocaleProvider>().t(
                              'addTraining.noExistingTrainings',
                            ),
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
                                _stepFormLabel(
                                  locale.t('addTraining.category'),
                                ),
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
                                        letterSpacing: -0.3,
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
                                              height: 18,
                                            ),
                                          ),
                                          const SizedBox(width: 14),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  displayName,
                                                  style: TextStyle(
                                                    fontSize: 16.sp,
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
                                                          top: 0,
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
                                  _stepFormLabel(loc.t('addTraining.duration')),
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
                                  _stepFormLabel(loc.t('addTraining.capacity')),
                                  TextField(
                                    controller: _capacityController,
                                    style: _stepFieldInputStyle,
                                    keyboardType: TextInputType.number,
                                    textInputAction: TextInputAction.next,
                                    inputFormatters: [
                                      FilteringTextInputFormatter.digitsOnly,
                                      _MaxIntValueFormatter(30),
                                    ],
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
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  _stepFormLabel(loc.t('addTraining.price')),
                                  TextField(
                                    controller: _priceController,
                                    style: _stepFieldInputStyle,
                                    keyboardType: TextInputType.number,
                                    textInputAction: TextInputAction.next,
                                    inputFormatters: [_VndThousandsFormatter()],
                                    onChanged: (_) => setState(
                                      () => _step1PriceError = false,
                                    ),
                                    decoration: _regInputDecoration(
                                      invalid: _step1PriceError,
                                      hintText: context
                                          .read<LocaleProvider>()
                                          .t('addTraining.enterPrice'),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  _stepFormLabel(loc.t('addTraining.language')),
                                  InkWell(
                                    borderRadius: BorderRadius.circular(12),
                                    onTap: _openLanguagePicker,
                                    child: InputDecorator(
                                      decoration: _regInputDecoration(
                                        invalid: false,
                                        suffix: const Icon(
                                          CupertinoIcons.chevron_down,
                                          color: _kFormAccentPurple,
                                          size: 18,
                                        ),
                                      ),
                                      child: Text(
                                        _languageLabel(),
                                        style: TextStyle(
                                          fontSize: 16.sp,
                                          fontWeight: FontWeight.w400,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 22),
                        _stepFormLabel(loc.t('addTraining.description')),
                        TextField(
                          controller: _descriptionController,
                          style: _stepFieldInputStyle,
                          keyboardType: TextInputType.multiline,
                          textInputAction: TextInputAction.newline,
                          minLines: 3,
                          maxLines: 5,
                          decoration: _regInputDecoration(
                            invalid: false,
                            hintText: context.read<LocaleProvider>().t(
                              'addTraining.descriptionOptional',
                            ),
                          ),
                        ),
                        const SizedBox(height: 22),
                        _buildTrainerField(loc, ownerName),
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
                              context.read<LocaleProvider>().t(
                                'addTraining.nextStep',
                              ),
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
      ),
    );
  }
}

class _MaxIntValueFormatter extends TextInputFormatter {
  final int max;
  _MaxIntValueFormatter(this.max);

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    if (newValue.text.isEmpty) return newValue;
    final n = int.tryParse(newValue.text);
    if (n == null) return oldValue;
    if (n > max) {
      final clamped = max.toString();
      return TextEditingValue(
        text: clamped,
        selection: TextSelection.collapsed(offset: clamped.length),
      );
    }
    return newValue;
  }
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
