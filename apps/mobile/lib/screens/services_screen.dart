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
    this.trainingMode = false,
  });

  final bool openCreateOnStart;
  final bool trainingMode;

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
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
          color: AppColors.textPrimary,
        ),
        title: const Text(
          'Тренировки',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
        backgroundColor: AppColors.backgroundPrimary,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
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
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 96),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate((context, index) {
                          final item = _filteredAndSortedServices[index];
                          return _ServiceCard(
                            item: item,
                            formatPrice: formatVnd,
                            formatDuration: _formatDuration,
                            isActionLoading: _isActionLoading,
                            onEdit: () => _openEditTrainingPage(item),
                            onDelete: () => _deleteService(item),
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
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
      ),
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
            fontSize: 24,
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

class _ServiceCard extends StatelessWidget {
  const _ServiceCard({
    required this.item,
    required this.formatPrice,
    required this.formatDuration,
    required this.isActionLoading,
    required this.onEdit,
    required this.onDelete,
  });

  final ServiceItem item;
  final String Function(double?) formatPrice;
  final String Function(int?) formatDuration;
  final bool isActionLoading;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderPrimary),
        boxShadow: const [
          BoxShadow(
            color: Color(0x10000000),
            blurRadius: 10,
            offset: Offset(0, 3),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              width: 4,
              decoration: const BoxDecoration(color: AppColors.primary500),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 14, 8, 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.displayName,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        height: 1.25,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    if (item.tagNames.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: item.tagNames.map((tag) {
                          return Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.primary50,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppColors.primary200),
                            ),
                            child: Text(
                              tag,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary700,
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Text(
                          formatDuration(item.duration),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const Spacer(),
                        Text(
                          formatPrice(item.price),
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.2,
                            color: AppColors.primary600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(right: 4, top: 4),
              child: Opacity(
                opacity: isActionLoading ? 0.45 : 1,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.edit_outlined, size: 22),
                      onPressed: isActionLoading ? null : onEdit,
                      color: AppColors.primary500,
                      visualDensity: VisualDensity.compact,
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, size: 22),
                      onPressed: isActionLoading ? null : onDelete,
                      color: AppColors.error600,
                      visualDensity: VisualDensity.compact,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
