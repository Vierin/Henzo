import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../services/auth_service.dart';
import '../utils/show_api_error.dart';

class ClientRegistrationScreen extends StatefulWidget {
  const ClientRegistrationScreen({super.key});

  @override
  State<ClientRegistrationScreen> createState() => _ClientRegistrationScreenState();
}

class _ClientRegistrationScreenState extends State<ClientRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _otpController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _isSubmitting = false;
  bool _isGoogleLoading = false;
  bool _isVerificationStep = false;
  bool _isVerifyingCode = false;
  bool _isResendingCode = false;
  int _resendSecondsLeft = 0;
  Timer? _resendTimer;
  final FocusNode _otpFocusNode = FocusNode();

  @override
  void dispose() {
    _resendTimer?.cancel();
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _otpController.dispose();
    _otpFocusNode.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSubmitting = true);
    final locale = context.read<LocaleProvider>();
    final auth = context.read<AuthService>();
    final result = await auth.requestClientRegistration(
      email: _emailController.text,
      password: _passwordController.text,
      name: _nameController.text,
      phone: _phoneController.text,
    );
    if (!mounted) return;
    setState(() => _isSubmitting = false);
    if (result.success) {
      setState(() {
        _isVerificationStep = true;
        _otpController.clear();
      });
      _startResendCountdown();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _otpFocusNode.requestFocus();
      });
      return;
    }
    showApiError(
      context,
      result.errorRaw?.isNotEmpty == true
          ? result.errorRaw!
          : locale.t('auth.signInError'),
    );
  }

  void _startResendCountdown() {
    _resendTimer?.cancel();
    setState(() => _resendSecondsLeft = 60);
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_resendSecondsLeft <= 1) {
        timer.cancel();
        setState(() => _resendSecondsLeft = 0);
        return;
      }
      setState(() => _resendSecondsLeft -= 1);
    });
  }

  Future<void> _verifyCode() async {
    final code = _otpController.text.trim();
    final locale = context.read<LocaleProvider>();
    if (code.length != 6) {
      showApiError(context, 'Enter 6-digit code');
      return;
    }
    setState(() => _isVerifyingCode = true);
    final auth = context.read<AuthService>();
    final result = await auth.verifyClientRegistrationCode(
      email: _emailController.text,
      code: code,
    );
    if (!mounted) return;
    setState(() => _isVerifyingCode = false);
    if (result.success) {
      showSuccess(context, locale.t('auth.signInSuccess'));
      Navigator.of(context).popUntil((route) => route.isFirst);
      return;
    }
    showApiError(
      context,
      result.errorRaw?.isNotEmpty == true
          ? result.errorRaw!
          : locale.t('auth.signInError'),
    );
  }

  Future<void> _resendCode() async {
    if (_resendSecondsLeft > 0 || _isResendingCode) return;
    setState(() => _isResendingCode = true);
    final auth = context.read<AuthService>();
    final locale = context.read<LocaleProvider>();
    final result = await auth.requestClientRegistration(
      email: _emailController.text,
      password: _passwordController.text,
      name: _nameController.text,
      phone: _phoneController.text,
    );
    if (!mounted) return;
    setState(() => _isResendingCode = false);
    if (result.success) {
      _startResendCountdown();
      return;
    }
    showApiError(
      context,
      result.errorRaw?.isNotEmpty == true
          ? result.errorRaw!
          : locale.t('auth.signInError'),
    );
  }

  Future<void> _submitGoogle() async {
    setState(() => _isGoogleLoading = true);
    final auth = context.read<AuthService>();
    final locale = context.read<LocaleProvider>();
    final result = await auth.loginWithGoogle();
    if (!mounted) return;
    setState(() => _isGoogleLoading = false);
    if (result.success) {
      showSuccess(context, locale.t('auth.signInSuccess'));
      Navigator.of(context).popUntil((route) => route.isFirst);
      return;
    }
    showApiError(
      context,
      result.errorRaw?.isNotEmpty == true
          ? result.errorRaw!
          : locale.t('auth.signInError'),
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('Client registration')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: _isVerificationStep
              ? _buildVerificationStep(locale)
              : _buildFormStep(locale),
        ),
      ),
    );
  }

  Widget _buildFormStep(LocaleProvider locale) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _nameController,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(
              labelText: 'Name',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.person_outline),
            ),
          ),
          const SizedBox(height: 12),
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
              if (v == null || v.trim().isEmpty) return locale.t('auth.enterEmail');
              if (!v.contains('@')) return locale.t('auth.invalidEmail');
              return null;
            },
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _phoneController,
            textInputAction: TextInputAction.next,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Phone',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.phone_outlined),
            ),
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
                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                icon: Icon(_obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
              ),
            ),
            validator: (v) {
              if (v == null || v.isEmpty) return locale.t('auth.enterPassword');
              if (v.length < 6) return locale.t('auth.passwordMin');
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
                onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                icon: Icon(_obscureConfirmPassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
              ),
            ),
            validator: (v) {
              if (v == null || v.isEmpty) return locale.t('auth.enterPassword');
              if (v != _passwordController.text) return locale.t('auth.passwordsDontMatch');
              return null;
            },
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: (_isSubmitting || _isGoogleLoading) ? null : _submit,
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary500,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            child: _isSubmitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Text('Create client account'),
          ),
          const SizedBox(height: 14),
          OutlinedButton.icon(
            onPressed: (_isSubmitting || _isGoogleLoading) ? null : _submitGoogle,
            icon: _isGoogleLoading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : _buildGoogleIcon(),
            label: Text(
              _isGoogleLoading ? 'Loading...' : 'Register with Google',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVerificationStep(LocaleProvider locale) {
    final email = _emailController.text.trim();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 28),
        const Text(
          'Verification code',
          style: TextStyle(
            fontSize: 40,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
            height: 1,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 12),
        Text(
          'We sent a 6-digit code to your email address.',
          style: const TextStyle(
            fontSize: 19,
            color: AppColors.textSecondary,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 26),
        GestureDetector(
          onTap: () => _otpFocusNode.requestFocus(),
          child: Container(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 16),
            decoration: BoxDecoration(
              color: AppColors.backgroundPrimary,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderPrimary),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Stack(
                  alignment: Alignment.center,
                  children: [
                    Opacity(
                      opacity: 0,
                      child: TextField(
                        controller: _otpController,
                        focusNode: _otpFocusNode,
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.done,
                        maxLength: 6,
                        autofocus: true,
                        onChanged: (_) => setState(() {}),
                        onSubmitted: (_) => _verifyCode(),
                      ),
                    ),
                    Row(
                      children: List.generate(
                        6,
                        (index) => Expanded(
                          child: Padding(
                            padding: EdgeInsets.only(right: index == 5 ? 0 : 8),
                            child: Container(
                              height: 58,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: AppColors.backgroundSecondary,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppColors.borderPrimary),
                              ),
                              child: Text(
                                index < _otpController.text.length
                                    ? _otpController.text[index]
                                    : '',
                                style: const TextStyle(
                                  fontSize: 30,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                FilledButton(
                  onPressed: _isVerifyingCode ? null : _verifyCode,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary500,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: _isVerifyingCode
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text(
                          'Verify',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                        ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        if (_resendSecondsLeft > 0)
          Text(
            'Resend code in 00:${_resendSecondsLeft.toString().padLeft(2, '0')}',
            style: const TextStyle(
              fontSize: 16,
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          )
        else
          Center(
            child: Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                const Text(
                  "Didn't receive the code? ",
                  style: TextStyle(
                    fontSize: 16,
                    color: AppColors.textSecondary,
                  ),
                ),
                TextButton(
                  onPressed: _isResendingCode ? null : _resendCode,
                  style: TextButton.styleFrom(
                    minimumSize: const Size(0, 28),
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: _isResendingCode
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text(
                          'Resend',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFFCC1224),
                          ),
                        ),
                ),
              ],
            ),
          ),
        const SizedBox(height: 8),
        Center(
          child: Text(
            email,
            style: const TextStyle(fontSize: 12, color: AppColors.textTertiary),
          ),
        ),
      ],
    );
  }

  Widget _buildGoogleIcon() {
    return Container(
      width: 18,
      height: 18,
      decoration: const BoxDecoration(
        color: Color(0xFF4285F4),
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: const Text(
        'G',
        style: TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
