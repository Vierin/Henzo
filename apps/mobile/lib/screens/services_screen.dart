import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../widgets/common/henzo_modal.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../models/studio.dart';
import '../../models/training_category_option.dart';
import '../../models/training_location_item.dart';
import '../../utils/currency_format.dart';
import '../../models/service_item.dart';
import '../../services/auth_service.dart';
import '../../services/cache/owner_sessions_cache.dart';
import '../../services/cache/studio_cache.dart';
import '../../services/cache/services_staff_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../services/services_api_service.dart';
import '../../utils/show_api_error.dart';
import '../../utils/training_locations_storage.dart';
import '../../constants/layout.dart';
import '../../widgets/app_search_prefix_icon.dart';
import '../../widgets/address_picker_modal.dart';
import '../../widgets/common/henzo_header_back_button.dart';
import '../../widgets/settings/branded_settings_app_bar.dart';
import '../../widgets/training/owner_training_catalog_card.dart';
import '../../widgets/training/training_category_picker_sheet.dart';
import '../../widgets/training/training_filter_chip.dart';
import '../../widgets/training/training_location_picker_sheet.dart';
import '../../widgets/training/training_time_picker_sheet.dart';
import 'add_training_screen.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

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
  Studio? _studio;
  List<ServiceItem> _services = [];
  bool _isLoading = true;
  bool _isActionLoading = false;
  bool _didAutoOpenCreate = false;
  bool _didOpenEditFromRouteArgs = false;
  final ServicesSort _sort = ServicesSort.nameAz;

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
          _studio = null;
          _services = [];
          _isLoading = false;
        });
      }
      return;
    }
    try {
      final studioCache = context.read<StudioCache>();
      final servicesCache = context.read<ServicesStaffCache>();
      final studio = await studioCache.getStudio(token);
      final services = studio != null
          ? await servicesCache.getServicesForStudio(
              token,
              studio.id,
            )
          : <ServiceItem>[];
      if (mounted) {
        setState(() {
          _studio = studio;
          _services = services;
          _isLoading = false;
          if (_selectedCategory != null &&
              !_services.any((s) => s.categoryName == _selectedCategory)) {
            _selectedCategory = null;
          }
        });
        if (widget.openCreateOnStart && !_didAutoOpenCreate && studio != null) {
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
          _studio = null;
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

  Future<void> _deleteService(ServiceItem item) async {
    final confirm = await showHenzoDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(context.read<LocaleProvider>().t('servicesScreen.deleteTrainingTitle')),
        content: Text(context.read<LocaleProvider>().t('servicesScreen.deleteTrainingConfirm').replaceAll('{name}', item.displayName)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(context.read<LocaleProvider>().t('common.cancel')),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text(context.read<LocaleProvider>().t('common.delete')),
          ),
        ],
      ),
    );
    if (confirm != true || !mounted) return;
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;
    setState(() => _isActionLoading = true);
    final messenger = ScaffoldMessenger.maybeOf(context);
    final sessionsCache = context.read<OwnerSessionsCache>();
    final servicesCache = context.read<ServicesStaffCache>();
    final locale = context.read<LocaleProvider>();
    try {
      final ok = await ServicesApiService.delete(token, item.id);
      if (!mounted) return;
      if (ok) {
        sessionsCache.invalidate();
        servicesCache.invalidateServices(_studio?.id);
        final deletedMsg = locale.t('servicesScreen.trainingDeleted');
        await _loadData();
        if (!mounted) return;
        messenger?.showSnackBar(
          SnackBar(
            content: Text(deletedMsg),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        messenger?.showSnackBar(
          SnackBar(
            content: Text(locale.t('servicesScreen.deleteFailed')),
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
    showHenzoDialog<void>(
      context: context,
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
                    Expanded(
                      child: Text(
                        context.read<LocaleProvider>().t('common.info'),
                        style: TextStyle(
                          fontSize: 18.sp,
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
                Text(
                  context.read<LocaleProvider>().t('servicesScreen.categoryRequestMessage'),
                  style: TextStyle(
                    fontSize: 14.sp,
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
                    child: Text(context.read<LocaleProvider>().t('common.understood')),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _locationLabelForCatalog() {
    final studio = _studio;
    if (studio == null) return '';
    final studioName = studio.name?.trim() ?? 'Studio';
    final locations = TrainingLocationItem.listFromStudio(
      studio,
      mainStudioName: studioName,
    );
    if (locations.isNotEmpty) {
      final defaultLoc = locations.firstWhere(
        (l) => l.isDefault,
        orElse: () => locations.first,
      );
      final name = defaultLoc.name.trim();
      if (name.isNotEmpty) return name;
    }
    return studioName;
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
    if (!mounted) return;
    final changed = await Navigator.of(context).push<ServiceItem?>(
      MaterialPageRoute(
        builder: (_) => EditTrainingScreen(
          token: token,
          item: item,
          studio: _studio,
          categories: categories,
          onShowCategoryInfo: _showCategoryInfo,
        ),
      ),
    );
    if (changed == null || !mounted) return;
    context.read<OwnerSessionsCache>().invalidate();
    context.read<ServicesStaffCache>().invalidateServices(_studio?.id);
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
      floatingActionButton: _studio != null && !_isLoading
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
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary500),
            )
          : _studio == null
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
                        fontSize: 16.sp,
                        color: AppColors.textSecondary,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    FilledButton.icon(
                      onPressed: _isLoading ? null : _loadData,
                      icon: Icon(Icons.refresh, size: 20),
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
                              fontSize: 12.sp,
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
                                  child: TrainingFilterChip(
                                    label: locale.t(
                                      'servicesScreen.allCategories',
                                    ),
                                    selected: _selectedCategory == null,
                                    onSelected: (_) => setState(
                                      () => _selectedCategory = null,
                                    ),
                                  ),
                                ),
                                ..._uniqueCategories.map(
                                  (c) => Padding(
                                    padding: const EdgeInsets.only(right: 8),
                                    child: TrainingFilterChip(
                                      label: c,
                                      selected: _selectedCategory == c,
                                      onSelected: (on) {
                                        if (!on) return;
                                        setState(() => _selectedCategory = c);
                                      },
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
                                fontSize: 18.sp,
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
                                fontSize: 14.sp,
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
                              addressLabel: _locationLabelForCatalog(),
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

String _editServiceThousandsFormat(int value) {
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

class _EditTemplateVndThousandsFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = newValue.text.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.isEmpty) return const TextEditingValue(text: '');
    final number = int.tryParse(digits);
    if (number == null) return oldValue;
    final formatted = _editServiceThousandsFormat(number);
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}

class EditTrainingScreen extends StatefulWidget {
  const EditTrainingScreen({super.key, 
    required this.token,
    required this.item,
    required this.studio,
    required this.categories,
    required this.onShowCategoryInfo,
    this.scheduleEffectiveFrom,
    this.title,
  });

  final String token;
  final ServiceItem item;
  final Studio? studio;
  final List<TrainingCategoryOption> categories;
  final VoidCallback onShowCategoryInfo;

  /// Anchor date for schedule changes (from session detail flow).
  final DateTime? scheduleEffectiveFrom;
  final String? title;

  @override
  State<EditTrainingScreen> createState() => EditTrainingScreenState();
}

class EditTrainingScreenState extends State<EditTrainingScreen> {
  static const Color _kFormAccent = Color(0xFF6C5CE7);
  static const Color _kHintMuted = Color(0x993F3F3F);
  static final TextStyle _kFieldInputStyle = TextStyle(
    fontSize: 16.sp,
    color: AppColors.textPrimary,
  );

  static const double _kStep2FieldRadius = 12;

  late final TextEditingController _nameController;
  late final TextEditingController _durationController;
  late final TextEditingController _priceController;
  late final TextEditingController _capacityController;
  late final TextEditingController _descriptionController;
  final FocusNode _durationFocusNode = FocusNode();
  int? _selectedCategoryId;
  String _selectedLanguage = 'en';
  bool _saving = false;
  bool _applyScheduleChanges = false;
  bool _applyFromToday = true;
  late DateTime _effectiveFromDate;
  late TimeOfDay _sessionTime;
  Studio? _studio;
  List<TrainingLocationItem> _locations = [];
  String _selectedLocationId = 'default';
  int? _initialCapacity;
  String? _initialLocationId;
  final Set<int> _recurringDays = <int>{1, 3, 5};
  final Map<int, TimeOfDay> _recurringDayTimes = <int, TimeOfDay>{};

  String _formatThousandsDots(int value) {
    return _editServiceThousandsFormat(value);
  }

  InputDecoration _editRegInputDecoration({
    bool invalid = false,
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
        color: _kHintMuted,
        fontSize: 16.sp,
        fontWeight: FontWeight.w500,
      ),
      prefixIcon: prefixIcon == null
          ? null
          : Padding(
              padding: const EdgeInsets.only(left: 13, right: 8),
              child: Icon(prefixIcon, color: _kFormAccent, size: 22),
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

  Widget _editFormLabel(String text, {Widget? trailing}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10, left: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Text(
              text.toUpperCase(),
              style: TextStyle(
                fontSize: 13.sp,
                fontWeight: FontWeight.w600,
                letterSpacing: -0.3,
                color: AppColors.textPrimary,
              ),
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }

  Widget _editDurationMinutesField(LocaleProvider loc) {
    const radius = BorderRadius.all(Radius.circular(12));
    final focused = _durationFocusNode.hasFocus;
    const noneSide = BorderSide.none;
    const focusSide = BorderSide(
      color: AppColors.primary500,
      width: 1.2,
    );
    final side = focused ? focusSide : noneSide;
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
              color: _kFormAccent,
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
                  style: _kFieldInputStyle,
                  keyboardType: TextInputType.number,
                  textInputAction: TextInputAction.next,
                  decoration: InputDecoration(
                    hintText: '60',
                    hintStyle: TextStyle(
                      color: _kHintMuted,
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

  void _onDurationFocusChanged() => setState(() {});

  TrainingLocationItem? get _selectedLocation {
    for (final loc in _locations) {
      if (loc.id == _selectedLocationId) return loc;
    }
    return _locations.isNotEmpty ? _locations.first : null;
  }

  void _applyLocationsFromStudio(Studio? studio, LocaleProvider locale) {
    _studio = studio;
    _locations = TrainingLocationItem.listFromStudio(
      studio,
      mainStudioName: locale.t('locations.mainStudio'),
    );
    if (_locations.isEmpty) return;
    final stillValid = _locations.any((l) => l.id == _selectedLocationId);
    if (!stillValid) {
      _selectedLocationId = _locations.first.id;
    }
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
                    ? const Icon(Icons.check_rounded, color: AppColors.primary500)
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

  String _categoryLabel(LocaleProvider locale) {
    final id = _selectedCategoryId;
    if (id == null) return locale.t('addTraining.pickCategory');
    for (final c in widget.categories) {
      if (c.id == id) return c.label(locale.localeCode);
    }
    return locale.t('addTraining.pickCategory');
  }

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

  Future<void> _openCategoryBottomSheet() async {
    final loc = context.read<LocaleProvider>();
    final result = await showTrainingCategoryPickerSheet(
      context: context,
      locale: loc,
      categories: widget.categories,
      selectedCategoryId: _selectedCategoryId,
    );
    if (!mounted || result == null || !result.applied) return;
    setState(() => _selectedCategoryId = result.categoryId);
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
        _applyLocationsFromStudio(_studio, locale);
        _selectedLocationId = newLoc.id;
      });
    } catch (e) {
      if (mounted) showApiError(context, e);
    }
  }

  Future<void> _loadSessionDefaults() async {
    final locale = context.read<LocaleProvider>();
    var studio = widget.studio;
    studio ??= await context.read<StudioCache>().getStudio(widget.token);
    if (!mounted) return;
    _applyLocationsFromStudio(studio, locale);

    final now = DateTime.now();
    final sessions = await DashboardApiService.getOwnerTrainingSessions(
      widget.token,
      fromIso: now.toUtc().toIso8601String(),
    );
    if (!mounted) return;
    final mine = sessions
        .where((s) => s.trainingId == widget.item.id)
        .toList()
      ..sort((a, b) => a.startsAt.compareTo(b.startsAt));

    if (mine.isNotEmpty) {
      final first = mine.first;
      _capacityController.text = '${first.capacity}';
      _initialCapacity = first.capacity;
      final locId = first.locationId?.trim();
      if (locId != null && locId.isNotEmpty) {
        _selectedLocationId = locId;
        _initialLocationId = locId;
      }
      final days = <int>{};
      final times = <int, TimeOfDay>{};
      for (final s in mine) {
        final wd = s.startsAt.weekday;
        days.add(wd);
        times.putIfAbsent(wd, () => TimeOfDay.fromDateTime(s.startsAt));
      }
      if (days.isNotEmpty) {
        _recurringDays
          ..clear()
          ..addAll(days);
        _recurringDayTimes
          ..clear()
          ..addAll(times);
        _sessionTime = times.values.first;
      }
    }
    if (mounted) setState(() {});
  }

  @override
  void initState() {
    super.initState();
    _durationFocusNode.addListener(_onDurationFocusChanged);
    _nameController = TextEditingController(text: widget.item.name);
    _durationController = TextEditingController(
      text: (widget.item.duration ?? 30).toString(),
    );
    _priceController = TextEditingController(
      text: _formatThousandsDots((widget.item.price ?? 0).round()),
    );
    _capacityController = TextEditingController(text: '10');
    _descriptionController = TextEditingController(
      text: widget.item.description ?? '',
    );
    _selectedLanguage = widget.item.language ?? 'en';
    final now = DateTime.now();
    final anchor = widget.scheduleEffectiveFrom;
    if (anchor != null) {
      final local = anchor.toLocal();
      _effectiveFromDate = DateTime(local.year, local.month, local.day);
      _applyFromToday = true;
      _sessionTime = TimeOfDay.fromDateTime(local);
    } else {
      _effectiveFromDate = DateTime(now.year, now.month, now.day);
      _sessionTime = TimeOfDay.fromDateTime(now);
    }
    for (final day in _recurringDays) {
      _recurringDayTimes[day] = _sessionTime;
    }
    _selectedCategoryId = widget.item.trainingCategoryId;
    if (_selectedCategoryId != null &&
        !widget.categories.any((c) => c.id == _selectedCategoryId)) {
      _selectedCategoryId = null;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadSessionDefaults());
  }

  @override
  void dispose() {
    _durationFocusNode.removeListener(_onDurationFocusChanged);
    _durationFocusNode.dispose();
    _nameController.dispose();
    _durationController.dispose();
    _priceController.dispose();
    _capacityController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final locale = context.read<LocaleProvider>();
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(content: Text(context.read<LocaleProvider>().t('addTraining.enterName'))),
      );
      return;
    }
    final price =
        double.tryParse(
          _priceController.text.trim().replaceAll('.', '').replaceAll(',', '.'),
        ) ??
        0.0;
    final duration = int.tryParse(_durationController.text.trim()) ?? 0;
    final capacity = int.tryParse(_capacityController.text.trim()) ?? 0;
    if (price <= 0 || duration <= 0 || capacity <= 0) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(
          content: Text(
            context.read<LocaleProvider>().t('addTraining.invalidValues'),
          ),
        ),
      );
      return;
    }

    final recurringDays = _recurringDays.toList()..sort();
    if (_applyScheduleChanges && recurringDays.isEmpty) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(content: Text(context.read<LocaleProvider>().t('addTraining.selectDays'))),
      );
      return;
    }
    final slots = recurringDays
        .map(
          (d) => {
            'day': d,
            'startTime': trainingTimeToHm(
              _recurringDayTimes[d] ?? _sessionTime,
            ),
          },
        )
        .toList();
    final locationId = _selectedLocationId.trim();
    final capacityChanged = _initialCapacity != capacity;
    final locationChanged = _initialLocationId != locationId;

    setState(() => _saving = true);
    try {
      final updated = await ServicesApiService.update(
        widget.token,
        widget.item.id,
        name: name,
        price: price,
        duration: duration,
        trainingCategoryId: _selectedCategoryId,
        description: _descriptionController.text.trim(),
        language: _selectedLanguage,
      );
      if (!mounted) return;
      if (updated != null) {
        if (_applyScheduleChanges) {
          final effectiveFrom = _applyFromToday
              ? DateTime.now()
              : DateTime(
                  _effectiveFromDate.year,
                  _effectiveFromDate.month,
                  _effectiveFromDate.day,
                );
          final scheduleRes = await ServicesApiService.updateTrainingSchedule(
            widget.token,
            widget.item.id,
            slots: slots,
            effectiveFrom: effectiveFrom,
            capacity: capacity,
            locationId: locationId,
          );
          if (scheduleRes == null && mounted) {
            ScaffoldMessenger.maybeOf(context)?.showSnackBar(
              SnackBar(
                content: Text(context.read<LocaleProvider>().t('servicesScreen.scheduleUpdateFailed')),
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
          final loc = context.read<LocaleProvider>();
          final summary = loc.t('servicesScreen.scheduleUpdateResult')
              .replaceAll('{created}', '$createdCount')
              .replaceAll('{skipped}', '${skippedBooked + conflicts + removedCount}');
          if (!mounted) return;
          ScaffoldMessenger.maybeOf(context)?.showSnackBar(
            SnackBar(content: Text(summary)),
          );
        } else if (capacityChanged || locationChanged) {
          final ok = await ServicesApiService.updateTrainingSessionDefaults(
            widget.token,
            widget.item.id,
            capacity: capacityChanged ? capacity : null,
            locationId: locationChanged ? locationId : null,
          );
          if (!ok && mounted) {
            ScaffoldMessenger.maybeOf(context)?.showSnackBar(
              SnackBar(
                content: Text(context.read<LocaleProvider>().t('servicesScreen.updateDefaultsFailed')),
              ),
            );
            return;
          }
        }
        if (!mounted) return;
        context.read<OwnerSessionsCache>().invalidate();
        if (mounted) Navigator.of(context).pop(updated);
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
    final textTheme = Theme.of(context).textTheme;
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundSecondary,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: HenzoHeaderBackButton(
          onPressed: () => Navigator.of(context).pop(),
        ),
        leadingWidth: 56,
        centerTitle: true,
        title: Text(
          widget.title ?? context.read<LocaleProvider>().t('servicesScreen.editTraining'),
          style: TextStyle(
            fontSize: 14.sp,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(
          kScreenPaddingHorizontal,
          10,
          kScreenPaddingHorizontal,
          24,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _editFormLabel(locale.t('addTraining.trainingName')),
            TextField(
              controller: _nameController,
              style: _kFieldInputStyle,
              textInputAction: TextInputAction.next,
              decoration: _editRegInputDecoration(
                hintText: locale.t('addTraining.nameExample'),
              ),
            ),
            const SizedBox(height: 22),
            _editFormLabel(
              locale.t('addTraining.category'),
              trailing: InkWell(
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
            ),
            InkWell(
              borderRadius: BorderRadius.circular(999),
              onTap: widget.categories.isEmpty ? null : _openCategoryBottomSheet,
              child: InputDecorator(
                decoration: _editRegInputDecoration(
                  suffix: const Icon(
                    CupertinoIcons.chevron_down,
                    color: _kFormAccent,
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
            const SizedBox(height: 22),
            Consumer<LocaleProvider>(
              builder: (context, loc, _) {
                final selected = _selectedLocation;
                final displayName = selected?.name.trim().isNotEmpty == true
                    ? selected!.name
                    : loc.t('addTraining.studioNameFallback');
                final address = selected?.address.trim() ?? '';
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _editFormLabel(loc.t('addTraining.addressSectionLabel')),
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
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      displayName,
                                      style: TextStyle(
                                        fontSize: 19.sp,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                    if (address.isNotEmpty) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        address,
                                        style: TextStyle(
                                          fontSize: 14.sp,
                                          height: 1.35,
                                          color: AppColors.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              const Padding(
                                padding: EdgeInsets.only(top: 4),
                                child: Icon(
                                  CupertinoIcons.chevron_forward,
                                  color: _kFormAccent,
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
                      _editFormLabel(locale.t('addTraining.duration')),
                      _editDurationMinutesField(locale),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _editFormLabel(locale.t('addTraining.capacity')),
                      TextField(
                        controller: _capacityController,
                        style: _kFieldInputStyle,
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.next,
                        decoration: _editRegInputDecoration(
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
                      _editFormLabel(locale.t('addTraining.price')),
                      TextField(
                        controller: _priceController,
                        style: _kFieldInputStyle,
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.next,
                        inputFormatters: [_EditTemplateVndThousandsFormatter()],
                        decoration: _editRegInputDecoration(
                          hintText: locale.t('addTraining.enterPrice'),
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
                      _editFormLabel(locale.t('addTraining.language')),
                      InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: _openLanguagePicker,
                        child: InputDecorator(
                          decoration: _editRegInputDecoration(
                            suffix: const Icon(
                              CupertinoIcons.chevron_down,
                              color: _kFormAccent,
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
            _editFormLabel(locale.t('addTraining.description')),
            TextField(
              controller: _descriptionController,
              style: _kFieldInputStyle,
              keyboardType: TextInputType.multiline,
              textInputAction: TextInputAction.newline,
              minLines: 3,
              maxLines: 5,
              decoration: _editRegInputDecoration(
                hintText: locale.t('addTraining.descriptionOptional'),
              ),
            ),
            const SizedBox(height: 22),
            SwitchListTile(
              value: _applyScheduleChanges,
              onChanged: (v) => setState(() => _applyScheduleChanges = v),
              title: Text(locale.t('servicesScreen.editAllFuture')),
              contentPadding: EdgeInsets.zero,
            ),
            if (_applyScheduleChanges) ...[
              const SizedBox(height: 12),
              _editFormLabel(locale.t('addTraining.step2.repeatOn')),
              const SizedBox(height: 10),
              Row(
                children: List.generate(7, (i) {
                  final day = i + 1;
                  return Expanded(
                    child: Padding(
                      padding: EdgeInsets.only(left: i == 0 ? 0 : 4),
                      child: _step2WeekdayChip(locale, day),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 20),
              _editFormLabel(locale.t('addTraining.step2.schedule')),
              const SizedBox(height: 6),
              Text(
                locale.t('addTraining.step2.scheduleHint'),
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
                              _fullWeekday(day, locale),
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
                                  setState(
                                    () => _recurringDayTimes[day] = picked,
                                  );
                                }
                              },
                              borderRadius: BorderRadius.circular(10),
                              child: InputDecorator(
                                decoration: _step2FieldDecoration(
                                  suffixIcon: const Icon(
                                    CupertinoIcons.chevron_down,
                                    color: _kFormAccent,
                                    size: 18,
                                  ),
                                ),
                                child: Text(
                                  trainingTimeToHm(time),
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
                            tooltip: locale.t('common.delete'),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
              const SizedBox(height: 12),
              SwitchListTile(
                value: _applyFromToday,
                onChanged: (v) => setState(() => _applyFromToday = v),
                title: Text(locale.t('servicesScreen.applyFromToday')),
                contentPadding: EdgeInsets.zero,
              ),
              if (!_applyFromToday) ...[
                const SizedBox(height: 8),
                _editFormLabel(locale.t('servicesScreen.changeStartDate')),
                const SizedBox(height: 6),
                InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _effectiveFromDate,
                      firstDate: DateTime.now().subtract(
                        const Duration(days: 365),
                      ),
                      lastDate: DateTime.now().add(
                        const Duration(days: 365 * 2),
                      ),
                    );
                    if (picked == null || !mounted) return;
                    setState(() => _effectiveFromDate = picked);
                  },
                  borderRadius: BorderRadius.circular(_kStep2FieldRadius),
                  child: InputDecorator(
                    decoration: _step2FieldDecoration(
                      suffixIcon: const Icon(
                        Icons.calendar_today_outlined,
                        size: 18,
                        color: AppColors.textTertiary,
                      ),
                    ),
                    child: Text(
                      DateFormat.yMMMd(locale.localeCode).format(
                        _effectiveFromDate,
                      ),
                      style: TextStyle(
                        fontSize: 15.sp,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                ),
              ],
            ],
            const SizedBox(height: 30),
            SizedBox(
              width: double.infinity,
              height: 60,
              child: FilledButton(
                onPressed: _saving ? null : _submit,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary500,
                  foregroundColor: AppColors.textInverse,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                child: _saving
                    ? SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            Colors.white,
                          ),
                        ),
                      )
                    : Text(
                        locale.t('common.update'),
                        style: textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w600,
                              fontSize: 16.sp,
                              color: AppColors.textInverse,
                            ) ??
                            TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 16.sp,
                              color: AppColors.textInverse,
                            ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Result of editing a training template from a session card.
typedef OwnerSessionTrainingEditResult = ({
  ServiceItem training,
  List<TrainingCategoryOption> categories,
});

/// Full training editor (step-1 fields + schedule toggle) from a session card.
Future<OwnerSessionTrainingEditResult?> openEditTrainingFromOwnerSession(
  BuildContext context,
  OwnerTrainingSession session,
) async {
  final token = context.read<AuthService>().accessToken;
  if (token == null || token.isEmpty) return null;

  final studio = await context.read<StudioCache>().getStudio(token);
  if (studio == null || !context.mounted) return null;

  final services = await ServicesApiService.getByStudio(token, studio.id);
  ServiceItem? item;
  for (final s in services) {
    if (s.id == session.trainingId) {
      item = s;
      break;
    }
  }
  if (item == null || !context.mounted) return null;

  final categories = await ServicesApiService.getTrainingCategories(token);
  if (!context.mounted) return null;

  final locale = context.read<LocaleProvider>();
  final title = locale.t('ownerSession.editScopeFollowing');

  final updated = await Navigator.of(context).push<ServiceItem?>(
    MaterialPageRoute<ServiceItem?>(
      builder: (ctx) => EditTrainingScreen(
        token: token,
        item: item!,
        studio: studio,
        categories: categories,
        onShowCategoryInfo: () {},
        scheduleEffectiveFrom: session.startsAt,
        title: title,
      ),
    ),
  );
  if (updated == null || !context.mounted) return null;
  return (training: updated, categories: categories);
}

