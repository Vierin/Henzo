import 'package:flutter/material.dart';
import '../widgets/common/henzo_modal.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../constants/colors.dart';
import '../constants/layout.dart';
import '../l10n/locale_provider.dart';
import '../widgets/settings/branded_settings_app_bar.dart';
import '../widgets/settings/settings_form_tokens.dart';
import '../services/auth_service.dart';
import '../services/owner_photo_storage_service.dart';
import '../main.dart';
import '../utils/auth_ui_result.dart';
import '../utils/owner_image_picker.dart';
import '../utils/owner_navigation_restore.dart';
import 'main_shell.dart';

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
        _showSnack('Войдите снова, чтобы загрузить фото');
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
        _showSnack(upload.error ?? 'Не удалось загрузить фото');
      }
    } catch (e) {
      if (mounted) {
        _showSnack('Ошибка загрузки: $e');
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

  void _showDeleteAccountDialog() {
    showHenzoDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        title: Text(
          context.read<LocaleProvider>().t('profileForm.deleteAccount'),
        ),
        content: Text(
          context.read<LocaleProvider>().t('profileForm.deleteAccountConfirm'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: Text(context.read<LocaleProvider>().t('common.cancel')),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(dialogContext).pop();
              _deleteAccount();
            },
            style: FilledButton.styleFrom(backgroundColor: AppColors.error600),
            child: Text(
              context.read<LocaleProvider>().t('profileForm.deleteAccount'),
            ),
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
        title: locale.t('profileForm.accountSettings'),
      ),
      body: user == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(
                kScreenPaddingHorizontal,
                8,
                kScreenPaddingHorizontal,
                24,
              ),
              children: [
                _Card(
                  title: locale.t('profileForm.personalData'),
                  child: Form(
                    key: _profileFormKey,
                    child: Column(
                      children: [
                        _ProfilePhotoPicker(
                          avatarUrl: _avatarUrl,
                          initials: _initials(user.name, user.email),
                          isUploading: _avatarUploading,
                          addLabel: locale.t('profileForm.addProfilePhoto'),
                          changeLabel: locale.t(
                            'profileForm.changeProfilePhoto',
                          ),
                          onTap: _pickProfilePhoto,
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _nameController,
                          decoration: settingsInputDecoration(
                            labelText: locale.t('profileForm.name'),
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          initialValue: user.email,
                          readOnly: true,
                          decoration: settingsInputDecoration(
                            labelText: locale.t('profileForm.email'),
                            readOnly: true,
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _phoneController,
                          decoration: settingsInputDecoration(
                            labelText: locale.t('profileForm.phone'),
                          ),
                        ),
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton(
                            onPressed: _isSavingProfile ? null : _saveProfile,
                            child: Text(
                              _isSavingProfile
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
                _Card(
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
                            labelText: locale.t('profileForm.confirmPassword'),
                          ),
                        ),
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton(
                            onPressed: _isSavingPassword
                                ? null
                                : _changePassword,
                            child: Text(
                              _isSavingPassword
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
                _DeleteAccountButton(
                  label: locale.t('profileForm.deleteAccount'),
                  onPressed: _showDeleteAccountDialog,
                ),
              ],
            ),
    );
  }
}

class _ProfilePhotoPicker extends StatelessWidget {
  const _ProfilePhotoPicker({
    required this.avatarUrl,
    required this.initials,
    required this.isUploading,
    required this.addLabel,
    required this.changeLabel,
    required this.onTap,
  });

  final String? avatarUrl;
  final String initials;
  final bool isUploading;
  final String addLabel;
  final String changeLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final hasPhoto = avatarUrl != null && avatarUrl!.isNotEmpty;

    return Column(
      children: [
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: isUploading ? null : onTap,
            customBorder: const CircleBorder(),
            child: Stack(
              alignment: Alignment.center,
              children: [
                CircleAvatar(
                  radius: 44,
                  backgroundColor: AppColors.primary100,
                  backgroundImage: hasPhoto ? NetworkImage(avatarUrl!) : null,
                  child: hasPhoto
                      ? null
                      : Text(
                          initials,
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary500,
                          ),
                        ),
                ),
                if (isUploading)
                  const Positioned.fill(
                    child: ColoredBox(
                      color: Color(0x66FFFFFF),
                      child: Center(
                        child: SizedBox(
                          width: 28,
                          height: 28,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: AppColors.primary500,
                          ),
                        ),
                      ),
                    ),
                  )
                else
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: AppColors.primary500,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AppColors.backgroundPrimary,
                          width: 2,
                        ),
                      ),
                      child: const Icon(
                        Icons.camera_alt_outlined,
                        size: 14,
                        color: Colors.white,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          hasPhoto ? changeLabel : addLabel,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.primary500,
          ),
        ),
      ],
    );
  }
}

class _DeleteAccountButton extends StatelessWidget {
  const _DeleteAccountButton({required this.label, required this.onPressed});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(kSettingsInputBorderRadius),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(kSettingsInputBorderRadius),
            border: Border.all(color: AppColors.error600, width: 1.5),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.delete_forever_outlined,
                size: 20,
                color: AppColors.error600,
              ),
              const SizedBox(width: 8),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppColors.error600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: settingsSectionDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}
