import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../models/salon.dart';
import '../../models/training_category_option.dart';
import '../../utils/currency_format.dart';
import '../../models/service_item.dart';
import '../../services/auth_service.dart';
import '../../services/cache/salon_cache.dart';
import '../../services/cache/services_staff_cache.dart';
import '../../services/services_api_service.dart';
import '../../utils/show_api_error.dart';
import '../../constants/layout.dart';
import '../../widgets/app_search_prefix_icon.dart';
import '../../widgets/settings/branded_settings_app_bar.dart';
import '../../widgets/training/owner_training_catalog_card.dart';
import 'add_training_screen.dart';

enum ServicesSort {
  nameAz,
  nameZa,
  priceAsc,
  priceDesc,
  durationAsc,
  durationDesc,
}

class ServicesScreen extends StatefulWidget {
  const ServicesScreen({
    super.key,
    this.openCreateOnStart = false,
  });

  final bool openCreateOnStart;

  @override
  State<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends State<ServicesScreen> {
  Salon? _salon;
  List<ServiceItem> _services = [];
  bool _isLoading = true;
  bool _isActionLoading = false;
  bool _didAutoOpenCreate = false;
  bool _didOpenEditFromRouteArgs = false;
  ServicesSort _sort = ServicesSort.nameAz;

  final _searchController = TextEditingController();
  String _searchQuery = '';
  String? _selectedCategory;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
    _searchController.addListener(
      () => setState(() => _searchQuery = _searchController.text.trim()),
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) {
        setState(() {
          _salon = null;
          _services = [];
          _isLoading = false;
        });
      }
      return;
    }
    try {
      final salon = await context.read<SalonCache>().getSalon(token);
      final services = salon != null
          ? await context.read<ServicesStaffCache>().getServicesForSalon(
              token,
              salon.id,
            )
          : <ServiceItem>[];
      if (mounted) {
        setState(() {
          _salon = salon;
          _services = services;
          _isLoading = false;
          if (_selectedCategory != null &&
              !_services.any((s) => s.categoryName == _selectedCategory)) {
            _selectedCategory = null;
          }
        });
        if (widget.openCreateOnStart && !_didAutoOpenCreate && salon != null) {
          _didAutoOpenCreate = true;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) _openAddTrainingPage();
          });
        }
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _tryOpenEditTrainingFromArguments();
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _salon = null;
          _services = [];
          _isLoading = false;
        });
        showApiError(context, e);
      }
    }
  }

  String _formatDuration(int? minutes) {
    if (minutes == null) return '—';
    return '$minutes min';
  }

  List<String> get _uniqueCategories {
    final set = <String>{};
    for (final s in _services) {
      final c = s.categoryName;
      if (c != null && c.isNotEmpty) set.add(c);
    }
    return set.toList()..sort();
  }

  List<ServiceItem> get _filteredAndSortedServices {
    var list = List<ServiceItem>.from(_services);
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list
          .where((s) => s.displayName.toLowerCase().contains(q))
          .toList();
    }
    if (_selectedCategory != null && _selectedCategory!.isNotEmpty) {
      list = list.where((s) => s.categoryName == _selectedCategory).toList();
    }
    list.sort((a, b) {
      switch (_sort) {
        case ServicesSort.nameAz:
          return a.displayName.compareTo(b.displayName);
        case ServicesSort.nameZa:
          return b.displayName.compareTo(a.displayName);
        case ServicesSort.priceAsc:
          return ((a.price ?? 0) - (b.price ?? 0)).sign.toInt();
        case ServicesSort.priceDesc:
          return ((b.price ?? 0) - (a.price ?? 0)).sign.toInt();
        case ServicesSort.durationAsc:
          return (a.duration ?? 0) - (b.duration ?? 0);
        case ServicesSort.durationDesc:
          return (b.duration ?? 0) - (a.duration ?? 0);
      }
    });
    return list;
  }

  void _showSortMenu() {
    final locale = context.read<LocaleProvider>();
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  locale.t('servicesScreen.sortBy'),
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                ),
              ),
              ...ServicesSort.values.map((value) {
                final labels = {
                  ServicesSort.nameAz: locale.t('servicesScreen.sortNameAsc'),
                  ServicesSort.nameZa: locale.t('servicesScreen.sortNameDesc'),
                  ServicesSort.priceAsc: locale.t(
                    'servicesScreen.sortPriceAsc',
                  ),
                  ServicesSort.priceDesc: locale.t(
                    'servicesScreen.sortPriceDesc',
                  ),
                  ServicesSort.durationAsc: locale.t(
                    'servicesScreen.sortDurationAsc',
                  ),
                  ServicesSort.durationDesc: locale.t(
                    'servicesScreen.sortDurationDesc',
                  ),
                };
                return ListTile(
                  title: Text(labels[value]!),
                  leading: Radio<ServicesSort>(
                    value: value,
                    groupValue: _sort,
                    onChanged: (v) {
                      if (v != null) setState(() => _sort = v);
                      Navigator.pop(ctx);
                    },
                  ),
                  onTap: () {
                    setState(() => _sort = value);
                    Navigator.pop(ctx);
                  },
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _deleteService(ServiceItem item) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Удалить тренировку'),
        content: Text('Удалить тренировку «${item.displayName}»?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Отмена'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Удалить'),
          ),
        ],
      ),
    );
    if (confirm != true || !mounted) return;
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;
    setState(() => _isActionLoading = true);
    try {
      final ok = await ServicesApiService.delete(token, item.id);
      if (!mounted) return;
      if (ok) {
        context.read<ServicesStaffCache>().invalidateServices(_salon?.id);
        await _loadData();
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(
          const SnackBar(
            content: Text('Тренировка удалена'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(
          const SnackBar(
            content: Text('Не удалось удалить тренировку'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) showApiError(context, e);
    } finally {
      if (mounted) setState(() => _isActionLoading = false);
    }
  }

  void _tryOpenEditTrainingFromArguments() {
    if (_didOpenEditFromRouteArgs || !mounted) return;
    final raw = ModalRoute.of(context)?.settings.arguments;
    if (raw is! Map) return;
    final tid = raw['editTrainingId']?.toString();
    if (tid == null || tid.isEmpty) return;
    ServiceItem? match;
    for (final s in _services) {
      if (s.id == tid) {
        match = s;
        break;
      }
    }
    if (match == null) return;
    _didOpenEditFromRouteArgs = true;
    _openEditTrainingPage(match);
  }

  Future<void> _openAddTrainingPage() async {
    final added = await Navigator.of(
      context,
    ).push<bool>(MaterialPageRoute(builder: (_) => const AddTrainingScreen()));
    if (added == true && mounted) {
      await _loadData();
    }
  }

  void _showCategoryInfo() {
    showDialog<void>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.45),
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.backgroundPrimary,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.borderPrimary),
            boxShadow: const [
              BoxShadow(
                color: Color(0x1A000000),
                blurRadius: 16,
                offset: Offset(0, 8),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Информация',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(ctx).pop(),
                      visualDensity: VisualDensity.compact,
                      splashRadius: 18,
                      icon: const Icon(
                        Icons.close,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Если нет категории для вашей услуги, пожалуйста сообщите нам об этом, и мы добавим ее как можно скорее.',
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.4,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: FilledButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary500,
                    ),
                    child: const Text('Понятно'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _trainerLabelForItem(ServiceItem item, LocaleProvider locale) {
    final fromApi = item.trainerLabel.trim();
    if (fromApi.isNotEmpty) return fromApi;
    final owner = context.read<AuthService>().user;
    final ownerName = owner?.name?.trim();
    if (ownerName != null && ownerName.isNotEmpty) return ownerName;
    return locale.t('settings.owner.ownerRole');
  }

  Future<void> _openEditTrainingPage(ServiceItem item) async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;
    final categories = await ServicesApiService.getTrainingCategories(token);
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => _EditTrainingScreen(
          token: token,
          item: item,
          categories: categories,
          onShowCategoryInfo: _showCategoryInfo,
        ),
      ),
    );
    if (changed != true || !mounted) return;
    context.read<ServicesStaffCache>().invalidateServices(_salon?.id);
    await _loadData();
    if (!mounted) return;
    final locale = context.read<LocaleProvider>();
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      SnackBar(
        content: Text(locale.t('common.changesSaved')),
        backgroundColor: Colors.green,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      floatingActionButton: _salon != null && !_isLoading
          ? SafeArea(
              minimum: const EdgeInsets.only(bottom: 8),
              child: FloatingActionButton(
                onPressed: _isActionLoading ? null : _openAddTrainingPage,
                backgroundColor: AppColors.primary500,
                foregroundColor: Colors.white,
                child: const Icon(Icons.add),
              ),
            )
          : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      appBar: buildBrandedSettingsAppBar(
        context,
        title: locale.t('settings.owner.trainings'),
        actions: [
          if (_salon != null)
            IconButton(
              icon: const Icon(Icons.filter_list),
              tooltip: locale.t('servicesScreen.sortAndFiltersTooltip'),
              onPressed: _isLoading ? null : _showSortMenu,
            ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary500),
            )
          : _salon == null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 16, 12, 24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.store_outlined,
                      size: 48,
                      color: AppColors.textTertiary,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      locale.t('common.setupSalonFirst'),
                      style: TextStyle(
                        fontSize: 16,
                        color: AppColors.textSecondary,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    FilledButton.icon(
                      onPressed: _isLoading ? null : _loadData,
                      icon: const Icon(Icons.refresh, size: 20),
                      label: Text(locale.t('common.retry')),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primary500,
                      ),
                    ),
                  ],
                ),
              ),
            )
          : RefreshIndicator(
              onRefresh: _loadData,
              color: AppColors.primary500,
              child: CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 16, 12, 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            locale.t('servicesScreen.category'),
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            padding: const EdgeInsets.only(bottom: 4),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: FilterChip(
                                    label: Text(
                                      locale.t('servicesScreen.allCategories'),
                                    ),
                                    selected: _selectedCategory == null,
                                    onSelected: (_) => setState(
                                      () => _selectedCategory = null,
                                    ),
                                    selectedColor: AppColors.primary100,
                                    checkmarkColor: AppColors.primary500,
                                  ),
                                ),
                                ..._uniqueCategories.map(
                                  (c) => Padding(
                                    padding: const EdgeInsets.only(right: 8),
                                    child: FilterChip(
                                      label: Text(c),
                                      selected: _selectedCategory == c,
                                      onSelected: (_) =>
                                          setState(() => _selectedCategory = c),
                                      selectedColor: AppColors.primary100,
                                      checkmarkColor: AppColors.primary500,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 14),
                          TextField(
                            controller: _searchController,
                            decoration: InputDecoration(
                              hintText: locale.t('servicesScreen.searchByName'),
                              prefixIcon: const AppSearchPrefixIcon(),
                              prefixIconConstraints:
                                  AppSearchPrefixIcon.prefixConstraints(),
                              isDense: true,
                              filled: true,
                              fillColor: AppColors.backgroundPrimary,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(
                                  color: AppColors.borderPrimary,
                                ),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(
                                  color: AppColors.borderPrimary,
                                ),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(
                                  color: AppColors.primary500,
                                  width: 1.5,
                                ),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 12,
                              ),
                              suffixIcon: _searchQuery.isNotEmpty
                                  ? IconButton(
                                      icon: const Icon(
                                        Icons.close,
                                        size: 20,
                                        color: AppColors.textSecondary,
                                      ),
                                      onPressed: () {
                                        _searchController.clear();
                                        setState(() => _searchQuery = '');
                                      },
                                      tooltip: locale.t('common.clear'),
                                    )
                                  : null,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (_filteredAndSortedServices.isEmpty)
                    SliverFillRemaining(
                      hasScrollBody: false,
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.spa_outlined,
                              size: 64,
                              color: AppColors.textSecondary,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              _services.isEmpty
                                  ? locale.t('servicesScreen.emptyTitle')
                                  : locale.t('common.nothingFound'),
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _services.isEmpty
                                  ? locale.t('servicesScreen.emptySubtitle')
                                  : locale.t('servicesScreen.changeFilters'),
                              style: TextStyle(
                                fontSize: 14,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(
                        kScreenPaddingHorizontal,
                        0,
                        kScreenPaddingHorizontal,
                        96,
                      ),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate((context, index) {
                          final item = _filteredAndSortedServices[index];
                          return GestureDetector(
                            onLongPress: _isActionLoading
                                ? null
                                : () => _deleteService(item),
                            child: OwnerTrainingCatalogCard(
                              item: item,
                              durationLabel: _formatDuration(item.duration),
                              priceLabel: formatVnd(item.price),
                              trainerLabel: _trainerLabelForItem(item, locale),
                              onTap: _isActionLoading
                                  ? () {}
                                  : () => _openEditTrainingPage(item),
                            ),
                          );
                        }, childCount: _filteredAndSortedServices.length),
                      ),
                    ),
                ],
              ),
            ),
    );
  }
}

class _EditTrainingScreen extends StatefulWidget {
  const _EditTrainingScreen({
    required this.token,
    required this.item,
    required this.categories,
    required this.onShowCategoryInfo,
  });

  final String token;
  final ServiceItem item;
  final List<TrainingCategoryOption> categories;
  final VoidCallback onShowCategoryInfo;

  @override
  State<_EditTrainingScreen> createState() => _EditTrainingScreenState();
}

class _EditTrainingScreenState extends State<_EditTrainingScreen> {
  late final TextEditingController _nameController;
  late final TextEditingController _durationController;
  late final TextEditingController _priceController;
  int? _selectedCategoryId;
  bool _saving = false;
  bool _applyScheduleChanges = false;
  bool _applyFromToday = true;
  late DateTime _effectiveFromDate;
  late TimeOfDay _defaultSlotTime;
  final Set<int> _recurringDays = <int>{1, 3, 5};
  final Map<int, TimeOfDay> _recurringDayTimes = <int, TimeOfDay>{};

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

  InputDecoration _fieldDecoration({String? hintText}) {
    return InputDecoration(
      hintText: hintText,
      filled: true,
      fillColor: AppColors.backgroundPrimary,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.borderPrimary),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    );
  }

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.item.name);
    _durationController = TextEditingController(
      text: (widget.item.duration ?? 30).toString(),
    );
    _priceController = TextEditingController(
      text: _formatThousandsDots((widget.item.price ?? 0).round()),
    );
    final now = DateTime.now();
    _effectiveFromDate = DateTime(now.year, now.month, now.day);
    _defaultSlotTime = TimeOfDay.fromDateTime(now);
    for (final day in _recurringDays) {
      _recurringDayTimes[day] = _defaultSlotTime;
    }
    _selectedCategoryId = widget.item.trainingCategoryId;
    if (_selectedCategoryId != null &&
        !widget.categories.any((c) => c.id == _selectedCategoryId)) {
      _selectedCategoryId = null;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _durationController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final locale = context.read<LocaleProvider>();
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(content: Text('Введите название тренировки')),
      );
      return;
    }
    final price =
        double.tryParse(
          _priceController.text.trim().replaceAll('.', '').replaceAll(',', '.'),
        ) ??
        0.0;
    final duration = int.tryParse(_durationController.text.trim()) ?? 0;
    if (price <= 0 || duration <= 0) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(content: Text('Цена и длительность должны быть > 0')),
      );
      return;
    }

    final recurringDays = _recurringDays.toList()..sort();
    if (_applyScheduleChanges && recurringDays.isEmpty) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(content: Text('Выберите хотя бы один день')),
      );
      return;
    }
    final slots = recurringDays
        .map(
          (d) => {
            'day': d,
            'startTime':
                '${_recurringDayTimes[d]?.hour.toString().padLeft(2, '0') ?? _defaultSlotTime.hour.toString().padLeft(2, '0')}:${_recurringDayTimes[d]?.minute.toString().padLeft(2, '0') ?? _defaultSlotTime.minute.toString().padLeft(2, '0')}',
          },
        )
        .toList();

    setState(() => _saving = true);
    try {
      final updated = await ServicesApiService.update(
        widget.token,
        widget.item.id,
        name: name,
        price: price,
        duration: duration,
        trainingCategoryId: _selectedCategoryId,
      );
      if (!mounted) return;
      if (updated != null) {
        if (_applyScheduleChanges) {
          final scheduleRes = await ServicesApiService.updateTrainingSchedule(
            widget.token,
            widget.item.id,
            slots: slots,
            effectiveFrom: _applyFromToday ? DateTime.now() : _effectiveFromDate,
          );
          if (scheduleRes == null && mounted) {
            ScaffoldMessenger.maybeOf(context)?.showSnackBar(
              const SnackBar(
                content: Text('Не удалось обновить расписание тренировок'),
              ),
            );
            return;
          }
          final scheduleData = scheduleRes ?? const <String, dynamic>{};
          final updatedCount =
              (scheduleData['updatedCount'] as num?)?.toInt() ?? 0;
          final createdCount =
              (scheduleData['createdCount'] as num?)?.toInt() ?? 0;
          final removedCount =
              (scheduleData['removedCount'] as num?)?.toInt() ?? 0;
          final skippedBooked =
              (scheduleData['skippedBookedCount'] as num?)?.toInt() ?? 0;
          final conflicts =
              (scheduleData['skippedConflicts'] as num?)?.toInt() ?? 0;
          final summary = 'Расписание: обновлено $updatedCount, добавлено $createdCount, '
              'удалено $removedCount, пропущено занятых $skippedBooked, конфликтов $conflicts';
          ScaffoldMessenger.maybeOf(context)?.showSnackBar(
            SnackBar(content: Text(summary)),
          );
        }
        Navigator.of(context).pop(true);
        return;
      }
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(
          content: Text(locale.t('common.saveFailed')),
          backgroundColor: Colors.red,
        ),
      );
    } catch (e) {
      if (mounted) showApiError(context, e);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundPrimary,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          color: AppColors.textPrimary,
          onPressed: () => Navigator.of(context).pop(),
        ),
        centerTitle: true,
        title: const Text(
          'Редактировать тренировку',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(12, 16, 12, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Название тренировки',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _nameController,
              decoration: _fieldDecoration(hintText: 'Например: Vinyasa Flow'),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Text(
                  'Категория',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(width: 6),
                InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: widget.onShowCategoryInfo,
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
            DropdownButtonFormField<int>(
              isExpanded: true,
              isDense: true,
              value: _selectedCategoryId,
              dropdownColor: AppColors.backgroundPrimary,
              borderRadius: BorderRadius.circular(12),
              menuMaxHeight: 320,
              icon: const Icon(
                Icons.keyboard_arrow_down_rounded,
                color: AppColors.textSecondary,
              ),
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
              ),
              hint: const Text(
                'Выберите категорию',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
              items: widget.categories
                  .map(
                    (TrainingCategoryOption c) => DropdownMenuItem<int>(
                      value: c.id,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Text(
                          c.label(locale.localeCode),
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                        ),
                      ),
                    ),
                  )
                  .toList(),
              onChanged: widget.categories.isEmpty
                  ? null
                  : (v) => setState(() => _selectedCategoryId = v),
              decoration: _fieldDecoration(),
            ),
            const SizedBox(height: 16),
            Text(
              'Длительность (мин)',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _durationController,
              keyboardType: TextInputType.number,
              decoration: _fieldDecoration(),
            ),
            const SizedBox(height: 16),
            Text(
              'Цена',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _priceController,
              keyboardType: TextInputType.number,
              decoration: _fieldDecoration(),
            ),
            const SizedBox(height: 16),
            SwitchListTile(
              value: _applyScheduleChanges,
              onChanged: (v) => setState(() => _applyScheduleChanges = v),
              title: const Text(
                'Изменить дни и время для всех будущих тренировок',
              ),
              contentPadding: EdgeInsets.zero,
            ),
            if (_applyScheduleChanges) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: List.generate(7, (i) {
                  final day = i + 1;
                  const labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
                  final selected = _recurringDays.contains(day);
                  return FilterChip(
                    label: Text(labels[i]),
                    selected: selected,
                    onSelected: (on) {
                      setState(() {
                        if (on) {
                          _recurringDays.add(day);
                          _recurringDayTimes[day] =
                              _recurringDayTimes[day] ?? _defaultSlotTime;
                        } else {
                          _recurringDays.remove(day);
                          _recurringDayTimes.remove(day);
                        }
                      });
                    },
                    selectedColor: AppColors.primary100,
                    checkmarkColor: AppColors.primary500,
                  );
                }),
              ),
              const SizedBox(height: 10),
              ...(_recurringDays.toList()..sort()).map((day) {
                const labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
                final time = _recurringDayTimes[day] ?? _defaultSlotTime;
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('Время (${labels[day - 1]})'),
                  subtitle: Text(time.format(context)),
                  trailing: const Icon(Icons.schedule),
                  onTap: () async {
                    final picked = await showTimePicker(
                      context: context,
                      initialTime: time,
                    );
                    if (picked == null || !mounted) return;
                    setState(() => _recurringDayTimes[day] = picked);
                  },
                );
              }),
              const SizedBox(height: 8),
              SwitchListTile(
                value: _applyFromToday,
                onChanged: (v) => setState(() => _applyFromToday = v),
                title: const Text('Применить с сегодняшнего дня'),
                contentPadding: EdgeInsets.zero,
              ),
              if (!_applyFromToday)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Дата начала изменений'),
                  subtitle: Text(
                    MaterialLocalizations.of(
                      context,
                    ).formatFullDate(_effectiveFromDate),
                  ),
                  trailing: const Icon(Icons.calendar_today_outlined),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _effectiveFromDate,
                      firstDate: DateTime.now().subtract(
                        const Duration(days: 365),
                      ),
                      lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
                    );
                    if (picked == null || !mounted) return;
                    setState(() => _effectiveFromDate = picked);
                  },
                ),
            ],
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: FilledButton(
                onPressed: _saving ? null : _submit,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary500,
                ),
                child: _saving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            Colors.white,
                          ),
                        ),
                      )
                    : Text(locale.t('common.update')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

