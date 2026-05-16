import 'package:flutter/material.dart';
import '../widgets/common/henzo_modal.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../constants/colors.dart';
import '../constants/layout.dart';
import '../l10n/locale_provider.dart';
import '../widgets/settings/branded_settings_app_bar.dart';
import '../services/auth_service.dart';
import '../services/owner_photo_storage_service.dart';
import '../utils/auth_ui_result.dart';

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

  Future<void> _pickProfilePhoto() async {
    if (_avatarUploading) return;
    final picked = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
    );
    if (picked == null) return;

    final userId =
        Supabase.instance.client.auth.currentUser?.id ??
        context.read<AuthService>().user?.id;
    if (userId == null) return;

    setState(() => _avatarUploading = true);
    try {
      final upload = await OwnerPhotoStorageService.uploadProfileAvatar(
        file: picked,
        userId: userId,
      );
      if (!mounted) return;
      if (upload.url != null) {
        setState(() => _avatarUrl = upload.url);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(upload.error ?? 'Upload failed')),
        );
      }
    } finally {
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
                          changeLabel:
                              locale.t('profileForm.changeProfilePhoto'),
                          onTap: _pickProfilePhoto,
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _nameController,
                          decoration: InputDecoration(
                            labelText: locale.t('profileForm.name'),
                            border: const OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          initialValue: user.email,
                          readOnly: true,
                          decoration: InputDecoration(
                            labelText: locale.t('profileForm.email'),
                            border: const OutlineInputBorder(),
                            filled: true,
                            fillColor: AppColors.backgroundTertiary,
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _phoneController,
                          decoration: InputDecoration(
                            labelText: locale.t('profileForm.phone'),
                            border: const OutlineInputBorder(),
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
                          decoration: InputDecoration(
                            labelText: locale.t('profileForm.newPassword'),
                            border: const OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _confirmPasswordController,
                          obscureText: true,
                          decoration: InputDecoration(
                            labelText: locale.t('profileForm.confirmPassword'),
                            border: const OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton(
                            onPressed:
                                _isSavingPassword ? null : _changePassword,
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
                const SizedBox(height: 12),
                _Card(
                  title: locale.t('profileForm.dangerZone'),
                  child: Column(
                    children: [
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: _showDeleteAccountDialog,
                          icon: const Icon(Icons.delete_forever),
                          label: Text(locale.t('profileForm.deleteAccount')),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.error600,
                            side: const BorderSide(color: AppColors.error600),
                          ),
                        ),
                      ),
                    ],
                  ),
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
                  backgroundImage:
                      hasPhoto ? NetworkImage(avatarUrl!) : null,
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

class _Card extends StatelessWidget {
  const _Card({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderPrimary),
      ),
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
