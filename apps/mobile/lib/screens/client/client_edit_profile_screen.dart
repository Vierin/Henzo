import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../services/auth_service.dart';
import '../../services/owner_photo_storage_service.dart';
import '../../utils/auth_ui_result.dart';
import '../../utils/form_validators.dart';
import '../../utils/owner_image_picker.dart';
import '../../utils/owner_navigation_restore.dart';
import '../../widgets/auth/auth_form_styles.dart';
import '../../widgets/settings/account_profile_form_widgets.dart';
import '../../widgets/settings/settings_header_back_button.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

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
          SnackBar(content: Text(context.read<LocaleProvider>().t('common.signInToUploadPhoto'))),
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
          SnackBar(
            content: Text(locale.t(upload.error ?? 'errors.generic')),
          ),
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
    final initials = user != null
        ? _initials(_fullName.isNotEmpty ? _fullName : user.name, user.email)
        : '?';

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
          locale.t('profileForm.personalData'),
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
                        controller: _firstNameController,
                        textCapitalization: TextCapitalization.words,
                        style: AuthFormStyles.fieldTextStyle,
                        decoration: AuthFormStyles.fieldDecoration(
                          hintText: locale.t('profileForm.firstName'),
                        ),
                        validator: (v) => validateRequiredNullable(
                          locale.t,
                          v,
                          emptyKey: 'profileForm.enterName',
                        ),
                      ),
                      const SizedBox(height: AuthFormStyles.fieldGap),
                      TextFormField(
                        controller: _lastNameController,
                        textCapitalization: TextCapitalization.words,
                        style: AuthFormStyles.fieldTextStyle,
                        decoration: AuthFormStyles.fieldDecoration(
                          hintText: locale.t('profileForm.lastName'),
                        ),
                      ),
                      const SizedBox(height: AuthFormStyles.fieldGap),
                      TextFormField(
                        controller: _emailController,
                        readOnly: true,
                        enableInteractiveSelection: true,
                        style: AuthFormStyles.fieldTextStyle.copyWith(
                          color: AppColors.textSecondary,
                        ),
                        decoration: AuthFormStyles.fieldDecoration(
                          hintText: locale.t('profileForm.email'),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.only(top: 6, left: 4),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            locale.t('profileForm.emailReadOnlyHint'),
                            style: TextStyle(
                              fontSize: 12.sp,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      AccountPrimaryButton(
                        label: locale.t('common.save'),
                        isLoading: _savingProfile,
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
                        isLoading: _savingPassword,
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
