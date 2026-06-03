import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import '../widgets/common/henzo_modal.dart';
import 'package:provider/provider.dart';
import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../models/studio.dart';
import '../../models/staff_member.dart';
import '../../services/auth_service.dart';
import '../../services/cache/studio_cache.dart';
import '../../services/cache/services_staff_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../services/trainers_api_service.dart';
import '../../services/trainer_api_service.dart';
import '../../utils/plan_limit_dialogs.dart';
import '../../utils/show_api_error.dart';
import '../../utils/subscription_tier.dart';
import '../../widgets/settings/branded_settings_app_bar.dart';
import '../../widgets/staff/staff_person_tile.dart';
import 'add_staff_screen.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class StaffScreen extends StatefulWidget {
  const StaffScreen({super.key});

  @override
  State<StaffScreen> createState() => _StaffScreenState();
}

class _StaffScreenState extends State<StaffScreen> {
  Studio? _studio;
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
      final studio = await context.read<StudioCache>().getStudio(token);
      final staff = studio != null
          ? await context.read<ServicesStaffCache>().getTrainersForStudio(
              token,
              studio.id,
            )
          : <StaffMember>[];
      final sub = await DashboardApiService.getCurrentSubscription(token);
      if (mounted) {
        setState(() {
          _studio = salon;
          _staff = staff;
          _isProPlan = subscriptionTypeIsPaid(sub?.type);
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
      await TrainersApiService.delete(token, member.id);
      if (!mounted) return;
      context.read<ServicesStaffCache>().invalidateTrainers(_studio?.id);
      await _loadData();
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(
          content: Text(locale.t('staffScreen.staffDeleted')),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (mounted) showApiError(context, e);
    } finally {
      if (mounted) setState(() => _isActionLoading = false);
    }
  }

  void _openAddStaff() {
    if (!_isProPlan) {
      _showTrainerLimitDialog();
      return;
    }
    final studioId = _studio?.id;
    if (studioId == null) return;
    Navigator.push(
      context,
      MaterialPageRoute(builder: (ctx) => AddStaffScreen(studioId: studioId)),
    ).then((_) {
      if (mounted) _loadData();
    });
  }

  Future<void> _showInviteSheet(StaffMember member) async {
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;
    String? inviteUrl;
    bool loading = true;
    String? error;

    await showHenzoModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      backgroundColor: AppColors.backgroundPrimary,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (sheetCtx, setSheet) {
            final locale = sheetCtx.read<LocaleProvider>();
            if (loading) {
              TrainerApiService.generateInvite(token, member.id).then((result) {
                inviteUrl = result['inviteUrl']?.toString();
                setSheet(() => loading = false);
              }).catchError((e) {
                error = e.toString();
                setSheet(() => loading = false);
              });
            }
            return SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      locale.t('staff.inviteTitle').replaceAll('{name}', member.name),
                      style: TextStyle(
                        fontSize: 17.sp,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      locale.t('staff.shareInviteMessage').replaceAll('{name}', member.name),
                      style: TextStyle(fontSize: 13.sp, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 20),
                    if (loading)
                      const Center(child: CircularProgressIndicator())
                    else if (error != null)
                      Text(error!, style: const TextStyle(color: AppColors.error500))
                    else if (inviteUrl != null) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppColors.neutral100,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          inviteUrl!,
                          style: TextStyle(fontSize: 12.sp, color: AppColors.textSecondary),
                          overflow: TextOverflow.ellipsis,
                          maxLines: 2,
                        ),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () {
                                Clipboard.setData(
                                  ClipboardData(text: inviteUrl!),
                                );
                                ScaffoldMessenger.maybeOf(context)?.showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      locale.t('common.linkCopied'),
                                    ),
                                  ),
                                );
                              },
                              icon: const Icon(Icons.copy_outlined, size: 16),
                              label: Text(locale.t('common.copyLink')),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: FilledButton.icon(
                              onPressed: () {
                                final intro = locale
                                    .t('staff.shareInviteMessage')
                                    .replaceAll('{name}', member.name);
                                Share.share('$intro\n$inviteUrl');
                              },
                              icon: const Icon(Icons.ios_share_outlined, size: 16),
                              label: Text(locale.t('staffScreen.inviteButton')),
                              style: FilledButton.styleFrom(
                                backgroundColor: AppColors.primary500,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        locale.t('staff.inviteExpires'),
                        style: TextStyle(fontSize: 11.sp, color: AppColors.textSecondary),
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showTrainerLimitDialog() {
    showTrainerPlanLimitDialog(context, offerUpgrade: true);
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
                              fontSize: 22.sp,
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
                              fontSize: 14.sp,
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
                              fontSize: 14.sp,
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
                              fontSize: 14.sp,
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
                                      await TrainersApiService.update(
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
                                      );
                                      if (!mounted) return;
                                      context
                                          .read<ServicesStaffCache>()
                                          .invalidateTrainers(_studio?.id);
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

  String _contactSubtitle({String? email, String? phone}) {
    final parts = <String>[
      if (email != null && email.trim().isNotEmpty) email.trim(),
      if (phone != null && phone.trim().isNotEmpty) phone.trim(),
    ];
    return parts.join(' · ');
  }

  String _memberStatusLabel(LocaleProvider locale, StaffMember member) {
    if (member.hasLinkedAccount) {
      return locale.t('staffScreen.statusActive');
    }
    if (member.hasPendingInvite) {
      return locale.t('staffScreen.statusInvitePending');
    }
    return locale.t('staffScreen.statusNoAccount');
  }

  String _memberSubtitle(LocaleProvider locale, StaffMember member) {
    final contact = _contactSubtitle(
      email: member.email,
      phone: member.phone,
    );
    final status = _memberStatusLabel(locale, member);
    if (contact.isEmpty) return status;
    return '$contact · $status';
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final owner = context.watch<AuthService>().user;
    final extraStaff = _staffExcludingOwner(owner?.email);
    final showAddFab = _studio != null && !_isLoading;
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
          : _studio == null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  locale.t('common.setupSalonFirst'),
                  style: TextStyle(
                    fontSize: 16.sp,
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
                      secondaryLine: _memberSubtitle(locale, member),
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
                                if (_isProPlan && !member.hasLinkedAccount)
                                  IconButton(
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(
                                      minWidth: 36,
                                      minHeight: 36,
                                    ),
                                    icon: const Icon(
                                      Icons.link_outlined,
                                      size: 20,
                                    ),
                                    tooltip: locale.t('staffScreen.inviteButton'),
                                    onPressed: () => _showInviteSheet(member),
                                    color: AppColors.primary500,
                                  ),
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
