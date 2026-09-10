import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/auth_error_keys.dart';
import '../l10n/locale_provider.dart';
import '../services/auth_service.dart';
import '../utils/auth_entry_prefs.dart';
import '../utils/auth_ui_result.dart';
import '../utils/legal_web_links.dart';
import '../utils/show_api_error.dart';
import '../widgets/chaotic_underline.dart';
import '../widgets/common/henzo_header_back_button.dart';
import '../widgets/language_selector_modal.dart';
import 'business_registration_screen.dart';
import 'client_registration_screen.dart';

/// Which OAuth provider the user authenticated with before landing here.
/// When set, picking a role finishes sign-up via that provider (reusing the
/// identity already returned by Google/Apple) instead of a manual form.
enum OAuthEntryProvider { google, apple }

class RegistrationRoleScreen extends StatefulWidget {
  const RegistrationRoleScreen({
    super.key,
    this.isRootEntry = false,
    this.oauthProvider,
  });

  /// Cold-start first-run: no back, "Already have account" → Login.
  final bool isRootEntry;

  /// Set when the user reached this screen after a successful OAuth sign-in
  /// that had no matching account. Role selection then provisions the account
  /// through this provider directly, skipping the registration form.
  final OAuthEntryProvider? oauthProvider;

  @override
  State<RegistrationRoleScreen> createState() => _RegistrationRoleScreenState();
}

class _RegistrationRoleScreenState extends State<RegistrationRoleScreen> {
  static const Map<String, String> _languageLabels = {
    'en': 'English',
    'ru': 'Русский',
    'vi': 'Tiếng Việt',
    'es': 'Español',
  };

  bool _isProvisioning = false;
  AuthService? _authRef;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _authRef = context.read<AuthService>();
  }

  Future<void> _goToLogin() async {
    await AuthEntryPrefs.markCompleted();
    if (!widget.isRootEntry && mounted) {
      Navigator.of(context).maybePop();
    }
  }

  /// Client card → CLIENT, Manager card → OWNER.
  /// Without a pending OAuth provider we open the matching registration form.
  /// With one, we finish sign-up through that provider using the identity the
  /// user already granted, so they don't re-enter data.
  Future<void> _selectRole({required bool asOwner}) async {
    final provider = widget.oauthProvider;
    if (provider == null) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => asOwner
              ? const BusinessRegistrationScreen()
              : const ClientRegistrationScreen(),
        ),
      );
      return;
    }

    if (_isProvisioning) return;
    setState(() => _isProvisioning = true);
    final auth = context.read<AuthService>();
    final locale = context.read<LocaleProvider>();
    // Reuse the session already established on the login screen — OWNER →
    // register as owner, CLIENT → default role — so there's no second native
    // provider prompt.
    var result = await auth.provisionOAuthRole(asOwner: asOwner);
    // Retained session expired/lost: fall back to a fresh provider sign-in.
    if (result.errorL10nKey == AuthErrorKeys.googleNoSessionAfterSignIn) {
      result = provider == OAuthEntryProvider.google
          ? await auth.loginWithGoogle(
              registerAsOwner: asOwner,
              syncIfMissing: !asOwner,
            )
          : await auth.loginWithApple(
              registerAsOwner: asOwner,
              syncIfMissing: !asOwner,
            );
    }
    if (!mounted) return;
    setState(() => _isProvisioning = false);
    if (result.success) {
      Navigator.of(context).popUntil((route) => route.isFirst);
      return;
    }
    showApiError(context, resolveAuthUiMessage(locale, result));
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop && widget.oauthProvider != null) {
          // Left the picker without finishing sign-up — drop the retained
          // session so it doesn't linger (no-op once authenticated).
          _authRef?.discardPendingOAuthSession();
        }
      },
      child: Scaffold(
        backgroundColor: AppColors.backgroundSecondary,
        body: Stack(
          children: [
            SafeArea(
              child: Consumer<LocaleProvider>(
                builder: (context, locale, _) => Padding(
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          if (!widget.isRootEntry)
                            HenzoHeaderBackButton(
                              onPressed: () => Navigator.of(context).maybePop(),
                            )
                          else
                            SizedBox(width: 40.w, height: 40.h),
                          const Spacer(),
                          InkWell(
                            onTap: () =>
                                showLanguageSelectorModal(context, locale),
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
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 12),

                      // Heading
                      _ScreenHeading(locale: locale),

                      const SizedBox(height: 28),

                      // Client card — image on left
                      _RoleCard(
                        locale: locale,
                        roleWord: locale.t('auth.roleClientWord'),
                        description: locale.t('auth.roleClientDesc'),
                        imageAssetPath: 'assets/public/client.webp',
                        accentColor: AppColors.primary500,
                        imageOnLeft: true,
                        underlineWidthFactor: 0.45,
                        onTap: () => _selectRole(asOwner: false),
                      ),

                      const SizedBox(height: 22),

                      // Manager card — image on right
                      _RoleCard(
                        locale: locale,
                        roleWord: locale.t('auth.roleManagerWord'),
                        description: locale.t('auth.roleOwnerDesc'),
                        imageAssetPath: 'assets/public/manager.webp',
                        accentColor: const Color(0xFFC2F600),
                        imageOnLeft: false,
                        onTap: () => _selectRole(asOwner: true),
                      ),

                      const SizedBox(height: 24),

                      _AlreadyHaveAccountLink(
                        locale: locale,
                        onSignIn: _goToLogin,
                      ),

                      const Spacer(),

                      // Terms
                      _TermsText(locale: locale),
                    ],
                  ),
                ),
              ),
            ),
            if (_isProvisioning)
              const Positioned.fill(
                child: ColoredBox(
                  color: Color(0x66000000),
                  child: Center(child: CircularProgressIndicator()),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _AlreadyHaveAccountLink extends StatelessWidget {
  const _AlreadyHaveAccountLink({required this.locale, required this.onSignIn});

  final LocaleProvider locale;
  final VoidCallback onSignIn;

  @override
  Widget build(BuildContext context) {
    return RichText(
      textAlign: TextAlign.center,
      text: TextSpan(
        style: TextStyle(
          fontSize: 14.sp,
          color: AppColors.textSecondary,
          height: 1.3,
        ),
        children: [
          TextSpan(text: '${locale.t('auth.alreadyHaveAccountPrefix')} '),
          TextSpan(
            text: locale.t('auth.signIn'),
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              color: AppColors.primary500,
            ),
            recognizer: TapGestureRecognizer()..onTap = onSignIn,
          ),
        ],
      ),
    );
  }
}

class _ScreenHeading extends StatelessWidget {
  const _ScreenHeading({required this.locale});

  final LocaleProvider locale;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          locale.t('auth.roleTitle'),
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 34.sp,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
            letterSpacing: -0.5,
            height: 1.05,
          ),
        ),
        const SizedBox(height: 10),
        Builder(
          builder: (context) {
            final highlightText = locale.t('auth.roleSubtitleHighlight');
            final highlightStyle = TextStyle(
              fontSize: 15.sp,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
              height: 1.2,
            );
            final tp = TextPainter(
              text: TextSpan(text: highlightText, style: highlightStyle),
              textDirection: TextDirection.ltr,
            )..layout();
            return Wrap(
              alignment: WrapAlignment.center,
              crossAxisAlignment: WrapCrossAlignment.start,
              children: [
                Text(
                  '${locale.t('auth.roleSubtitleBefore')} ',
                  style: TextStyle(
                    fontSize: 15.sp,
                    color: AppColors.textPrimary,
                    height: 1.2,
                  ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(highlightText, style: highlightStyle),
                    const SizedBox(height: 2),
                    ChaoticUnderline(
                      width: tp.width * 1,
                      height: 5,
                      color: AppColors.primary500,
                    ),
                  ],
                ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.locale,
    required this.roleWord,
    required this.description,
    required this.imageAssetPath,
    required this.accentColor,
    required this.imageOnLeft,
    required this.onTap,
    this.underlineWidthFactor = 0.8,
  });

  final LocaleProvider locale;
  final String roleWord;
  final String description;
  final String imageAssetPath;
  final Color accentColor;
  final bool imageOnLeft;
  final VoidCallback onTap;
  final double underlineWidthFactor;

  static const double _cardHeight = 160.0;
  static const double _imageWidth = 161.0;
  static const double _imageTopOverflow = 32.0;
  static const double _cardRadius = 18.0;

  double get _plateSideInset => _imageWidth / 2;

  @override
  Widget build(BuildContext context) {
    final textPadding = imageOnLeft
        ? EdgeInsets.fromLTRB(_plateSideInset - 6, 0, 16, 0)
        : EdgeInsets.fromLTRB(16, 0, _plateSideInset + 6, 0);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(_cardRadius),
        child: SizedBox(
          height: _cardHeight + _imageTopOverflow,
          child: Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.bottomCenter,
            children: [
              // Card background + text (narrow plate; half-image inset on photo side)
              Positioned(
                left: imageOnLeft ? _plateSideInset : 0,
                right: imageOnLeft ? 0 : _plateSideInset,
                bottom: 0,
                height: _cardHeight,
                child: Ink(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(_cardRadius),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(_cardRadius),
                    child: Padding(
                      padding: textPadding,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            locale.t('auth.roleIAm'),
                            style: TextStyle(
                              fontSize: 14.sp,
                              color: AppColors.textSecondary,
                              height: 1.15,
                            ),
                          ),
                          const SizedBox(height: 4),
                          IntrinsicWidth(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  roleWord,
                                  style: TextStyle(
                                    fontSize: 30.sp,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textPrimary,
                                    height: 1.0,
                                    letterSpacing: -0.3,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                ChaoticUnderline(
                                  height: 5,
                                  color: accentColor,
                                  widthFactor: underlineWidthFactor,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 6),
                          Padding(
                            padding: const EdgeInsets.only(right: 12),
                            child: Text(
                              description,
                              style: TextStyle(
                                fontSize: 14.sp,
                                color: AppColors.textSecondary,
                                height: 1.2,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            locale.t('auth.roleAllInOne'),
                            style: TextStyle(
                              fontSize: 14.sp,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                              height: 1.2,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

              // Photo — overflows above card
              Positioned(
                left: imageOnLeft ? 0 : null,
                right: imageOnLeft ? null : 0,
                bottom: 0,
                top: 0,
                width: _imageWidth,
                child: Image.asset(
                  imageAssetPath,
                  fit: BoxFit.contain,
                  alignment: imageOnLeft
                      ? Alignment.bottomLeft
                      : Alignment.bottomRight,
                  errorBuilder: (_, _, _) => const SizedBox.shrink(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TermsText extends StatelessWidget {
  const _TermsText({required this.locale});

  final LocaleProvider locale;

  @override
  Widget build(BuildContext context) {
    return RichText(
      textAlign: TextAlign.center,
      text: TextSpan(
        style: TextStyle(
          fontSize: 12.sp,
          color: AppColors.textSecondary,
          height: 1.4,
        ),
        children: [
          TextSpan(text: locale.t('auth.termsPrefix')),
          TextSpan(
            text: locale.t('auth.privacyPolicy'),
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
            recognizer: TapGestureRecognizer()
              ..onTap = () =>
                  openLegalWebPage(context, locale, '/privacy-policy'),
          ),
          TextSpan(text: '\n${locale.t('auth.termsAnd')} '),
          TextSpan(
            text: locale.t('auth.termsOfService'),
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
            recognizer: TapGestureRecognizer()
              ..onTap = () =>
                  openLegalWebPage(context, locale, '/terms-of-service'),
          ),
          const TextSpan(text: '.'),
        ],
      ),
    );
  }
}
