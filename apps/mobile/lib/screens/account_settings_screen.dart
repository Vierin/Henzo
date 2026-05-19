import 'package:flutter/material.dart';
import '../widgets/common/henzo_modal.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../constants/colors.dart';
import '../constants/layout.dart';
import '../l10n/locale_provider.dart';
import '../widgets/auth/auth_form_styles.dart';
import '../widgets/settings/settings_header_back_button.dart';
import '../services/auth_service.dart';
import '../services/owner_photo_storage_service.dart';
import '../main.dart';
import '../utils/auth_ui_result.dart';
import '../utils/owner_image_picker.dart';
import '../utils/owner_navigation_restore.dart';
import 'main_shell.dart';

/// Account settings mock: beige bg, caps section labels, white fields, coral CTAs.
const Color _kDangerPurple = Color(0xFF5141A8);
const Color _kAvatarPink = Color(0xFFF5D4D0);

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
            style: FilledButton.styleFrom(backgroundColor: _kDangerPurple),
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
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
      ),
      body: user == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(
                kScreenPaddingHorizontal,
                12,
                kScreenPaddingHorizontal,
                17,
              ),
              children: [
                _SectionLabel(text: locale.t('profileForm.personalData')),
                const SizedBox(height: 10),
                _PhotoCard(
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
                      _AccountPrimaryButton(
                        label: locale.t('common.save'),
                        isLoading: _isSavingProfile,
                        onPressed: _saveProfile,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),
                _SectionLabel(text: locale.t('profileForm.security')),
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
                      _AccountPrimaryButton(
                        label: locale.t('profileForm.changePassword'),
                        isLoading: _isSavingPassword,
                        onPressed: _changePassword,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),
                _SectionLabel(text: locale.t('profileForm.dangerZone')),
                const SizedBox(height: 10),
                _AccountDangerButton(
                  label: locale.t('profileForm.deleteAccount'),
                  onPressed: _showDeleteAccountDialog,
                ),
              ],
            ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 12),
      child: Text(
        text.toUpperCase(),
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.4,
          color: AppColors.textSecondary,
        ),
      ),
    );
  }
}

class _PhotoCard extends StatelessWidget {
  const _PhotoCard({
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
    final label = hasPhoto ? changeLabel : addLabel;

    return Material(
      color: AppColors.backgroundPrimary,
      borderRadius: BorderRadius.circular(AuthFormStyles.fieldBorderRadius),
      child: InkWell(
        onTap: isUploading ? null : onTap,
        borderRadius: BorderRadius.circular(AuthFormStyles.fieldBorderRadius),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(0, 15, 0, 12),
          child: Column(
            children: [
              Stack(
                alignment: Alignment.center,
                children: [
                  CircleAvatar(
                    radius: 52,
                    backgroundColor: _kAvatarPink,
                    backgroundImage: hasPhoto ? NetworkImage(avatarUrl!) : null,
                    child: hasPhoto
                        ? null
                        : Text(
                            initials,
                            style: const TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                  ),
                  if (isUploading)
                    const SizedBox(
                      width: 104,
                      height: 104,
                      child: ColoredBox(
                        color: Color(0x66FFFFFF),
                        child: Center(
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: AppColors.primary500,
                          ),
                        ),
                      ),
                    )
                  else
                    Positioned(
                      right: 0,
                      bottom: 0,
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: AppColors.primary500,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppColors.backgroundPrimary,
                            width: 2.5,
                          ),
                        ),
                        child: const Icon(
                          Icons.camera_alt_outlined,
                          size: 16,
                          color: Colors.white,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AccountPrimaryButton extends StatelessWidget {
  const _AccountPrimaryButton({
    required this.label,
    required this.onPressed,
    this.isLoading = false,
  });

  final String label;
  final VoidCallback onPressed;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: AuthFormStyles.buttonHeight,
      child: FilledButton(
        onPressed: isLoading ? null : onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary500,
          foregroundColor: AppColors.textInverse,
          disabledBackgroundColor: AppColors.primary500.withValues(alpha: 0.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(
              AuthFormStyles.fieldBorderRadius,
            ),
          ),
        ),
        child: isLoading
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : Text(
                label,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
      ),
    );
  }
}

class _AccountDangerButton extends StatelessWidget {
  const _AccountDangerButton({required this.label, required this.onPressed});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: AuthFormStyles.buttonHeight,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: _kDangerPurple,
          foregroundColor: AppColors.textInverse,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(
              AuthFormStyles.fieldBorderRadius,
            ),
          ),
        ),
        child: Text(
          label,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}
