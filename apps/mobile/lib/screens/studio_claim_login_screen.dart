import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../services/auth_service.dart';
import '../utils/auth_ui_result.dart';
import '../utils/form_validators.dart';
import '../utils/show_api_error.dart';
import '../utils/studio_claim_pending.dart';
import '../widgets/auth/auth_form_styles.dart';
import '../widgets/auth/auth_form_text_field.dart';
import '../widgets/settings/branded_settings_app_bar.dart';

/// Password step for claiming / managing an unclaimed studio linked to email.
/// Separate from [LoginScreen] so claim UX stays simple (no register / forgot).
class StudioClaimLoginScreen extends StatefulWidget {
  const StudioClaimLoginScreen({
    super.key,
    this.email,
    this.studioName,
    this.claimToken,
    this.onBackToLogin,
  });

  final String? email;
  final String? studioName;
  final String? claimToken;

  /// When this screen is root (AuthWrapper), back dismisses claim flow.
  final VoidCallback? onBackToLogin;

  @override
  State<StudioClaimLoginScreen> createState() => _StudioClaimLoginScreenState();
}

class _StudioClaimLoginScreenState extends State<StudioClaimLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isSubmitting = false;
  bool _loading = true;

  late String _email;
  late String _studioName;
  String? _claimToken;

  @override
  void initState() {
    super.initState();
    _hydrate();
  }

  Future<void> _hydrate() async {
    final email =
        widget.email?.trim() ?? (await StudioClaimPending.readEmail())?.trim();
    final studioName = widget.studioName?.trim() ??
        (await StudioClaimPending.readStudioName())?.trim();
    final token = widget.claimToken?.trim() ??
        (await StudioClaimPending.readToken())?.trim();

    if (!mounted) return;
    if (email == null ||
        email.isEmpty ||
        studioName == null ||
        studioName.isEmpty) {
      _handleBack();
      return;
    }

    setState(() {
      _email = email;
      _studioName = studioName;
      _claimToken = token;
      _loading = false;
    });
  }

  @override
  void dispose() {
    _passwordController.dispose();
    super.dispose();
  }

  void _handleBack() {
    if (_isSubmitting) return;
    if (widget.onBackToLogin != null) {
      widget.onBackToLogin!();
      return;
    }
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSubmitting = true);

    final auth = context.read<AuthService>();
    final claimToken =
        _claimToken ?? await StudioClaimPending.readToken();

    final AuthUiResult result;
    if (claimToken != null && claimToken.isNotEmpty) {
      result = await auth.completeStudioClaimLogin(
        email: _email,
        password: _passwordController.text,
        claimToken: claimToken,
      );
    } else {
      result = await auth.login(_email, _passwordController.text);
      if (result.success) {
        final access = auth.accessToken;
        if (access != null && access.isNotEmpty) {
          await StudioClaimPending.tryAccept(access);
        }
      }
    }

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    final locale = context.read<LocaleProvider>();
    if (!result.success) {
      final msg = resolveAuthUiMessage(locale, result);
      showApiError(
        context,
        msg.isNotEmpty ? msg : locale.t('auth.signInError'),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final textTheme = Theme.of(context).textTheme;

    if (_loading) {
      return const Scaffold(
        backgroundColor: AppColors.backgroundSecondary,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: buildBrandedSettingsAppBar(
        context,
        title: locale.t('auth.signIn'),
        onBack: _handleBack,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 24),
                Text(
                  locale
                      .t('auth.studioLinkedToEmail')
                      .replaceAll('{studioName}', _studioName),
                  style: TextStyle(
                    fontSize: 16.sp,
                    height: 1.4,
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
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
                const SizedBox(height: 20),
                Text(
                  _email,
                  style: TextStyle(
                    fontSize: 14.sp,
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: AuthFormStyles.fieldGap),
                AuthFormTextField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  textInputAction: TextInputAction.done,
                  onFieldSubmitted: (_) => _submit(),
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
                        setState(() => _obscurePassword = !_obscurePassword);
                      },
                    ),
                    invalid: invalid,
                  ),
                  style: AuthFormStyles.fieldTextStyle,
                  validator: (v) => validatePasswordNullable(locale.t, v),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  height: AuthFormStyles.buttonHeight,
                  child: FilledButton(
                    onPressed: _isSubmitting ? null : _submit,
                    style: AuthFormStyles.primaryButtonStyle(),
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
                              fontSize: 16.sp,
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
}
