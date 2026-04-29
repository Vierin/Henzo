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

class _BusinessRegistrationScreenState extends State<BusinessRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _isSubmitting = false;
  bool _isGoogleSubmitting = false;

  @override
  void dispose() {
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
    return Scaffold(
      appBar: AppBar(
        title: Text(locale.t('auth.businessRegisterTitle')),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  locale.t('auth.businessRegisterSubtitle'),
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 20),
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  decoration: InputDecoration(
                    labelText: locale.t('auth.email'),
                    border: const OutlineInputBorder(),
                    prefixIcon: const Icon(Icons.email_outlined),
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
                  decoration: InputDecoration(
                    labelText: locale.t('auth.password'),
                    border: const OutlineInputBorder(),
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      onPressed: () {
                        setState(() => _obscurePassword = !_obscurePassword);
                      },
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                      ),
                    ),
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
                  decoration: InputDecoration(
                    labelText: locale.t('auth.confirmPassword'),
                    border: const OutlineInputBorder(),
                    prefixIcon: const Icon(Icons.lock_person_outlined),
                    suffixIcon: IconButton(
                      onPressed: () {
                        setState(
                          () => _obscureConfirmPassword = !_obscureConfirmPassword,
                        );
                      },
                      icon: Icon(
                        _obscureConfirmPassword
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                      ),
                    ),
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
                const SizedBox(height: 20),
                FilledButton(
                  onPressed:
                      (_isSubmitting || _isGoogleSubmitting) ? null : _submit,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary500,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(locale.t('auth.createBusinessAccount')),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed:
                      (_isSubmitting || _isGoogleSubmitting)
                          ? null
                          : _registerWithGoogle,
                  icon:
                      _isGoogleSubmitting
                          ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                          : const Icon(Icons.login),
                  label: Text(locale.t('auth.continueWithGoogle')),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
