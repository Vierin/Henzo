import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../constants/colors.dart';
import '../constants/layout.dart';
import '../l10n/locale_provider.dart';
import '../widgets/auth/auth_form_styles.dart';
import '../widgets/settings/account_profile_form_widgets.dart';
import '../widgets/settings/settings_header_back_button.dart';
import '../services/auth_service.dart';
import '../services/owner_photo_storage_service.dart';
import '../utils/auth_ui_result.dart';
import '../utils/owner_image_picker.dart';
import '../utils/owner_navigation_restore.dart';
import '../utils/root_navigator_key.dart';
import 'main_shell.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class AccountSettingsScreen extends StatefulWidget {
  const AccountSettingsScreen({super.key});

  @override
  State<AccountSettingsScreen> createState() => _AccountSettingsScreenState();
}

class _AccountSettingsScreenState extends State<AccountSettingsScreen> {
  final _profileFormKey = GlobalKey<FormState>();
  final _passwordFormKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  String? _avatarUrl;
  bool _isSavingProfile = false;
  bool _isSavingPassword = false;
  bool _avatarUploading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = context.read<AuthService>().user;
      if (user != null) {
        _nameController.text = user.name ?? '';
        _phoneController.text = user.phone ?? '';
        _avatarUrl = user.avatarUrl?.trim().isNotEmpty == true
            ? user.avatarUrl!.trim()
            : null;
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  String _avatarUrlWithCacheBust(String url) {
    final base = url.split('?').first;
    return '$base?v=${DateTime.now().millisecondsSinceEpoch}';
  }

  String _initials(String? name, String email) {
    final parts = (name ?? '')
        .trim()
        .split(RegExp(r'\s+'))
        .where((e) => e.isNotEmpty)
        .take(2)
        .toList();
    if (parts.isNotEmpty) {
      return parts.map((p) => p[0].toUpperCase()).join();
    }
    final mail = email.trim();
    if (mail.isNotEmpty) return mail[0].toUpperCase();
    return '?';
  }

  void _showSnack(String message) {
    var messenger = ScaffoldMessenger.maybeOf(context);
    if (messenger == null) {
      final rootCtx = henzoRootNavigatorKey.currentContext;
      if (rootCtx != null) {
        messenger = ScaffoldMessenger.maybeOf(rootCtx);
      }
    }
    messenger?.showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _pickProfilePhoto() async {
    if (_avatarUploading) return;

    setState(() => _avatarUploading = true);
    try {
      final shellTab =
          context.findAncestorStateOfType<MainShellState>()?.currentTabIndex ??
          3;
      await OwnerNavigationRestore.markPendingProfilePhotoUpload(
        shellTabIndex: shellTab,
      );
      final picked = await OwnerImagePicker.pickSingleFromGallery();
      await OwnerNavigationRestore.clearPendingProfilePhotoUpload();

      if (!mounted) return;
      if (picked == null) return;

      if (Supabase.instance.client.auth.currentUser?.id == null) {
        _showSnack(context.read<LocaleProvider>().t('accountSettings.reloginToUploadPhoto'));
        return;
      }

      final upload = await OwnerPhotoStorageService.uploadProfileAvatar(
        file: picked,
      );
      if (!mounted) return;
      if (upload.url != null) {
        final busted = _avatarUrlWithCacheBust(upload.url!);
        setState(() => _avatarUrl = busted);
        final result = await context.read<AuthService>().updateProfile(
          name: _nameController.text.trim(),
          phone: _phoneController.text.trim(),
          avatarUrl: busted,
        );
        if (!mounted) return;
        if (!result.success) {
          _showSnack(
            resolveAuthUiMessage(context.read<LocaleProvider>(), result),
          );
        }
      } else {
        _showSnack(
          context.read<LocaleProvider>().t(
            upload.error ?? 'accountSettings.uploadPhotoFailed',
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        _showSnack(context.read<LocaleProvider>().t('accountSettings.uploadError'));
      }
    } finally {
      await OwnerNavigationRestore.clearPendingProfilePhotoUpload();
      if (mounted) setState(() => _avatarUploading = false);
    }
  }

  Future<void> _saveProfile() async {
    if (!(_profileFormKey.currentState?.validate() ?? false)) return;
    setState(() => _isSavingProfile = true);
    final auth = context.read<AuthService>();
    final result = await auth.updateProfile(
      name: _nameController.text.trim(),
      phone: _phoneController.text.trim(),
      avatarUrl: _avatarUrl,
    );
    if (!mounted) return;
    setState(() => _isSavingProfile = false);
    if (result.success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            context.read<LocaleProvider>().t('profileForm.profileUpdated'),
          ),
        ),
      );
    } else {
      final loc = context.read<LocaleProvider>();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            resolveAuthUiMessage(
              loc,
              result,
              fallbackKey: 'profileForm.updateError',
            ),
          ),
        ),
      );
    }
  }

  Future<void> _changePassword() async {
    if (!(_passwordFormKey.currentState?.validate() ?? false)) return;
    final newPwd = _newPasswordController.text;
    if (newPwd != _confirmPasswordController.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            context.read<LocaleProvider>().t('profileForm.passwordsDontMatch'),
          ),
        ),
      );
      return;
    }
    if (newPwd.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            context.read<LocaleProvider>().t('profileForm.passwordMin8'),
          ),
        ),
      );
      return;
    }
    setState(() => _isSavingPassword = true);
    final auth = context.read<AuthService>();
    final result = await auth.updatePassword(newPwd);
    if (!mounted) return;
    setState(() {
      _isSavingPassword = false;
      _newPasswordController.clear();
      _confirmPasswordController.clear();
    });
    if (result.success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            context.read<LocaleProvider>().t('profileForm.passwordChanged'),
          ),
        ),
      );
    } else {
      final loc = context.read<LocaleProvider>();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            resolveAuthUiMessage(
              loc,
              result,
              fallbackKey: 'profileForm.changePasswordError',
            ),
          ),
        ),
      );
    }
  }

  Future<void> _deleteAccount() async {
    final auth = context.read<AuthService>();
    final result = await auth.deleteAccount();
    if (!mounted) return;
    if (result.success) {
      Navigator.of(context).popUntil((route) => route.isFirst);
    } else {
      final loc = context.read<LocaleProvider>();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            resolveAuthUiMessage(
              loc,
              result,
              fallbackKey: 'profileForm.deleteAccountError',
            ),
          ),
        ),
      );
    }
  }

  Future<void> _showDeleteAccountDialog() async {
    final confirmed = await showDeleteAccountConfirmDialog(context);
    if (confirmed == true) {
      await _deleteAccount();
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final user = auth.user;
    final locale = context.watch<LocaleProvider>();
    final initials = user != null ? _initials(user.name, user.email) : '?';

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundSecondary,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        leading: SettingsHeaderBackButton(
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: Text(
          locale.t('profileForm.accountSettings'),
          style: TextStyle(
            fontSize: 18.sp,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
      ),
      body: user == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: EdgeInsets.fromLTRB(
                kScreenPaddingHorizontal,
                12,
                kScreenPaddingHorizontal,
                32 + MediaQuery.paddingOf(context).bottom,
              ),
              children: [
                AccountSectionLabel(
                  text: locale.t('profileForm.personalData'),
                ),
                const SizedBox(height: 10),
                AccountPhotoCard(
                  avatarUrl: _avatarUrl,
                  initials: initials,
                  isUploading: _avatarUploading,
                  addLabel: locale.t('profileForm.addProfilePhoto'),
                  changeLabel: locale.t('profileForm.changeProfilePhoto'),
                  onTap: _pickProfilePhoto,
                ),
                const SizedBox(height: AuthFormStyles.fieldGap),
                Form(
                  key: _profileFormKey,
                  child: Column(
                    children: [
                      TextFormField(
                        controller: _nameController,
                        style: AuthFormStyles.fieldTextStyle,
                        decoration: AuthFormStyles.fieldDecoration(
                          hintText: locale.t('profileForm.name'),
                        ),
                      ),
                      const SizedBox(height: AuthFormStyles.fieldGap),
                      TextFormField(
                        initialValue: user.email,
                        readOnly: true,
                        style: AuthFormStyles.fieldTextStyle,
                        decoration: AuthFormStyles.fieldDecoration(
                          hintText: locale.t('profileForm.email'),
                        ),
                      ),
                      const SizedBox(height: AuthFormStyles.fieldGap),
                      TextFormField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        style: AuthFormStyles.fieldTextStyle,
                        decoration: AuthFormStyles.fieldDecoration(
                          hintText: locale.t('profileForm.phone'),
                        ),
                      ),
                      const SizedBox(height: 16),
                      AccountPrimaryButton(
                        label: locale.t('common.save'),
                        isLoading: _isSavingProfile,
                        onPressed: _saveProfile,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),
                AccountSectionLabel(text: locale.t('profileForm.security')),
                const SizedBox(height: 10),
                Form(
                  key: _passwordFormKey,
                  child: Column(
                    children: [
                      TextFormField(
                        controller: _newPasswordController,
                        obscureText: true,
                        style: AuthFormStyles.fieldTextStyle,
                        decoration: AuthFormStyles.fieldDecoration(
                          hintText: locale.t('profileForm.newPassword'),
                        ),
                      ),
                      const SizedBox(height: AuthFormStyles.fieldGap),
                      TextFormField(
                        controller: _confirmPasswordController,
                        obscureText: true,
                        style: AuthFormStyles.fieldTextStyle,
                        decoration: AuthFormStyles.fieldDecoration(
                          hintText: locale.t('profileForm.confirmPassword'),
                        ),
                      ),
                      const SizedBox(height: 16),
                      AccountPrimaryButton(
                        label: locale.t('profileForm.changePassword'),
                        isLoading: _isSavingPassword,
                        onPressed: _changePassword,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),
                AccountSectionLabel(text: locale.t('profileForm.dangerZone')),
                const SizedBox(height: 10),
                AccountDangerButton(
                  label: locale.t('profileForm.deleteAccount'),
                  onPressed: _showDeleteAccountDialog,
                ),
              ],
            ),
    );
  }
}
