import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../services/auth_service.dart';
import '../utils/show_api_error.dart';

class BusinessRegistrationScreen extends StatefulWidget {
  const BusinessRegistrationScreen({super.key});

  @override
  State<BusinessRegistrationScreen> createState() =>
      _BusinessRegistrationScreenState();
}

class _BusinessRegistrationScreenState
    extends State<BusinessRegistrationScreen> {
  static const _placeholderMuted = Color(0x993F3F3F);
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _isSubmitting = false;
  bool _isGoogleSubmitting = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    final locale = context.read<LocaleProvider>();
    final auth = context.read<AuthService>();
    final result = await auth.requestBusinessRegistration(
      name: _nameController.text.trim(),
      email: _emailController.text.trim(),
      password: _passwordController.text,
      locale: locale.languageTag,
    );

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (result.success) {
      showSuccess(context, locale.t('auth.businessRegisterSuccess'));
      Navigator.of(context).pop();
      return;
    }

    showApiError(
      context,
      result.errorRaw?.isNotEmpty == true
          ? result.errorRaw!
          : locale.t('auth.businessRegisterError'),
    );
  }

  Future<void> _registerWithGoogle() async {
    setState(() => _isGoogleSubmitting = true);
    final locale = context.read<LocaleProvider>();
    final auth = context.read<AuthService>();
    final result = await auth.loginWithGoogle();

    if (!mounted) return;
    setState(() => _isGoogleSubmitting = false);

    if (result.success) {
      showSuccess(context, locale.t('auth.signInSuccess'));
      Navigator.of(context).pop();
      return;
    }

    showApiError(
      context,
      result.errorRaw?.isNotEmpty == true
          ? result.errorRaw!
          : locale.t('auth.businessRegisterError'),
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final textTheme = Theme.of(context).textTheme;
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 8),
                Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(
                        Icons.arrow_back,
                        color: AppColors.textPrimary,
                        size: 22,
                      ),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(
                        minWidth: 30,
                        minHeight: 30,
                      ),
                      splashRadius: 22,
                    ),
                    const Text(
                      'Business registration',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textPrimary,
                        height: 1.05,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Padding(
                  padding: EdgeInsets.only(left: 44),
                  child: Text(
                    'Create yous business account \n to managebookings in Henzo',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w400,
                      color: AppColors.textPrimary,
                      height: 1.2,
                    ),
                  ),
                ),
                const SizedBox(height: 44),
                TextFormField(
                  controller: _nameController,
                  textInputAction: TextInputAction.next,
                  decoration: _roundedInputDecoration(
                    hintText: locale.t('auth.businessName'),
                    prefixIcon: Icons.person_outline_rounded,
                  ),
                  style: const TextStyle(
                    fontSize: 19,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  decoration: _roundedInputDecoration(
                    hintText: locale.t('auth.email'),
                    prefixIcon: Icons.email_rounded,
                  ),
                  style: const TextStyle(
                    fontSize: 19,
                    color: AppColors.textPrimary,
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) {
                      return locale.t('auth.enterEmail');
                    }
                    if (!v.contains('@')) {
                      return locale.t('auth.invalidEmail');
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  textInputAction: TextInputAction.next,
                  decoration: _roundedInputDecoration(
                    hintText: locale.t('auth.password'),
                    prefixIcon: Icons.lock_rounded,
                    suffixIcon: IconButton(
                      padding: const EdgeInsets.only(right: 12),
                      onPressed: () {
                        setState(() => _obscurePassword = !_obscurePassword);
                      },
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                        color: _placeholderMuted,
                      ),
                    ),
                  ),
                  style: const TextStyle(
                    fontSize: 19,
                    color: AppColors.textPrimary,
                  ),
                  validator: (v) {
                    if (v == null || v.isEmpty) {
                      return locale.t('auth.enterPassword');
                    }
                    if (v.length < 6) {
                      return locale.t('auth.passwordMin');
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _confirmPasswordController,
                  obscureText: _obscureConfirmPassword,
                  textInputAction: TextInputAction.done,
                  onFieldSubmitted: (_) => _submit(),
                  decoration: _roundedInputDecoration(
                    hintText: locale.t('auth.confirmPassword'),
                    prefixIcon: Icons.lock_rounded,
                    suffixIcon: IconButton(
                      padding: const EdgeInsets.only(right: 12),
                      onPressed: () {
                        setState(
                          () => _obscureConfirmPassword =
                              !_obscureConfirmPassword,
                        );
                      },
                      icon: Icon(
                        _obscureConfirmPassword
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                        color: _placeholderMuted,
                      ),
                    ),
                  ),
                  style: const TextStyle(
                    fontSize: 19,
                    color: AppColors.textPrimary,
                  ),
                  validator: (v) {
                    if (v == null || v.isEmpty) {
                      return locale.t('auth.enterPassword');
                    }
                    if (v != _passwordController.text) {
                      return locale.t('auth.passwordsDontMatch');
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 30),
                SizedBox(
                  height: 60,
                  child: FilledButton(
                    onPressed: (_isSubmitting || _isGoogleSubmitting)
                        ? null
                        : _submit,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary500,
                      foregroundColor: AppColors.textInverse,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(
                            'Create account',
                            style: textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w600,
                              fontSize: 16,
                              color: AppColors.textInverse,
                            ),
                          ),
                  ),
                ),
                const SizedBox(height: 22),
                Row(
                  children: [
                    const Expanded(
                      child: Divider(
                        color: Color(0xFF9B9B9B),
                        thickness: 1,
                        indent: 14,
                        endIndent: 10,
                      ),
                    ),
                    Text(
                      locale.t('auth.orContinue'),
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 15,
                      ),
                    ),
                    const Expanded(
                      child: Divider(
                        color: Color(0xFF9B9B9B),
                        thickness: 1,
                        indent: 10,
                        endIndent: 14,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 22),
                SizedBox(
                  height: 60,
                  child: OutlinedButton.icon(
                    onPressed: (_isSubmitting || _isGoogleSubmitting)
                        ? null
                        : _registerWithGoogle,
                    icon: _isGoogleSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : _buildGoogleIcon(),
                    label: Text(
                      locale.t('auth.continueWithGoogle'),
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: AppColors.backgroundPrimary,
                      side: BorderSide.none,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _roundedInputDecoration({
    required String hintText,
    required IconData prefixIcon,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      hintText: hintText,
      hintStyle: const TextStyle(
        color: _placeholderMuted,
        fontSize: 16,
        fontWeight: FontWeight.w600,
      ),
      prefixIcon: Padding(
        padding: const EdgeInsets.only(left: 22, right: 8),
        child: Icon(prefixIcon, color: _placeholderMuted, size: 20),
      ),
      prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
      suffixIcon: suffixIcon,
      filled: true,
      fillColor: AppColors.backgroundPrimary,
      contentPadding: const EdgeInsets.only(top: 18, bottom: 18, right: 18),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(999),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(999),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(999),
        borderSide: const BorderSide(color: AppColors.primary500, width: 1.2),
      ),
    );
  }

  Widget _buildGoogleIcon() {
    return Image.asset(
      'assets/public/icon-google.png',
      width: 20,
      height: 20,
      fit: BoxFit.contain,
      errorBuilder: (_, __, ___) => const Icon(
        Icons.g_mobiledata_rounded,
        size: 20,
        color: Color(0xFF4285F4),
      ),
    );
  }
}
