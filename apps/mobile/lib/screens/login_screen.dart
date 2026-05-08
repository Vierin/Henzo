import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../screens/registration_role_screen.dart';
import '../services/auth_service.dart';
import '../utils/auth_ui_result.dart';
import '../utils/show_api_error.dart';
import '../widgets/language_selector_modal.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  static const _placeholderMuted = Color(0x993F3F3F);
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isSubmitting = false;
  bool _isGoogleLoading = false;

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
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(locale.t('auth.forgotPassword')),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                locale.t('auth.resetPasswordHint'),
                style: TextStyle(color: Colors.grey.shade700, fontSize: 14),
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
                              style: const TextStyle(
                                fontSize: 14,
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
                      errorBuilder: (_, __, ___) => const Text(
                        'Henzo',
                        style: TextStyle(
                          fontSize: 44,
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
                    decoration: InputDecoration(
                      hintText: locale.t('auth.email'),
                      hintStyle: const TextStyle(
                        color: _placeholderMuted,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                      prefixIcon: const Padding(
                        padding: EdgeInsets.only(left: 22, right: 8),
                        child: Icon(
                          Icons.email,
                          color: _placeholderMuted,
                          size: 20,
                        ),
                      ),
                      prefixIconConstraints: const BoxConstraints(
                        minWidth: 0,
                        minHeight: 0,
                      ),
                      filled: true,
                      fillColor: AppColors.backgroundPrimary,
                      contentPadding: const EdgeInsets.only(
                        top: 18,
                        bottom: 18,
                        right: 18,
                      ),
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
                        borderSide: const BorderSide(
                          color: AppColors.primary500,
                          width: 1.2,
                        ),
                      ),
                    ),
                    style: const TextStyle(
                      fontSize: 19,
                      color: AppColors.textPrimary,
                    ),
                    validator: (v) {
                      if (v == null || v.isEmpty) return locale.t('auth.enterEmail');
                      if (!v.contains('@')) return locale.t('auth.invalidEmail');
                      return null;
                    },
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    textInputAction: TextInputAction.done,
                    onFieldSubmitted: (_) => _submit(),
                    decoration: InputDecoration(
                      hintText: locale.t('auth.password'),
                      hintStyle: const TextStyle(
                        color: _placeholderMuted,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                      prefixIcon: const Padding(
                        padding: EdgeInsets.only(left: 22, right: 8),
                        child: Icon(
                          Icons.lock,
                          color: _placeholderMuted,
                          size: 20,
                        ),
                      ),
                      prefixIconConstraints: const BoxConstraints(
                        minWidth: 0,
                        minHeight: 0,
                      ),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                          color: _placeholderMuted,
                          size: 22,
                        ),
                        padding: EdgeInsets.only(right: 12),
                        onPressed: () {
                          setState(() => _obscurePassword = !_obscurePassword);
                        },
                      ),
                      filled: true,
                      fillColor: AppColors.backgroundPrimary,
                      contentPadding: const EdgeInsets.only(
                        top: 18,
                        bottom: 18,
                        right: 18,
                      ),
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
                        borderSide: const BorderSide(
                          color: AppColors.primary500,
                          width: 1.2,
                        ),
                      ),
                    ),
                    style: const TextStyle(
                      fontSize: 19,
                      color: AppColors.textPrimary,
                    ),
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
                      onPressed: (_isSubmitting || _isGoogleLoading)
                          ? null
                          : _showForgotPassword,
                      style: TextButton.styleFrom(
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        minimumSize: Size.zero,
                        padding: const EdgeInsets.symmetric(horizontal: 0),
                      ),
                      child: Text(
                        locale.t('auth.forgotPassword'),
                        style: const TextStyle(
                          color: AppColors.primary500,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    height: 50,
                    child: FilledButton(
                      onPressed: _isSubmitting ? null : _submit,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primary500,
                        foregroundColor: AppColors.textInverse,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
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
                                fontSize: 16,
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed:
                        (_isSubmitting || _isGoogleLoading) ? null : _openRegister,
                    style: TextButton.styleFrom(
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      minimumSize: Size.zero,
                    ),
                    child: const Text(
                      'No account? Register',
                      style: TextStyle(
                        color: AppColors.primary500,
                        fontSize: 14,
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
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 15,
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
                    height: 50,
                    child: OutlinedButton.icon(
                      onPressed: (_isSubmitting || _isGoogleLoading)
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
      errorBuilder: (_, __, ___) => const Icon(
        Icons.g_mobiledata_rounded,
        size: 20,
        color: Color(0xFF4285F4),
      ),
    );
  }
}
