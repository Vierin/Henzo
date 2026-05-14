import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../constants/layout.dart';
import '../models/salon.dart';
import '../models/service_item.dart';
import '../models/training_category_option.dart';
import '../l10n/locale_provider.dart';
import '../services/auth_service.dart';
import '../services/dashboard_api_service.dart';
import '../services/cache/owner_sessions_cache.dart';
import '../services/cache/salon_cache.dart';
import '../services/cache/services_staff_cache.dart';
import '../services/services_api_service.dart';
import '../utils/show_api_error.dart';
import '../widgets/app_search_prefix_icon.dart';
import 'main_shell.dart';

/// Matches registration / mock secondary controls (chevron, pin tint).
const Color _kFormAccentPurple = Color(0xFF6C5CE7);

const Color _kRegHintMuted = Color(0x993F3F3F);

bool _trainingCategoryIsOther(TrainingCategoryOption c) =>
    c.nameEn.trim().toLowerCase() == 'other';

List<TrainingCategoryOption> _categoriesWithOtherLast(
  List<TrainingCategoryOption> list,
) {
  final rest = <TrainingCategoryOption>[];
  final other = <TrainingCategoryOption>[];
  for (final c in list) {
    if (_trainingCategoryIsOther(c)) {
      other.add(c);
    } else {
      rest.add(c);
    }
  }
  return [...rest, ...other];
}

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
  final _durationController = TextEditingController(text: '60');
  final _priceController = TextEditingController();
  final _capacityController = TextEditingController(text: '10');

  bool _loading = true;
  bool _saving = false;
  int _step = 1;
  bool _isRecurring = false;
  final Set<int> _recurringDays = {1, 3, 5};
  final Map<int, TimeOfDay> _recurringDayTimes = {};
  DateTime _sessionDate = DateTime.now();
  TimeOfDay _sessionTime = const TimeOfDay(hour: 9, minute: 0);
  Salon? _studio;
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
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _nameController.dispose();
    _nameFocusNode.dispose();
    _durationController.dispose();
    _priceController.dispose();
    _capacityController.dispose();
    super.dispose();
  }

  String _weekdayLabel(int weekday) {
    const labels = {
      1: 'ПН',
      2: 'ВТ',
      3: 'СР',
      4: 'ЧТ',
      5: 'ПТ',
      6: 'СБ',
      7: 'ВС',
    };
    return labels[weekday] ?? '?';
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
    return showModalBottomSheet<TimeOfDay>(
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
                        child: const Text(
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
      hintStyle: const TextStyle(
        color: _kRegHintMuted,
        fontSize: 16,
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
      suffixStyle: const TextStyle(
        fontSize: 16,
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

  static const TextStyle _stepFieldInputStyle = TextStyle(
    fontSize: 16,
    color: AppColors.textPrimary,
  );

  Widget _stepFormLabel(String text) => Padding(
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
      const SnackBar(
        content: Text('Проверьте поля, отмеченные красной рамкой'),
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

  int _bookingPeriodDays() {
    final raw = _studio?.reminderSettings?['bookingPeriodDays'];
    int days = 14;
    if (raw is int) days = raw;
    if (raw is num) days = raw.toInt();
    if (raw is String) days = int.tryParse(raw) ?? 14;
    if (days < 1) return 1;
    if (days > 60) return 60;
    return days;
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
    int? temp = _selectedCategoryId;
    var searchQuery = '';
    final result = await showModalBottomSheet<_CategoryPickResult?>(
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
              height: h * 0.58,
              child: StatefulBuilder(
                builder: (context, setModalState) {
                  final q = searchQuery.trim().toLowerCase();
                  final filtered = q.isEmpty
                      ? _categories
                      : _categories.where((c) {
                          final label = c.label(localeCode).toLowerCase();
                          return label.contains(q) ||
                              c.nameEn.toLowerCase().contains(q) ||
                              c.nameRu.toLowerCase().contains(q) ||
                              c.nameVn.toLowerCase().contains(q);
                        }).toList();
                  return Column(
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
                                style: const TextStyle(
                                  fontSize: 13,
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
                      const SizedBox(height: 4),
                      TextField(
                        onChanged: (v) =>
                            setModalState(() => searchQuery = v),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w400,
                          color: AppColors.textPrimary,
                        ),
                        decoration: InputDecoration(
                          hintText: loc.t('addTraining.categorySearchHint'),
                          hintStyle: const TextStyle(
                            color: _kRegHintMuted,
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                          ),
                          isDense: true,
                          filled: true,
                          fillColor: AppColors.backgroundPrimary,
                          prefixIcon: const Padding(
                            padding: EdgeInsets.only(left: 12, right: 6),
                            child: AppSearchPrefixIcon(
                              width: 14,
                              height: 15,
                            ),
                          ),
                          prefixIconConstraints: const BoxConstraints(
                            minWidth: 0,
                            minHeight: 0,
                          ),
                          contentPadding: const EdgeInsets.fromLTRB(
                            0,
                            12,
                            14,
                            12,
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(
                              color: AppColors.primary500,
                              width: 1.2,
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(
                              color: AppColors.primary500,
                              width: 1.4,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),
                      Expanded(
                        child: SingleChildScrollView(
                          child: Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: filtered.map((c) {
                              final selected = temp == c.id;
                              final isOther = _trainingCategoryIsOther(c);
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
                                  onTap: () =>
                                      setModalState(() => temp = c.id),
                                  borderRadius: BorderRadius.circular(999),
                                  child: Ink(
                                    decoration: BoxDecoration(
                                      color: bg,
                                      borderRadius:
                                          BorderRadius.circular(999),
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
                                        fontSize: 13,
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: SizedBox(
                              height: 48,
                              child: OutlinedButton(
                                onPressed: popCancel,
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
                                child: Text(loc.t('common.cancel')),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: SizedBox(
                              height: 48,
                              child: FilledButton(
                                onPressed: () => Navigator.of(sheetCtx).pop(
                                  _CategoryPickResult.apply(temp),
                                ),
                                style: FilledButton.styleFrom(
                                  backgroundColor: AppColors.primary500,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                child: Text(
                                  loc.t('addTraining.apply'),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  );
                },
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

  List<DateTime> _buildRecurringPreview() {
    if (!_isRecurring || _recurringDays.isEmpty) return [];
    final start = DateTime(
      _sessionDate.year,
      _sessionDate.month,
      _sessionDate.day,
    );
    final end = start.add(Duration(days: _bookingPeriodDays()));
    final sortedDays = _recurringDays.toList()..sort();
    final dates = <DateTime>[];
    for (var i = 0; i <= _bookingPeriodDays(); i++) {
      final day = start.add(Duration(days: i));
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
      if (!candidate.isAfter(end)) {
        dates.add(candidate);
      }
    }
    dates.sort((a, b) => a.compareTo(b));
    return dates;
  }

  Future<void> _load() async {
    final authService = context.read<AuthService>();
    final salonCache = context.read<SalonCache>();
    final servicesStaffCache = context.read<ServicesStaffCache>();
    final token = authService.accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    try {
      final studio = await salonCache.getSalon(token);
      final list = studio != null
          ? await servicesStaffCache.getServicesForSalon(token, studio.id)
          : <ServiceItem>[];
      final categories = await ServicesApiService.getTrainingCategories(token);
      if (!mounted) return;
      setState(() {
        _studio = studio;
        _existing = list;
        _categories = _categoriesWithOtherLast(categories);
        _loading = false;
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
        const SnackBar(content: Text('Введите название тренировки')),
      );
      return;
    }
    if (duration <= 0 || capacity <= 0 || price <= 0) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(
          content: Text('Цена, длительность и вместительность должны быть > 0'),
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
          const SnackBar(content: Text('Выберите хотя бы один день недели')),
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
      );
      if (!mounted) return;
      if (created != null) {
        final recurringResult =
            await DashboardApiService.createRecurringTrainingSessions(
              token,
              studioId: studioId,
              trainingId: created.id,
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
          const SnackBar(content: Text('Не удалось добавить тренировку')),
        );
      }
    } catch (e) {
      if (mounted) showApiError(context, e);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.read<AuthService>().user;
    final ownerName = user?.name?.trim().isNotEmpty == true
        ? user!.name!.trim()
        : (user?.email ?? 'Владелец студии');
    final textTheme = Theme.of(context).textTheme;
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        automaticallyImplyLeading: _step != 1,
        leading: _step == 1 ? _step1CloseLeading() : null,
        leadingWidth: _step == 1 ? 56 : null,
        title: Text(
          _step == 1
              ? 'Добавить тренировку · 1/2'
              : 'Добавить тренировку · 2/2',
          style: const TextStyle(
            fontSize: 14,
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
                            hintText: 'Например: Vinyasa Flow',
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
                                (a, b) => a.displayName.toLowerCase().compareTo(
                                  b.displayName.toLowerCase(),
                                ),
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
                                    hintText: 'Например: Vinyasa Flow',
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
                                            fontSize: 12,
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
                        const Text(
                          'У этой студии пока нет тренировок. Введите название новой.',
                          style: TextStyle(
                            fontSize: 12,
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
                                      fontSize: 16,
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
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Text(
                          'Main studio',
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ),
                      Material(
                        color: AppColors.backgroundPrimary,
                        borderRadius: BorderRadius.circular(28),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 14,
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.location_on_rounded,
                                color: _kFormAccentPurple,
                                size: 26,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _studio?.name?.trim().isNotEmpty == true
                                          ? _studio!.name!.trim()
                                          : 'Студия',
                                      style: const TextStyle(
                                        fontSize: 19,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                    if ((_studio?.address ?? '')
                                        .trim()
                                        .isNotEmpty) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        _studio!.address!.trim(),
                                        style: const TextStyle(
                                          fontSize: 14,
                                          height: 1.25,
                                          fontWeight: FontWeight.w400,
                                          color: AppColors.textSecondary,
                                        ),
                                      ),
                                    ] else
                                      const Padding(
                                        padding: EdgeInsets.only(top: 4),
                                        child: Text(
                                          'Адрес не указан',
                                          style: TextStyle(
                                            fontSize: 14,
                                            color: AppColors.textTertiary,
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                              const Icon(
                                CupertinoIcons.chevron_forward,
                                color: _kFormAccentPurple,
                                size: 18,
                              ),
                            ],
                          ),
                        ),
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
                                TextField(
                                  controller: _durationController,
                                  style: _stepFieldInputStyle,
                                  keyboardType: TextInputType.number,
                                  textInputAction: TextInputAction.next,
                                  onChanged: (_) => setState(
                                    () => _step1DurationError = false,
                                  ),
                                  decoration: _regInputDecoration(
                                    invalid: _step1DurationError,
                                    hintText: '60',
                                    prefixIcon: Icons.access_time_rounded,
                                    suffixText: 'мин',
                                  ),
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
                        textInputAction: TextInputAction.done,
                        inputFormatters: [_VndThousandsFormatter()],
                        onChanged: (_) =>
                            setState(() => _step1PriceError = false),
                        decoration: _regInputDecoration(
                          invalid: _step1PriceError,
                          hintText: 'Введите цену',
                        ),
                      ),
                      const SizedBox(height: 22),
                      _stepFormLabel('Тренер'),
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
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Для добавления тренеров выкупите подписку Pro',
                        style: TextStyle(
                          fontSize: 12,
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
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.primary500,
                            foregroundColor: AppColors.textInverse,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(999),
                            ),
                          ),
                          child: Text(
                            'Следующий шаг',
                            style: textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w600,
                              fontSize: 16,
                              color: AppColors.textInverse,
                            ),
                          ),
                        ),
                      ),
                    ]
                  : [
                      const Text(
                        'Дата тренировки',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      InkWell(
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: _sessionDate,
                            firstDate: DateTime.now().subtract(
                              const Duration(days: 1),
                            ),
                            lastDate: DateTime.now().add(
                              const Duration(days: 365),
                            ),
                          );
                          if (picked != null && mounted) {
                            setState(() => _sessionDate = picked);
                          }
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: InputDecorator(
                          decoration: InputDecoration(
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: Text(
                            '${_sessionDate.day.toString().padLeft(2, '0')}.${_sessionDate.month.toString().padLeft(2, '0')}.${_sessionDate.year}',
                            style: const TextStyle(
                              fontSize: 14,
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Время тренировки',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      InkWell(
                        onTap: () async {
                          final picked = await _pickTimeWithWheel(_sessionTime);
                          if (picked != null && mounted) {
                            setState(() => _sessionTime = picked);
                          }
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: InputDecorator(
                          decoration: InputDecoration(
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: Text(
                            _timeToHm(_sessionTime),
                            style: const TextStyle(
                              fontSize: 14,
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        value: _isRecurring,
                        onChanged: (v) => setState(() => _isRecurring = v),
                        title: const Text(
                          'Повторяемая тренировка',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        subtitle: const Text(
                          'Если включено, занятия создаются по дням недели',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                      if (_isRecurring) ...[
                        const SizedBox(height: 8),
                        const Text(
                          'Дни недели',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: List.generate(7, (index) {
                            final day = index + 1;
                            final selected = _recurringDays.contains(day);
                            return FilterChip(
                              label: Text(_weekdayLabel(day)),
                              selected: selected,
                              onSelected: (v) {
                                setState(() {
                                  if (v) {
                                    _recurringDays.add(day);
                                    _recurringDayTimes[day] =
                                        _recurringDayTimes[day] ?? _sessionTime;
                                  } else {
                                    _recurringDays.remove(day);
                                    _recurringDayTimes.remove(day);
                                  }
                                });
                              },
                            );
                          }),
                        ),
                        const SizedBox(height: 16),
                        ...(_recurringDays.toList()..sort()).map((day) {
                          final time = _recurringDayTimes[day] ?? _sessionTime;
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(
                              children: [
                                SizedBox(
                                  width: 48,
                                  child: Text(
                                    _weekdayLabel(day),
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: InkWell(
                                    onTap: () async {
                                      final picked = await _pickTimeWithWheel(
                                        time,
                                      );
                                      if (picked != null && mounted) {
                                        setState(
                                          () =>
                                              _recurringDayTimes[day] = picked,
                                        );
                                      }
                                    },
                                    borderRadius: BorderRadius.circular(12),
                                    child: InputDecorator(
                                      decoration: InputDecoration(
                                        border: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                        ),
                                      ),
                                      child: Text(
                                        _timeToHm(time),
                                        style: const TextStyle(
                                          fontSize: 14,
                                          color: AppColors.textPrimary,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),
                        const SizedBox(height: 8),
                        Builder(
                          builder: (_) {
                            final preview = _buildRecurringPreview();
                            final firstThree = preview
                                .take(3)
                                .map((d) {
                                  final dd = d.day.toString().padLeft(2, '0');
                                  final mm = d.month.toString().padLeft(2, '0');
                                  final hh = d.hour.toString().padLeft(2, '0');
                                  final min = d.minute.toString().padLeft(
                                    2,
                                    '0',
                                  );
                                  return '$dd.$mm $hh:$min';
                                })
                                .join(', ');
                            return Text(
                              preview.isEmpty
                                  ? 'Будет создано 0 занятий'
                                  : 'Будет создано ${preview.length} занятий. Ближайшие: $firstThree',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                            );
                          },
                        ),
                      ],
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(
                            child: SizedBox(
                              height: 46,
                              child: OutlinedButton(
                                onPressed: _saving
                                    ? null
                                    : () => setState(() => _step = 1),
                                child: const Text('Назад'),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: SizedBox(
                              height: 46,
                              child: FilledButton(
                                onPressed: _saving ? null : _save,
                                style: FilledButton.styleFrom(
                                  backgroundColor: AppColors.primary500,
                                ),
                                child: _saving
                                    ? const SizedBox(
                                        height: 18,
                                        width: 18,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      )
                                    : const Text('Сохранить'),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
            ),
    );
  }
}

/// [applied] false: sheet closed without confirming (barrier / Cancel / X).
class _CategoryPickResult {
  const _CategoryPickResult.cancelled()
      : applied = false,
        categoryId = null;

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
