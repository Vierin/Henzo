import 'dart:async';
import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../services/auth_service.dart';
import '../utils/auth_ui_result.dart';
import '../utils/show_api_error.dart';
import '../widgets/auth/apple_sign_in_button.dart';
import '../widgets/auth/auth_form_styles.dart';
import '../widgets/legal/legal_agreement_footer.dart';
import '../widgets/settings/branded_settings_app_bar.dart';

class BusinessRegistrationScreen extends StatefulWidget {
  const BusinessRegistrationScreen({super.key});

  @override
  State<BusinessRegistrationScreen> createState() =>
      _BusinessRegistrationScreenState();
}

class _BusinessRegistrationScreenState
    extends State<BusinessRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _otpController = TextEditingController();
  bool _obscurePassword = true;
  bool _isSubmitting = false;
  bool _isGoogleSubmitting = false;
  bool _isAppleSubmitting = false;
  bool _isVerificationStep = false;

  bool get _isOAuthBusy => _isGoogleSubmitting || _isAppleSubmitting;
  bool _isVerifyingCode = false;
  bool _isResendingCode = false;
  int _resendSecondsLeft = 0;
  bool _agreedToTerms = false;
  Timer? _resendTimer;
  final FocusNode _otpFocusNode = FocusNode();

  @override
  void dispose() {
    _resendTimer?.cancel();
    _fullNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _otpController.dispose();
    _otpFocusNode.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_agreedToTerms) {
      showApiError(context, context.read<LocaleProvider>().t('legal.mustAgree'));
      return;
    }

    setState(() => _isSubmitting = true);
    final locale = context.read<LocaleProvider>();
    final auth = context.read<AuthService>();
    final result = await auth.requestBusinessRegistration(
      name: _fullNameController.text.trim(),
      email: _emailController.text.trim(),
      password: _passwordController.text,
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
          : locale.t('auth.businessRegisterError'),
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
      showApiError(context, locale.t('auth.enterOtpCode'));
      return;
    }
    setState(() => _isVerifyingCode = true);
    final auth = context.read<AuthService>();
    final result = await auth.verifyBusinessRegistrationCode(
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
          : locale.t('auth.businessRegisterError'),
    );
  }

  Future<void> _resendCode() async {
    if (_resendSecondsLeft > 0 || _isResendingCode) return;
    setState(() => _isResendingCode = true);
    final auth = context.read<AuthService>();
    final locale = context.read<LocaleProvider>();
    final result = await auth.requestBusinessRegistration(
      name: _fullNameController.text.trim(),
      email: _emailController.text.trim(),
      password: _passwordController.text,
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
          : locale.t('auth.businessRegisterError'),
    );
  }

  Future<void> _registerWithGoogle() async {
    if (!_agreedToTerms) {
      showApiError(context, context.read<LocaleProvider>().t('legal.mustAgree'));
      return;
    }
    setState(() => _isGoogleSubmitting = true);
    final locale = context.read<LocaleProvider>();
    final auth = context.read<AuthService>();
    final result = await auth.loginWithGoogle(registerAsOwner: true);

    if (!mounted) return;
    setState(() => _isGoogleSubmitting = false);

    if (result.success) {
      showSuccess(context, locale.t('auth.signInSuccess'));
      Navigator.of(context).popUntil((route) => route.isFirst);
      return;
    }

    showApiError(
      context,
      resolveAuthUiMessage(
        locale,
        result,
        fallbackKey: 'auth.businessRegisterError',
      ),
    );
  }

  Future<void> _registerWithApple() async {
    if (!_agreedToTerms) {
      showApiError(context, context.read<LocaleProvider>().t('legal.mustAgree'));
      return;
    }
    setState(() => _isAppleSubmitting = true);
    final locale = context.read<LocaleProvider>();
    final auth = context.read<AuthService>();
    final result = await auth.loginWithApple(registerAsOwner: true);

    if (!mounted) return;
    setState(() => _isAppleSubmitting = false);

    if (result.success) {
      showSuccess(context, locale.t('auth.signInSuccess'));
      Navigator.of(context).popUntil((route) => route.isFirst);
      return;
    }

    showApiError(
      context,
      resolveAuthUiMessage(
        locale,
        result,
        fallbackKey: 'auth.businessRegisterError',
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final textTheme = Theme.of(context).textTheme;
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: buildBrandedSettingsAppBar(
        context,
        title: _isVerificationStep
            ? locale.t('auth.verificationCodeTitle')
            : locale.t('auth.businessRegisterTitle'),
        onBack: _isVerificationStep
            ? () {
                setState(() {
                  _isVerificationStep = false;
                  _otpController.clear();
                });
              }
            : null,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
        child: _isVerificationStep
            ? _buildVerificationStep(locale, textTheme)
            : _buildFormStep(locale, textTheme),
      ),
    );
  }

  Widget _buildFormStep(LocaleProvider locale, TextTheme textTheme) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 24),
          TextFormField(
            controller: _fullNameController,
            textInputAction: TextInputAction.next,
            textCapitalization: TextCapitalization.words,
            decoration: AuthFormStyles.fieldDecoration(
              hintText: locale.t('auth.fullName'),
              prefixIcon: Icons.person_outline_rounded,
            ),
            style: AuthFormStyles.fieldTextStyle,
            validator: (v) {
              if (v == null || v.trim().isEmpty) {
                return locale.t('auth.enterFullName');
              }
              return null;
            },
          ),
          const SizedBox(height: AuthFormStyles.fieldGap),
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            decoration: AuthFormStyles.fieldDecoration(
              hintText: locale.t('auth.email'),
              prefixIcon: Icons.email_rounded,
            ),
            style: AuthFormStyles.fieldTextStyle,
            validator: (v) {
              if (v == null || v.trim().isEmpty) {
                return locale.t('auth.enterEmail');
              }
              if (!v.contains('@')) return locale.t('auth.invalidEmail');
              return null;
            },
          ),
          const SizedBox(height: AuthFormStyles.fieldGap),
          TextFormField(
            controller: _passwordController,
            obscureText: _obscurePassword,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _submit(),
            decoration: AuthFormStyles.fieldDecoration(
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
                  color: AuthFormStyles.hintMuted,
                ),
              ),
            ),
            style: AuthFormStyles.fieldTextStyle,
            validator: (v) {
              if (v == null || v.isEmpty) return locale.t('auth.enterPassword');
              if (v.length < 6) return locale.t('auth.passwordMin');
              return null;
            },
          ),
          const SizedBox(height: 16),
          LegalAgreementCheckbox(
            value: _agreedToTerms,
            onChanged: (v) => setState(() => _agreedToTerms = v ?? false),
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: AuthFormStyles.buttonHeight,
            child: FilledButton(
              onPressed: (_isSubmitting || _isOAuthBusy) ? null : _submit,
              style: AuthFormStyles.primaryButtonStyle(),
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
            height: AuthFormStyles.buttonHeight,
            child: OutlinedButton.icon(
              onPressed: (_isSubmitting || _isOAuthBusy)
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
              style: AuthFormStyles.googleButtonStyle(),
            ),
          ),
          if (Platform.isIOS) ...[
            const SizedBox(height: 8),
            AppleSignInButton(
              isLoading: _isAppleSubmitting,
              onPressed:
                  (_isSubmitting || _isOAuthBusy) ? null : _registerWithApple,
              label: locale.t('auth.continueWithApple'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildVerificationStep(LocaleProvider locale, TextTheme textTheme) {
    final email = _emailController.text.trim();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 24),
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
                            padding:
                                EdgeInsets.only(right: index == 5 ? 0 : 8),
                            child: Container(
                              height: 58,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: AppColors.backgroundSecondary,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: AppColors.borderPrimary,
                                ),
                              ),
                              child: Text(
                                index < _otpController.text.length
                                    ? _otpController.text[index]
                                    : '',
                                style: const TextStyle(
                                  fontSize: 24,
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
                SizedBox(
                  height: AuthFormStyles.buttonHeight,
                  child: FilledButton(
                    onPressed: _isVerifyingCode ? null : _verifyCode,
                    style: AuthFormStyles.primaryButtonStyle(),
                    child: _isVerifyingCode
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(
                            locale.t('common.verify'),
                            style: textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w600,
                              fontSize: 16,
                              color: AppColors.textInverse,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        if (_resendSecondsLeft > 0)
          Text(
            '${locale.t('auth.resendCodeIn')} 00:${_resendSecondsLeft.toString().padLeft(2, '0')}',
            style: const TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          )
        else
          Center(
            child: Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(
                  locale.t('auth.didntReceiveCode'),
                  style: const TextStyle(
                    fontSize: 14,
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
                      : Text(
                          locale.t('auth.resend'),
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary500,
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
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textTertiary,
            ),
          ),
        ),
      ],
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
