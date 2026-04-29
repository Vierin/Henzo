import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../models/salon.dart';
import '../models/service_item.dart';
import '../models/training_category_option.dart';
import '../l10n/locale_provider.dart';
import '../services/auth_service.dart';
import '../services/dashboard_api_service.dart';
import '../services/cache/salon_cache.dart';
import '../services/cache/services_staff_cache.dart';
import '../services/services_api_service.dart';
import '../utils/show_api_error.dart';

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
  final _priceController = TextEditingController(text: '200.000');
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

  InputDecoration _step1Decoration({required bool invalid, String? hintText}) {
    final danger = AppColors.error600;
    final normal = AppColors.borderPrimary;
    return InputDecoration(
      hintText: hintText,
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: invalid ? danger : normal,
          width: invalid ? 1.5 : 1,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: invalid ? danger : AppColors.primary500,
          width: invalid ? 1.5 : 2,
        ),
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: invalid ? danger : normal,
          width: invalid ? 1.5 : 1,
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

  void _showCategoryInfo() {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Информация'),
        content: const Text(
          'Если нет категории для вашей услуги, пожалуйста сообщите нам об этом, и мы добавим ее как можно скорее.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Понятно'),
          ),
        ],
      ),
    );
  }

  String _categoryLabel(String localeCode) {
    final id = _selectedCategoryId;
    if (id == null) return 'Выберите категорию';
    for (final c in _categories) {
      if (c.id == id) return c.label(localeCode);
    }
    return 'Выберите категорию';
  }

  Future<void> _openCategoryBottomSheet() async {
    if (_categories.isEmpty) return;
    int? temp = _selectedCategoryId;
    final localeCode = context.read<LocaleProvider>().localeCode;
    final result = await showModalBottomSheet<int?>(
      context: context,
      showDragHandle: false,
      isScrollControlled: true,
      backgroundColor: AppColors.backgroundPrimary,
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 14),
            child: StatefulBuilder(
              builder: (context, setModalState) {
                return Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Категория',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.of(ctx).pop(),
                          icon: const Icon(Icons.close),
                          color: AppColors.textSecondary,
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Flexible(
                      child: ListView(
                        shrinkWrap: true,
                        itemExtent: 44,
                        children: _categories.map((c) {
                          final selected = temp == c.id;
                          return ListTile(
                            dense: true,
                            minVerticalPadding: 0,
                            visualDensity: const VisualDensity(
                              vertical: -3,
                              horizontal: 0,
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 4,
                            ),
                            title: Text(c.label(localeCode)),
                            trailing: selected
                                ? const Icon(
                                    Icons.check,
                                    color: AppColors.primary500,
                                  )
                                : null,
                            onTap: () => setModalState(() => temp = c.id),
                          );
                        }).toList(),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => setModalState(() => temp = null),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(
                                color: AppColors.borderPrimary,
                              ),
                            ),
                            child: const Text('Сбросить'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: FilledButton(
                            onPressed: () => Navigator.of(ctx).pop(temp),
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.primary500,
                            ),
                            child: const Text('Применить'),
                          ),
                        ),
                      ],
                    ),
                  ],
                );
              },
            ),
          ),
        );
      },
    );
    if (!mounted) return;
    setState(() {
      _selectedCategoryId = result;
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
        _categories = categories;
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
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        title: Text(
          _step == 1
              ? 'Добавить тренировку • 1/2'
              : 'Добавить тренировку • 2/2',
        ),
        backgroundColor: AppColors.backgroundPrimary,
        foregroundColor: AppColors.textPrimary,
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary500),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: _step == 1
                  ? [
                      const Text(
                        'Название',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      if (_existing.isEmpty)
                        TextField(
                          controller: _nameController,
                          onChanged: (_) =>
                              setState(() => _step1NameError = false),
                          decoration: _step1Decoration(
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
                                  onChanged: (_) =>
                                      setState(() => _step1NameError = false),
                                  decoration: _step1Decoration(
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
                                        MediaQuery.of(context).size.width - 32,
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
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Длительность (мин)',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                TextField(
                                  controller: _durationController,
                                  keyboardType: TextInputType.number,
                                  onChanged: (_) => setState(
                                    () => _step1DurationError = false,
                                  ),
                                  decoration: _step1Decoration(
                                    invalid: _step1DurationError,
                                    hintText: '60',
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Вместительность',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                TextField(
                                  controller: _capacityController,
                                  keyboardType: TextInputType.number,
                                  onChanged: (_) => setState(
                                    () => _step1CapacityError = false,
                                  ),
                                  decoration: _step1Decoration(
                                    invalid: _step1CapacityError,
                                    hintText: '10',
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Consumer<LocaleProvider>(
                        builder: (context, locale, _) {
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Text(
                                    'Категория',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  InkWell(
                                    borderRadius: BorderRadius.circular(12),
                                    onTap: _showCategoryInfo,
                                    child: const Padding(
                                      padding: EdgeInsets.all(2),
                                      child: Icon(
                                        Icons.info_outline,
                                        size: 16,
                                        color: AppColors.textSecondary,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              InkWell(
                                borderRadius: BorderRadius.circular(12),
                                onTap: _categories.isEmpty
                                    ? null
                                    : _openCategoryBottomSheet,
                                child: InputDecorator(
                                  decoration: _step1Decoration(
                                    invalid: _step1CategoryError,
                                  ),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          _categoryLabel(locale.localeCode),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w500,
                                            color: _selectedCategoryId == null
                                                ? AppColors.textSecondary
                                                : AppColors.textPrimary,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      const Icon(
                                        Icons.keyboard_arrow_down_rounded,
                                        color: AppColors.textSecondary,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          );
                        },
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Цена',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _priceController,
                        keyboardType: TextInputType.number,
                        inputFormatters: [_VndThousandsFormatter()],
                        onChanged: (_) =>
                            setState(() => _step1PriceError = false),
                        decoration: _step1Decoration(
                          invalid: _step1PriceError,
                          hintText: '100.000',
                        ),
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        height: 46,
                        child: FilledButton(
                          onPressed: () {
                            if (!_validateStep1()) return;
                            setState(() => _step = 2);
                          },
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.primary500,
                          ),
                          child: const Text('Далее'),
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
                          final picked = await showTimePicker(
                            context: context,
                            initialTime: _sessionTime,
                          );
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
                                      final picked = await showTimePicker(
                                        context: context,
                                        initialTime: time,
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
                      const SizedBox(height: 16),
                      const Text(
                        'Тренер',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 6),
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
