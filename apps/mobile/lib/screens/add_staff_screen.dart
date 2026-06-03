import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../constants/colors.dart';
import '../constants/layout.dart';
import '../l10n/locale_provider.dart';
import '../services/auth_service.dart';
import '../services/cache/services_staff_cache.dart';
import '../services/staff_api_service.dart';
import '../services/trainer_api_service.dart';
import '../utils/plan_limit_dialogs.dart';
import '../utils/show_api_error.dart';
import '../widgets/auth/auth_form_styles.dart';
import '../widgets/settings/branded_settings_app_bar.dart';
import '../widgets/settings/settings_list_widgets.dart';

/// Добавление сотрудника: приглашение (Share) или ручная форма.
class AddStaffScreen extends StatefulWidget {
  final String salonId;

  const AddStaffScreen({super.key, required this.salonId});

  @override
  State<AddStaffScreen> createState() => _AddStaffScreenState();
}

class _AddStaffScreenState extends State<AddStaffScreen> {
  final _inviteNameController = TextEditingController();
  final _inviteEmailController = TextEditingController();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _saving = false;
  bool _inviting = false;
  String? _error;

  @override
  void dispose() {
    _inviteNameController.dispose();
    _inviteEmailController.dispose();
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _inviteViaShare() async {
    final locale = context.read<LocaleProvider>();
    final name = _inviteNameController.text.trim();
    final email = _inviteEmailController.text.trim();
    if (name.isEmpty) {
      setState(() => _error = locale.t('staffScreen.enterName'));
      return;
    }
    if (email.isEmpty || !email.contains('@')) {
      setState(() => _error = locale.t('staffScreen.enterEmailForInvite'));
      return;
    }
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;

    setState(() {
      _error = null;
      _inviting = true;
    });
    try {
      final created = await StaffApiService.create(
        token,
        studioId: widget.salonId,
        name: name,
        email: email,
      );
      final invite = await TrainerApiService.generateInvite(
        token,
        created.id,
      );
      final inviteUrl = invite['inviteUrl']?.toString() ?? '';
      final intro = locale
          .t('staff.shareInviteMessage')
          .replaceAll('{name}', name);
      await Share.share('$intro\n$inviteUrl');

      if (!mounted) return;
      context.read<ServicesStaffCache>().invalidateStaff(widget.salonId);
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(
          content: Text(locale.t('staffScreen.staffInvitedShared')),
          backgroundColor: Colors.green,
        ),
      );
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      if (isTrainerPlanLimitError(e)) {
        await showTrainerPlanLimitDialog(
          context,
          error: e,
          offerUpgrade: true,
        );
      } else {
        setState(() => _error = e.toString());
        showApiError(context, e);
      }
    } finally {
      if (mounted) setState(() => _inviting = false);
    }
  }

  Future<void> _submitManual() async {
    final locale = context.read<LocaleProvider>();
    setState(() {
      _error = null;
      _saving = true;
    });
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      setState(() {
        _error = locale.t('staffScreen.enterName');
        _saving = false;
      });
      return;
    }
    final token = context.read<AuthService>().accessToken;
    if (token == null) {
      setState(() => _saving = false);
      return;
    }
    try {
      await StaffApiService.create(
        token,
        studioId: widget.salonId,
        name: name,
        email: _emailController.text.trim().isEmpty
            ? null
            : _emailController.text.trim(),
        phone: _phoneController.text.trim().isEmpty
            ? null
            : _phoneController.text.trim(),
      );
      if (!mounted) return;
      context.read<ServicesStaffCache>().invalidateStaff(widget.salonId);
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(
          content: Text(locale.t('staffScreen.staffAdded')),
          backgroundColor: Colors.green,
        ),
      );
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      if (isTrainerPlanLimitError(e)) {
        await showTrainerPlanLimitDialog(
          context,
          error: e,
          offerUpgrade: true,
        );
      } else {
        setState(() => _error = e.toString());
        showApiError(context, e);
      }
    }
  }

  Widget _dividerOr(LocaleProvider locale) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: Row(
        children: [
          const Expanded(child: Divider(color: AppColors.borderPrimary)),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(
              locale.t('staffScreen.sectionDividerOr'),
              style: TextStyle(
                fontSize: 13.sp,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          const Expanded(child: Divider(color: AppColors.borderPrimary)),
        ],
      ),
    );
  }

  Widget _formField({
    required TextEditingController controller,
    required String hint,
    TextInputType? keyboardType,
    TextInputAction? textInputAction,
    IconData? prefixIcon,
    bool enabled = true,
  }) {
    return TextField(
      controller: controller,
      enabled: enabled,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      style: AuthFormStyles.fieldTextStyle,
      decoration: AuthFormStyles.fieldDecoration(
        hintText: hint,
        prefixIcon: prefixIcon,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final busy = _saving || _inviting;

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: buildBrandedSettingsAppBar(
        context,
        title: locale.t('staffScreen.addStaffTitle'),
        onBack: busy ? () {} : null,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(
          horizontal: kScreenPaddingHorizontal,
          vertical: 10,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 8),
            SettingsSectionLabel(
              title: locale.t('staffScreen.inviteSectionTitle'),
            ),
            const SizedBox(height: 6),
            Text(
              locale.t('staffScreen.inviteSectionSubtitle'),
              style: TextStyle(
                fontSize: 13.sp,
                color: AppColors.textSecondary,
                height: 1.35,
              ),
            ),
            const SizedBox(height: 14),
            _formField(
              controller: _inviteNameController,
              hint: locale.t('staffScreen.fullName'),
              prefixIcon: Icons.person_outline_rounded,
              textInputAction: TextInputAction.next,
              enabled: !busy,
            ),
            const SizedBox(height: AuthFormStyles.fieldGap),
            _formField(
              controller: _inviteEmailController,
              hint: locale.t('auth.email'),
              prefixIcon: Icons.email_rounded,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.done,
              enabled: !busy,
            ),
            const SizedBox(height: 14),
            FilledButton.icon(
              onPressed: busy ? null : _inviteViaShare,
              icon: _inviting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.ios_share_outlined, size: 20),
              label: Text(locale.t('staffScreen.inviteButton')),
              style: AuthFormStyles.primaryButtonStyle(),
            ),
            _dividerOr(locale),
            SettingsSectionLabel(
              title: locale.t('staffScreen.manualSectionTitle'),
            ),
            const SizedBox(height: 6),
            Text(
              locale.t('staffScreen.manualSectionSubtitle'),
              style: TextStyle(
                fontSize: 13.sp,
                color: AppColors.textSecondary,
                height: 1.35,
              ),
            ),
            const SizedBox(height: 14),
            _formField(
              controller: _nameController,
              hint: locale.t('staffScreen.fullName'),
              prefixIcon: Icons.person_outline_rounded,
              textInputAction: TextInputAction.next,
              enabled: !busy,
            ),
            const SizedBox(height: AuthFormStyles.fieldGap),
            _formField(
              controller: _emailController,
              hint: locale.t('auth.email'),
              prefixIcon: Icons.email_rounded,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              enabled: !busy,
            ),
            const SizedBox(height: AuthFormStyles.fieldGap),
            _formField(
              controller: _phoneController,
              hint: locale.t('common.phone'),
              prefixIcon: Icons.phone_outlined,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.done,
              enabled: !busy,
            ),
            if (_error != null) ...[
              const SizedBox(height: 14),
              SelectableText.rich(
                TextSpan(
                  text: _error!,
                  style: TextStyle(
                    color: AppColors.error500,
                    fontSize: 13.sp,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: busy ? null : () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(0, AuthFormStyles.buttonHeight),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(
                          AuthFormStyles.buttonBorderRadius,
                        ),
                      ),
                      side: const BorderSide(color: AppColors.borderPrimary),
                    ),
                    child: Text(locale.t('common.cancel')),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    onPressed: busy ? null : _submitManual,
                    style: AuthFormStyles.primaryButtonStyle(),
                    child: _saving
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(locale.t('common.save')),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
