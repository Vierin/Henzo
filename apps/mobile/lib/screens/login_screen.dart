import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import '../widgets/common/henzo_modal.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../screens/registration_role_screen.dart';
import '../services/auth_service.dart';
import '../utils/auth_ui_result.dart';
import '../utils/show_api_error.dart';
import '../widgets/auth/apple_sign_in_button.dart';
import '../widgets/auth/auth_form_styles.dart';
import '../widgets/language_selector_modal.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isSubmitting = false;
  bool _isGoogleLoading = false;
  bool _isAppleLoading = false;

  bool get _isOAuthBusy => _isGoogleLoading || _isAppleLoading;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    final auth = context.read<AuthService>();
    final result = await auth.login(
      _emailController.text.trim(),
      _passwordController.text,
    );

    if (!mounted) return;

    setState(() => _isSubmitting = false);

    final locale = context.read<LocaleProvider>();
    if (result.success) {
      showSuccess(context, locale.t('auth.signInSuccess'));
    } else {
      final msg = resolveAuthUiMessage(locale, result);
      showApiError(
        context,
        msg.isNotEmpty ? msg : locale.t('auth.signInError'),
      );
    }
  }

  Future<void> _submitGoogle() async {
    setState(() => _isGoogleLoading = true);

    final auth = context.read<AuthService>();
    final result = await auth.loginWithGoogle();

    if (!mounted) return;

    setState(() => _isGoogleLoading = false);

    final locale = context.read<LocaleProvider>();
    if (result.success) {
      showSuccess(context, locale.t('auth.signInSuccess'));
    } else {
      final msg = resolveAuthUiMessage(locale, result);
      if (msg.isNotEmpty) {
        showApiError(context, msg);
      } else {
        showApiError(context, locale.t('auth.signInError'));
      }
    }
  }

  Future<void> _submitApple() async {
    setState(() => _isAppleLoading = true);

    final auth = context.read<AuthService>();
    final result = await auth.loginWithApple();

    if (!mounted) return;

    setState(() => _isAppleLoading = false);

    final locale = context.read<LocaleProvider>();
    if (result.success) {
      showSuccess(context, locale.t('auth.signInSuccess'));
    } else {
      final msg = resolveAuthUiMessage(locale, result);
      if (msg.isNotEmpty) {
        showApiError(context, msg);
      } else {
        showApiError(context, locale.t('auth.signInError'));
      }
    }
  }

  Future<void> _openRegister() async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const RegistrationRoleScreen()),
    );
  }

  Future<void> _showForgotPassword() async {
    final locale = context.read<LocaleProvider>();
    final emailController = TextEditingController(text: _emailController.text);
    final formKey = GlobalKey<FormState>();
    if (!mounted) return;
    await showHenzoDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        title: Text(locale.t('auth.forgotPassword')),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                locale.t('auth.resetPasswordHint'),
                style: TextStyle(color: Colors.grey.shade700, fontSize: 14.sp),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  labelText: locale.t('auth.email'),
                  border: const OutlineInputBorder(),
                ),
                validator: (v) {
                  if (v == null || v.isEmpty) return locale.t('auth.enterEmail');
                  if (!v.contains('@')) return locale.t('auth.invalidEmail');
                  return null;
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(locale.t('common.cancel')),
          ),
          FilledButton(
            onPressed: () async {
              if (!(formKey.currentState?.validate() ?? false)) return;
              final auth = context.read<AuthService>();
              final res = await auth.requestPasswordReset(emailController.text);
              if (!ctx.mounted) return;
              Navigator.of(ctx).pop();
              if (!mounted) return;
              final loc = context.read<LocaleProvider>();
              if (res.success) {
                showSuccess(context, loc.t('auth.resetEmailSent'));
              } else {
                showApiError(
                  context,
                  resolveAuthUiMessage(loc, res),
                );
              }
            },
            child: Text(locale.t('auth.sendResetLink')),
          ),
        ],
      ),
    );
  }

  static const Map<String, String> _languageLabels = {
    'en': 'English',
    'ru': 'Русский',
    'vi': 'Tiếng Việt',
  };

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Scaffold(
      body: SafeArea(
        child: Consumer<LocaleProvider>(
          builder: (context, locale, _) => SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Align(
                    alignment: Alignment.centerRight,
                    child: InkWell(
                      onTap: () => showLanguageSelectorModal(context, locale),
                      borderRadius: BorderRadius.circular(8),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 6,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.language,
                              size: 16,
                              color: AppColors.textPrimary,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              _languageLabels[locale.localeCode] ??
                                  locale.localeCode.toUpperCase(),
                              style: TextStyle(
                                fontSize: 14.sp,
                                fontWeight: FontWeight.w400,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 64),
                  Center(
                    child: Image.asset(
                      'assets/logo.png',
                      height: 60,
                      fit: BoxFit.contain,
                      errorBuilder: (_, _, _) => Text(
                        'Henzo',
                        style: TextStyle(
                          fontSize: 44.sp,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 56),
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
                      if (v == null || v.isEmpty) return locale.t('auth.enterEmail');
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
                        icon: Icon(
                          _obscurePassword
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                          color: AuthFormStyles.hintMuted,
                          size: 22,
                        ),
                        padding: const EdgeInsets.only(right: 12),
                        onPressed: () {
                          setState(() => _obscurePassword = !_obscurePassword);
                        },
                      ),
                    ),
                    style: AuthFormStyles.fieldTextStyle,
                    validator: (v) {
                      if (v == null || v.isEmpty) return locale.t('auth.enterPassword');
                      if (v.length < 6) return locale.t('auth.passwordMin');
                      return null;
                    },
                  ),
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: (_isSubmitting || _isOAuthBusy)
                          ? null
                          : _showForgotPassword,
                      style: TextButton.styleFrom(
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        minimumSize: Size.zero,
                        padding: const EdgeInsets.symmetric(horizontal: 0),
                      ),
                      child: Text(
                        locale.t('auth.forgotPassword'),
                        style: TextStyle(
                          color: AppColors.primary500,
                          fontSize: 14.sp,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    height: AuthFormStyles.buttonHeight,
                    child: FilledButton(
                      onPressed: _isSubmitting ? null : _submit,
                      style: AuthFormStyles.primaryButtonStyle(),
                      child: _isSubmitting
                          ? SizedBox(
                              height: 22,
                              width: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : Text(
                              locale.t('auth.signIn'),
                              style: textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w600,
                                color: AppColors.textInverse,
                                fontSize: 16.sp,
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed:
                        (_isSubmitting || _isOAuthBusy) ? null : _openRegister,
                    style: TextButton.styleFrom(
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      minimumSize: Size.zero,
                    ),
                    child: Text(
                      context.read<LocaleProvider>().t('auth.noAccountRegister'),
                      style: TextStyle(
                        color: AppColors.primary500,
                        fontSize: 14.sp,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Expanded(
                        child: Divider(
                          color: Color(0xFF9B9B9B),
                          thickness: 1.0,
                          indent: 24,
                          endIndent: 12,
                        ),
                      ),
                      Text(
                        locale.t('auth.orContinue').toLowerCase(),
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 15.sp,
                        ),
                      ),
                      const Expanded(
                        child: Divider(
                          color: Color(0xFF9B9B9B),
                          thickness: 1.0,
                          indent: 12,
                          endIndent: 24,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    height: AuthFormStyles.buttonHeight,
                    child: OutlinedButton.icon(
                      onPressed: (_isSubmitting || _isOAuthBusy)
                          ? null
                          : _submitGoogle,
                      icon: _isGoogleLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : _buildGoogleIcon(),
                      label: Text(
                        _isGoogleLoading
                            ? locale.t('common.loading')
                            : locale.t('auth.continueWithGoogle'),
                        style: TextStyle(
                          fontSize: 16.sp,
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
                      isLoading: _isAppleLoading,
                      onPressed: (_isSubmitting || _isOAuthBusy)
                          ? null
                          : _submitApple,
                      label: _isAppleLoading
                          ? locale.t('common.loading')
                          : locale.t('auth.continueWithApple'),
                    ),
                  ],
                  const SizedBox(height: 8),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildGoogleIcon() {
    return Image.asset(
      'assets/public/icon-google.png',
      width: 20,
      height: 20,
      fit: BoxFit.contain,
      errorBuilder: (_, _, _) => const Icon(
        Icons.g_mobiledata_rounded,
        size: 20,
        color: Color(0xFF4285F4),
      ),
    );
  }
}
