import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../widgets/common/henzo_modal.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../services/auth_service.dart';
import '../../services/owner_photo_storage_service.dart';
import '../../utils/auth_ui_result.dart';
import '../../utils/owner_image_picker.dart';
import '../../utils/owner_navigation_restore.dart';
import '../../widgets/settings/branded_settings_app_bar.dart';
import '../../widgets/settings/profile_photo_picker.dart';
import '../../widgets/settings/settings_form_tokens.dart';

class ClientEditProfileScreen extends StatefulWidget {
  const ClientEditProfileScreen({super.key});

  @override
  State<ClientEditProfileScreen> createState() =>
      _ClientEditProfileScreenState();
}

class _ClientEditProfileScreenState extends State<ClientEditProfileScreen> {
  final _profileFormKey = GlobalKey<FormState>();
  final _passwordFormKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  String? _avatarUrl;
  bool _savingProfile = false;
  bool _savingPassword = false;
  bool _avatarUploading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = context.read<AuthService>().user;
      if (user == null) return;
      final fullName = (user.name ?? '').trim();
      final parts = fullName
          .split(RegExp(r'\s+'))
          .where((p) => p.isNotEmpty)
          .toList();
      if (parts.isNotEmpty) {
        _firstNameController.text = parts.first;
        if (parts.length > 1) {
          _lastNameController.text = parts.sublist(1).join(' ');
        }
      }
      _emailController.text = user.email;
      _avatarUrl = user.avatarUrl?.trim().isNotEmpty == true
          ? user.avatarUrl!.trim()
          : null;
      setState(() {});
    });
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
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

  String get _fullName {
    return [
      _firstNameController.text.trim(),
      _lastNameController.text.trim(),
    ].where((s) => s.isNotEmpty).join(' ');
  }

  Future<void> _pickProfilePhoto() async {
    if (_avatarUploading) return;
    final locale = context.read<LocaleProvider>();

    setState(() => _avatarUploading = true);
    try {
      await OwnerNavigationRestore.markPendingProfilePhotoUpload();
      final picked = await OwnerImagePicker.pickSingleFromGallery();
      await OwnerNavigationRestore.clearPendingProfilePhotoUpload();

      if (!mounted) return;
      if (picked == null) return;

      if (Supabase.instance.client.auth.currentUser?.id == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please sign in again to upload photo')),
        );
        return;
      }

      final upload = await OwnerPhotoStorageService.uploadProfileAvatar(
        file: picked,
      );
      if (!mounted) return;
      if (upload.url != null) {
        final busted = _avatarUrlWithCacheBust(upload.url!);
        setState(() => _avatarUrl = busted);
        final auth = context.read<AuthService>();
        final result = await auth.updateProfile(
          name: _fullName.isNotEmpty ? _fullName : (auth.user?.name ?? ''),
          phone: auth.user?.phone ?? '',
          avatarUrl: busted,
        );
        if (!mounted) return;
        if (!result.success) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                resolveAuthUiMessage(
                  locale,
                  result,
                  fallbackKey: 'profileForm.updateError',
                ),
              ),
            ),
          );
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(upload.error ?? locale.t('errors.generic'))),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${locale.t('errors.generic')}: $e')),
        );
      }
    } finally {
      await OwnerNavigationRestore.clearPendingProfilePhotoUpload();
      if (mounted) setState(() => _avatarUploading = false);
    }
  }

  Future<void> _saveProfile() async {
    if (!(_profileFormKey.currentState?.validate() ?? false)) return;
    final locale = context.read<LocaleProvider>();
    final auth = context.read<AuthService>();

    setState(() => _savingProfile = true);
    final profileRes = await auth.updateProfile(
      name: _fullName,
      phone: auth.user?.phone ?? '',
      avatarUrl: _avatarUrl,
    );
    if (!mounted) return;

    if (!profileRes.success) {
      setState(() => _savingProfile = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            resolveAuthUiMessage(
              locale,
              profileRes,
              fallbackKey: 'profileForm.updateError',
            ),
          ),
        ),
      );
      return;
    }

    final newEmail = _emailController.text.trim();
    if (newEmail.isNotEmpty && newEmail != (auth.user?.email ?? '')) {
      final emailRes = await auth.updateEmail(newEmail);
      if (!mounted) return;
      if (!emailRes.success) {
        setState(() => _savingProfile = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(emailRes.errorRaw ?? locale.t('errors.generic')),
          ),
        );
        return;
      }
    }

    setState(() => _savingProfile = false);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(locale.t('profileForm.profileUpdated'))),
    );
    Navigator.of(context).pop();
  }

  Future<void> _changePassword() async {
    if (!(_passwordFormKey.currentState?.validate() ?? false)) return;
    final locale = context.read<LocaleProvider>();
    final newPwd = _newPasswordController.text;
    if (newPwd != _confirmPasswordController.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(locale.t('profileForm.passwordsDontMatch'))),
      );
      return;
    }
    if (newPwd.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(locale.t('profileForm.passwordMin8'))),
      );
      return;
    }

    setState(() => _savingPassword = true);
    final pwdRes = await context.read<AuthService>().updatePassword(newPwd);
    if (!mounted) return;
    setState(() => _savingPassword = false);

    if (pwdRes.success) {
      _newPasswordController.clear();
      _confirmPasswordController.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(locale.t('profileForm.passwordChanged'))),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            resolveAuthUiMessage(
              locale,
              pwdRes,
              fallbackKey: 'profileForm.changePasswordError',
            ),
          ),
        ),
      );
    }
  }

  Future<void> _deleteAccount() async {
    final locale = context.read<LocaleProvider>();
    final result = await context.read<AuthService>().deleteAccount();
    if (!mounted) return;
    if (result.success) {
      Navigator.of(context).popUntil((route) => route.isFirst);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            resolveAuthUiMessage(
              locale,
              result,
              fallbackKey: 'profileForm.deleteAccountError',
            ),
          ),
        ),
      );
    }
  }

  void _showDeleteAccountDialog() {
    final locale = context.read<LocaleProvider>();
    showHenzoDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        title: Text(locale.t('profileForm.deleteAccount')),
        content: Text(locale.t('profileForm.deleteAccountConfirm')),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: Text(locale.t('common.cancel')),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(dialogContext).pop();
              _deleteAccount();
            },
            style: FilledButton.styleFrom(backgroundColor: AppColors.error600),
            child: Text(locale.t('profileForm.deleteAccount')),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final user = auth.user;
    final locale = context.watch<LocaleProvider>();

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: buildBrandedSettingsAppBar(
        context,
        title: locale.t('profileForm.personalData'),
      ),
      body: user == null
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary500),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(
                kScreenPaddingHorizontal,
                8,
                kScreenPaddingHorizontal,
                24,
              ),
              children: [
                SettingsFormCard(
                  title: locale.t('profileForm.personalData'),
                  child: Form(
                    key: _profileFormKey,
                    child: Column(
                      children: [
                        ProfilePhotoPicker(
                          avatarUrl: _avatarUrl,
                          initials: _initials(_fullName, user.email),
                          isUploading: _avatarUploading,
                          addLabel: locale.t('profileForm.addProfilePhoto'),
                          changeLabel:
                              locale.t('profileForm.changeProfilePhoto'),
                          onTap: _pickProfilePhoto,
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _firstNameController,
                          textCapitalization: TextCapitalization.words,
                          decoration: settingsInputDecoration(
                            labelText: locale.t('profileForm.name'),
                          ),
                          validator: (v) => (v == null || v.trim().isEmpty)
                              ? locale.t('profileForm.enterName')
                              : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _lastNameController,
                          textCapitalization: TextCapitalization.words,
                          decoration: settingsInputDecoration(
                            labelText: 'Last name',
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          decoration: settingsInputDecoration(
                            labelText: locale.t('profileForm.email'),
                          ),
                        ),
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton(
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.primary500,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                            onPressed: _savingProfile ? null : _saveProfile,
                            child: Text(
                              _savingProfile
                                  ? '...'
                                  : locale.t('common.save'),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                SettingsFormCard(
                  title: locale.t('profileForm.security'),
                  child: Form(
                    key: _passwordFormKey,
                    child: Column(
                      children: [
                        TextFormField(
                          controller: _newPasswordController,
                          obscureText: true,
                          decoration: settingsInputDecoration(
                            labelText: locale.t('profileForm.newPassword'),
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _confirmPasswordController,
                          obscureText: true,
                          decoration: settingsInputDecoration(
                            labelText:
                                locale.t('profileForm.confirmPassword'),
                          ),
                        ),
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton(
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.primary500,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                            onPressed:
                                _savingPassword ? null : _changePassword,
                            child: Text(
                              _savingPassword
                                  ? '...'
                                  : locale.t('profileForm.changePassword'),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                SettingsDeleteAccountButton(
                  label: locale.t('profileForm.deleteAccount'),
                  onPressed: _showDeleteAccountDialog,
                ),
              ],
            ),
    );
  }
}
