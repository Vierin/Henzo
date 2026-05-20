import 'package:flutter/material.dart';
import '../widgets/common/henzo_modal.dart';
import 'package:provider/provider.dart';
import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../models/salon.dart';
import '../../models/service_item.dart';
import '../../models/staff_member.dart';
import '../../services/auth_service.dart';
import '../../services/cache/salon_cache.dart';
import '../../services/cache/services_staff_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../services/staff_api_service.dart';
import '../../utils/show_api_error.dart';
import '../../widgets/settings/branded_settings_app_bar.dart';
import '../../widgets/staff/staff_person_tile.dart';
import 'add_staff_screen.dart';

class StaffScreen extends StatefulWidget {
  const StaffScreen({super.key});

  @override
  State<StaffScreen> createState() => _StaffScreenState();
}

class _StaffScreenState extends State<StaffScreen> {
  Salon? _salon;
  List<StaffMember> _staff = [];
  bool _isLoading = false;
  bool _isActionLoading = false;
  bool _isProPlan = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }
    try {
      final salon = await context.read<SalonCache>().getSalon(token);
      final staff = salon != null
          ? await context.read<ServicesStaffCache>().getStaffForSalon(
              token,
              salon.id,
            )
          : <StaffMember>[];
      final sub = await DashboardApiService.getCurrentSubscription(token);
      if (mounted) {
        setState(() {
          _salon = salon;
          _staff = staff;
          _isProPlan = (sub?.type.toUpperCase() ?? 'FREEMIUM') == 'PRO';
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        showApiError(context, e);
      }
    }
  }

  Future<void> _deleteStaff(StaffMember member) async {
    final locale = context.read<LocaleProvider>();
    final confirm = await showHenzoDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(locale.t('staffScreen.deleteStaffTitle')),
        content: Text(
          '${locale.t('staffScreen.deleteStaffQuestionPrefix')} ${member.name}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(locale.t('common.cancel')),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text(locale.t('common.delete')),
          ),
        ],
      ),
    );
    if (confirm != true || !mounted) return;
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;
    setState(() => _isActionLoading = true);
    try {
      final ok = await StaffApiService.delete(token, member.id);
      if (!mounted) return;
      if (ok) {
        context.read<ServicesStaffCache>().invalidateStaff(_salon?.id);
        await _loadData();
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(
          SnackBar(
            content: Text(locale.t('staffScreen.staffDeleted')),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(
          SnackBar(
            content: Text(locale.t('common.deleteFailed')),
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

  void _openAddStaff() {
    final locale = context.read<LocaleProvider>();
    if (!_isProPlan) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(content: Text(locale.t('staffScreen.addStaffProRequired'))),
      );
      return;
    }
    final salonId = _salon?.id;
    if (salonId == null) return;
    Navigator.push(
      context,
      MaterialPageRoute(builder: (ctx) => AddStaffScreen(salonId: salonId)),
    ).then((_) {
      if (mounted) _loadData();
    });
  }

  List<StaffMember> _staffExcludingOwner(String? ownerEmail) {
    final ownerKey = ownerEmail?.trim().toLowerCase() ?? '';
    final list = _staff.where((m) {
      if (ownerKey.isEmpty) return true;
      return (m.email ?? '').trim().toLowerCase() != ownerKey;
    }).toList();
    list.sort((a, b) => a.name.compareTo(b.name));
    return list;
  }

  String? _ownerAvatarUrl(String? avatarUrl) {
    final url = avatarUrl?.trim();
    return url != null && url.isNotEmpty ? url : null;
  }

  void _openEditDialog(StaffMember member) {
    final locale = context.read<LocaleProvider>();
    final nameController = TextEditingController(text: member.name);
    final emailController = TextEditingController(text: member.email ?? '');
    final phoneController = TextEditingController(text: member.phone ?? '');
    final selectedServiceIds = <String>[];
    final screenWidth = MediaQuery.of(context).size.width;
    final dialogWidth = (screenWidth * 0.92).clamp(320.0, 560.0);
    showHenzoDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Container(
          width: dialogWidth,
          constraints: const BoxConstraints(maxHeight: 600),
          child: StatefulBuilder(
            builder: (ctx, setDialogState) {
              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 20, 16, 8),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            locale.t('staffScreen.editStaffTitle'),
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(ctx),
                          style: IconButton.styleFrom(
                            foregroundColor: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Flexible(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            locale.t('staffScreen.fullNameRequired'),
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          TextField(
                            controller: nameController,
                            decoration: InputDecoration(
                              hintText: locale.t('staffScreen.fullName'),
                              filled: true,
                              fillColor: AppColors.backgroundPrimary,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(
                                  color: AppColors.borderPrimary,
                                ),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 12,
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            locale.t('common.email'),
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          TextField(
                            controller: emailController,
                            keyboardType: TextInputType.emailAddress,
                            decoration: InputDecoration(
                              hintText: locale.t('common.email'),
                              filled: true,
                              fillColor: AppColors.backgroundPrimary,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(
                                  color: AppColors.borderPrimary,
                                ),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 12,
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            locale.t('common.phone'),
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          TextField(
                            controller: phoneController,
                            keyboardType: TextInputType.phone,
                            decoration: InputDecoration(
                              hintText: locale.t('common.phone'),
                              filled: true,
                              fillColor: AppColors.backgroundPrimary,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(
                                  color: AppColors.borderPrimary,
                                ),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 12,
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            locale.t('staffScreen.servicesOptional'),
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          InkWell(
                            onTap: () async {
                              final token = context
                                  .read<AuthService>()
                                  .accessToken;
                              if (token == null) return;
                              final list = await context
                                  .read<ServicesStaffCache>()
                                  .getServicesForSalon(token, member.salonId);
                              if (!ctx.mounted) return;
                              final result =
                                  await showHenzoModalBottomSheet<List<String>>(
                                    context: context,
                                    isScrollControlled: true,
                                    useSafeArea: true,
                                    builder: (ctx2) =>
                                        _StaffServicesPickerSheet(
                                          services: list,
                                          selectedIds: List.from(
                                            selectedServiceIds,
                                          ),
                                          onDone: (ids) =>
                                              Navigator.pop(ctx2, ids),
                                        ),
                                  );
                              if (result != null && ctx.mounted) {
                                selectedServiceIds
                                  ..clear()
                                  ..addAll(result);
                                setDialogState(() {});
                              }
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: InputDecorator(
                              decoration: InputDecoration(
                                hintText: locale.t('staffScreen.allServices'),
                                filled: true,
                                fillColor: AppColors.backgroundPrimary,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(
                                    color: AppColors.borderPrimary,
                                  ),
                                ),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 12,
                                ),
                                suffixIcon: const Icon(
                                  Icons.keyboard_arrow_down,
                                ),
                              ),
                              child: Text(
                                selectedServiceIds.isEmpty
                                    ? locale.t('staffScreen.allServices')
                                    : '${selectedServiceIds.length} ${locale.t('staffScreen.servicesSelected')}',
                                style: TextStyle(
                                  fontSize: 16,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            locale.t('staffScreen.selectServicesHint'),
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 24),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: () => Navigator.pop(ctx),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.textPrimary,
                                    side: const BorderSide(
                                      color: AppColors.borderPrimary,
                                    ),
                                    minimumSize: const Size(0, 48),
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 12,
                                      horizontal: 16,
                                    ),
                                  ),
                                  child: Text(locale.t('common.cancel')),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: FilledButton(
                                  onPressed: () async {
                                    final name = nameController.text.trim();
                                    if (name.isEmpty) {
                                      ScaffoldMessenger.maybeOf(
                                        context,
                                      )?.showSnackBar(
                                        SnackBar(
                                          content: Text(
                                            locale.t('staffScreen.enterFullName'),
                                          ),
                                        ),
                                      );
                                      return;
                                    }
                                    final token = context
                                        .read<AuthService>()
                                        .accessToken;
                                    Navigator.pop(ctx);
                                    if (token == null) return;
                                    setState(() => _isActionLoading = true);
                                    try {
                                      final updated =
                                          await StaffApiService.update(
                                            token,
                                            member.id,
                                            name: name,
                                            email:
                                                emailController.text
                                                    .trim()
                                                    .isEmpty
                                                ? null
                                                : emailController.text.trim(),
                                            phone:
                                                phoneController.text
                                                    .trim()
                                                    .isEmpty
                                                ? null
                                                : phoneController.text.trim(),
                                            serviceIds:
                                                selectedServiceIds.isEmpty
                                                ? null
                                                : List.from(selectedServiceIds),
                                          );
                                      if (!mounted) return;
                                      if (updated != null) {
                                        context
                                            .read<ServicesStaffCache>()
                                            .invalidateStaff(_salon?.id);
                                        await _loadData();
                                        ScaffoldMessenger.maybeOf(
                                          context,
                                        )?.showSnackBar(
                                          SnackBar(
                                            content: Text(
                                              locale.t('common.changesSaved'),
                                            ),
                                            backgroundColor: Colors.green,
                                          ),
                                        );
                                      } else {
                                        ScaffoldMessenger.maybeOf(
                                          context,
                                        )?.showSnackBar(
                                          SnackBar(
                                            content: Text(
                                              locale.t('common.saveFailed'),
                                            ),
                                            backgroundColor: Colors.red,
                                          ),
                                        );
                                      }
                                    } catch (e) {
                                      if (mounted) showApiError(context, e);
                                    } finally {
                                      if (mounted) {
                                        setState(
                                          () => _isActionLoading = false,
                                        );
                                      }
                                    }
                                  },
                                  style: FilledButton.styleFrom(
                                    backgroundColor: AppColors.primary500,
                                    minimumSize: const Size(0, 48),
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 12,
                                      horizontal: 16,
                                    ),
                                  ),
                                  child: Text(locale.t('common.save')),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  static Widget _StaffServicesPickerSheet({
    required List<ServiceItem> services,
    required List<String> selectedIds,
    required void Function(List<String>) onDone,
  }) {
    return _StaffServicesPickerSheetBody(
      services: services,
      initialSelectedIds: selectedIds,
      onDone: onDone,
    );
  }

  String _contactSubtitle({String? email, String? phone}) {
    final parts = <String>[
      if (email != null && email.trim().isNotEmpty) email.trim(),
      if (phone != null && phone.trim().isNotEmpty) phone.trim(),
    ];
    return parts.join(' · ');
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final owner = context.watch<AuthService>().user;
    final extraStaff = _staffExcludingOwner(owner?.email);
    final showAddFab = _salon != null && !_isLoading;
    final ownerName = (owner?.name?.trim().isNotEmpty ?? false)
        ? owner!.name!.trim()
        : owner?.email ?? locale.t('settings.owner.ownerRole');
    final ownerEmail = owner?.email ?? '';
    final ownerPhone = owner?.phone ?? '';
    final ownerSubtitle = [
      locale.t('settings.owner.ownerRole'),
      _contactSubtitle(email: ownerEmail, phone: ownerPhone),
    ].where((s) => s.isNotEmpty).join(' · ');

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: buildBrandedSettingsAppBar(
        context,
        title: locale.t('staffScreen.title'),
      ),
      floatingActionButton: showAddFab
          ? SafeArea(
              minimum: const EdgeInsets.only(bottom: 8),
              child: FloatingActionButton(
                onPressed: _isActionLoading ? null : _openAddStaff,
                elevation: 0,
                focusElevation: 0,
                hoverElevation: 0,
                highlightElevation: 0,
                backgroundColor: AppColors.primary500,
                foregroundColor: Colors.white,
                child: const Icon(Icons.add),
              ),
            )
          : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary500),
            )
          : _salon == null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  locale.t('common.setupSalonFirst'),
                  style: TextStyle(
                    fontSize: 16,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
            )
          : RefreshIndicator(
              onRefresh: _loadData,
              color: AppColors.primary500,
              child: ListView(
                padding: EdgeInsets.fromLTRB(
                  kScreenPaddingHorizontal,
                  12,
                  kScreenPaddingHorizontal,
                  showAddFab ? 88 : 24,
                ),
                children: [
                  StaffPersonTile(
                    name: ownerName,
                    secondaryLine: ownerSubtitle,
                    photoUrl: _ownerAvatarUrl(owner?.avatarUrl),
                  ),
                  ...extraStaff.map((member) {
                    return StaffPersonTile(
                      name: member.name,
                      secondaryLine: _contactSubtitle(
                        email: member.email,
                        phone: member.phone,
                      ),
                      trailing: _isActionLoading
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppColors.primary500,
                              ),
                            )
                          : Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(
                                    minWidth: 36,
                                    minHeight: 36,
                                  ),
                                  icon: const Icon(Icons.edit_outlined, size: 20),
                                  onPressed: () => _openEditDialog(member),
                                  color: AppColors.primary500,
                                ),
                                IconButton(
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(
                                    minWidth: 36,
                                    minHeight: 36,
                                  ),
                                  icon: const Icon(
                                    Icons.delete_outline,
                                    size: 20,
                                  ),
                                  onPressed: () => _deleteStaff(member),
                                  color: AppColors.error500,
                                ),
                              ],
                            ),
                    );
                  }),
                ],
              ),
            ),
    );
  }
}

class _StaffServicesPickerSheetBody extends StatefulWidget {
  const _StaffServicesPickerSheetBody({
    required this.services,
    required this.initialSelectedIds,
    required this.onDone,
  });
  final List<ServiceItem> services;
  final List<String> initialSelectedIds;
  final void Function(List<String>) onDone;

  @override
  State<_StaffServicesPickerSheetBody> createState() =>
      _StaffServicesPickerSheetBodyState();
}

class _StaffServicesPickerSheetBodyState
    extends State<_StaffServicesPickerSheetBody> {
  late Set<String> _selected;

  @override
  void initState() {
    super.initState();
    _selected = Set<String>.from(widget.initialSelectedIds);
  }

  @override
  Widget build(BuildContext context) {
    final maxH = MediaQuery.of(context).size.height * 0.7;
    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: maxH),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(
                kScreenPaddingHorizontal,
                16,
                kScreenPaddingHorizontal,
                8,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      context.read<LocaleProvider>().t(
                        'staffScreen.staffServicesTitle',
                      ),
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                    color: AppColors.textPrimary,
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: widget.services.length,
                itemBuilder: (context, i) {
                  final s = widget.services[i];
                  final isSelected = _selected.contains(s.id);
                  return CheckboxListTile(
                    value: isSelected,
                    onChanged: (v) {
                      setState(() {
                        if (v == true) {
                          _selected.add(s.id);
                        } else {
                          _selected.remove(s.id);
                        }
                      });
                    },
                    title: Text(
                      s.displayName,
                      style: const TextStyle(fontSize: 15),
                    ),
                    controlAffinity: ListTileControlAffinity.leading,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: kScreenPaddingHorizontal,
                      vertical: 4,
                    ),
                  );
                },
              ),
            ),
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(16),
              child: FilledButton(
                onPressed: () => widget.onDone(_selected.toList()),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary500,
                  minimumSize: const Size(0, 48),
                ),
                child: Text(context.read<LocaleProvider>().t('common.done')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
