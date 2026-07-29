import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import '../widgets/common/henzo_modal.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/auth_error_keys.dart';
import '../l10n/locale_provider.dart';
import '../screens/registration_role_screen.dart';
import '../services/auth_service.dart';
import '../services/studio_claim_api_service.dart';
import '../utils/auth_ui_result.dart';
import '../utils/form_validators.dart';
import '../utils/show_api_error.dart';
import '../utils/studio_claim_pending.dart';
import '../widgets/auth/apple_sign_in_button.dart';
import '../widgets/auth/auth_form_styles.dart';
import '../widgets/auth/auth_form_text_field.dart';
import '../widgets/language_selector_modal.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flutter_svg/flutter_svg.dart';

enum _LoginStep { email, password }

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
  _LoginStep _step = _LoginStep.email;
  String? _linkedStudioName;
  String? _pendingClaimToken;

  bool get _isOAuthBusy => _isGoogleLoading || _isAppleLoading;

  @override
  void initState() {
    super.initState();
    _hydratePendingClaim();
  }

  Future<void> _hydratePendingClaim() async {
    final email = await StudioClaimPending.readEmail();
    final studioName = await StudioClaimPending.readStudioName();
    final token = await StudioClaimPending.readToken();
    if (!mounted) return;
    if (email != null && email.isNotEmpty) {
      _emailController.text = email;
    }
    setState(() {
      _linkedStudioName = studioName;
      _pendingClaimToken = token;
      if (email != null && email.isNotEmpty && studioName != null) {
        _step = _LoginStep.password;
      }
    });
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _continueFromEmail() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSubmitting = true);
    final email = _emailController.text.trim();
    String? studioName = await StudioClaimPending.readStudioName();
    final token = await StudioClaimPending.readToken();
    try {
      final lookup = await StudioClaimApiService.lookupByEmail(email);
      if (lookup['hasUnclaimedStudio'] == true) {
        studioName = lookup['studioName'] as String? ?? studioName;
      }
    } catch (_) {
      // Lookup is best-effort; password step still works.
    }
    if (!mounted) return;
    setState(() {
      _isSubmitting = false;
      _linkedStudioName = studioName;
      _pendingClaimToken = token;
      _step = _LoginStep.password;
    });
  }

  Future<void> _submitPassword() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    final auth = context.read<AuthService>();
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    final claimToken =
        _pendingClaimToken ?? await StudioClaimPending.readToken();

    final AuthUiResult result;
    if (claimToken != null && claimToken.isNotEmpty) {
      result = await auth.completeStudioClaimLogin(
        email: email,
        password: password,
        claimToken: claimToken,
      );
    } else {
      result = await auth.login(email, password);
    }

    if (!mounted) return;

    setState(() => _isSubmitting = false);

    final locale = context.read<LocaleProvider>();
    if (result.success) {
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

    _handleOAuthResult(result, OAuthEntryProvider.google);
  }

  Future<void> _submitApple() async {
    setState(() => _isAppleLoading = true);

    final auth = context.read<AuthService>();
    final result = await auth.loginWithApple();

    if (!mounted) return;
    setState(() => _isAppleLoading = false);

    _handleOAuthResult(result, OAuthEntryProvider.apple);
  }

  /// Google/Apple sign-in landed a Supabase session but no account exists in our
  /// system yet (`ACCOUNT_NOT_FOUND`). Rather than dead-ending on an error —
  /// which would also leave an orphaned Supabase auth user that later blocks
  /// email registration — send the new user to the role picker, where the
  /// "Sign up with Google/Apple" button provisions the account with the role
  /// they choose (OWNER or CLIENT).
  void _handleOAuthResult(AuthUiResult result, OAuthEntryProvider provider) {
    if (!mounted) return;
    if (result.success) return;

    final locale = context.read<LocaleProvider>();
    if (result.errorL10nKey == AuthErrorKeys.accountNotFoundForEmail) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(content: Text(locale.t('auth.noAccountChooseRegistration'))),
      );
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => RegistrationRoleScreen(oauthProvider: provider),
        ),
      );
      return;
    }

    final msg = resolveAuthUiMessage(locale, result);
    showApiError(context, msg.isNotEmpty ? msg : locale.t('auth.signInError'));
  }

  Future<void> _openRegister() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const RegistrationRoleScreen()));
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
              AuthFormTextField(
                controller: emailController,
                keyboardType: TextInputType.emailAddress,
                decorationBuilder: ({required invalid}) =>
                    AuthFormStyles.fieldDecoration(
                      hintText: locale.t('auth.email'),
                      prefixWidget: SvgPicture.asset(
                        'assets/icons/icon-mail.svg',
                        width: 13.5,
                        height: 13.5,
                        colorFilter: const ColorFilter.mode(
                          AuthFormStyles.accentIcon,
                          BlendMode.srcIn,
                        ),
                      ),
                      invalid: invalid,
                    ),
                style: AuthFormStyles.fieldTextStyle,
                validator: (v) => validateEmailNullable(locale.t, v),
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
                showApiError(context, resolveAuthUiMessage(loc, res));
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
    final isEmailStep = _step == _LoginStep.email;
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
                            SvgPicture.asset(
                              'assets/icons/icon-globe.svg',
                              width: 16,
                              height: 16,
                              colorFilter: const ColorFilter.mode(
                                AppColors.textPrimary,
                                BlendMode.srcIn,
                              ),
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
                  const SizedBox(height: 75),
                  Center(
                    child: Image.asset(
                      'assets/logo.png',
                      height: 58,
                      fit: BoxFit.contain,
                      errorBuilder: (_, _, _) => Text(
                        'Henzo',
                        style: TextStyle(
                          fontSize: 39.6.sp,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 48),
                  if (!isEmailStep) ...[
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton.icon(
                        onPressed: _isSubmitting
                            ? null
                            : () => setState(() {
                                  _step = _LoginStep.email;
                                  _passwordController.clear();
                                }),
                        icon: const Icon(Icons.arrow_back, size: 18),
                        label: Text(locale.t('auth.changeEmail')),
                        style: TextButton.styleFrom(
                          foregroundColor: AppColors.textPrimary,
                          padding: EdgeInsets.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (_linkedStudioName != null &&
                        _linkedStudioName!.isNotEmpty) ...[
                      Text(
                        locale
                            .t('auth.studioLinkedToEmail')
                            .replaceAll('{studioName}', _linkedStudioName!),
                        style: TextStyle(
                          fontSize: 15.sp,
                          height: 1.4,
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        locale.t('auth.enterPasswordToManageStudio'),
                        style: TextStyle(
                          fontSize: 14.sp,
                          height: 1.4,
                          color: Colors.grey.shade700,
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    Text(
                      _emailController.text.trim(),
                      style: TextStyle(
                        fontSize: 14.sp,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: AuthFormStyles.fieldGap),
                  ],
                  if (isEmailStep)
                    AuthFormTextField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      onFieldSubmitted: (_) => _continueFromEmail(),
                      decorationBuilder: ({required invalid}) =>
                          AuthFormStyles.fieldDecoration(
                            hintText: locale.t('auth.email'),
                            prefixWidget: SvgPicture.asset(
                              'assets/icons/icon-mail.svg',
                              width: 13.5,
                              height: 13.5,
                              colorFilter: const ColorFilter.mode(
                                AuthFormStyles.accentIcon,
                                BlendMode.srcIn,
                              ),
                            ),
                            invalid: invalid,
                          ),
                      style: AuthFormStyles.fieldTextStyle,
                      validator: (v) => validateEmailNullable(locale.t, v),
                    )
                  else
                    AuthFormTextField(
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) => _submitPassword(),
                      decorationBuilder: ({required invalid}) =>
                          AuthFormStyles.fieldDecoration(
                            hintText: locale.t('auth.password'),
                            prefixWidget: SvgPicture.asset(
                              'assets/icons/icon-password.svg',
                              width: 16,
                              height: 16,
                              colorFilter: const ColorFilter.mode(
                                AuthFormStyles.accentIcon,
                                BlendMode.srcIn,
                              ),
                            ),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword
                                    ? Icons.visibility_outlined
                                    : Icons.visibility_off_outlined,
                                color: AuthFormStyles.hintMuted,
                                size: 22,
                              ),
                              padding: const EdgeInsets.only(right: 12),
                              splashColor: Colors.transparent,
                              highlightColor: Colors.transparent,
                              onPressed: () {
                                setState(
                                  () => _obscurePassword = !_obscurePassword,
                                );
                              },
                            ),
                            invalid: invalid,
                          ),
                      style: AuthFormStyles.fieldTextStyle,
                      validator: (v) => validatePasswordNullable(locale.t, v),
                    ),
                  if (!isEmailStep) ...[
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
                  ],
                  const SizedBox(height: 24),
                  SizedBox(
                    height: AuthFormStyles.buttonHeight,
                    child: FilledButton(
                      onPressed: _isSubmitting
                          ? null
                          : (isEmailStep ? _continueFromEmail : _submitPassword),
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
                              isEmailStep
                                  ? locale.t('auth.continue')
                                  : locale.t('auth.signIn'),
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
                    onPressed: (_isSubmitting || _isOAuthBusy)
                        ? null
                        : _openRegister,
                    style: TextButton.styleFrom(
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      minimumSize: Size.zero,
                    ),
                    child: Text(
                      context.read<LocaleProvider>().t(
                        'auth.noAccountRegister',
                      ),
                      style: TextStyle(
                        color: AppColors.primary500,
                        fontSize: 14.sp,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ),
                  if (isEmailStep) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Expanded(
                          child: Divider(
                            color: Color(0xFF9B9B9B),
                            thickness: 1.0,
                            indent: 0,
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
                            endIndent: 0,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
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
      width: 25,
      height: 25,
      fit: BoxFit.contain,
      errorBuilder: (_, _, _) => const Icon(
        Icons.g_mobiledata_rounded,
        size: 20,
        color: Color(0xFF4285F4),
      ),
    );
  }
}
