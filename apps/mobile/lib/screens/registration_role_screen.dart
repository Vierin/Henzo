import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../utils/legal_web_links.dart';
import '../widgets/chaotic_underline.dart';
import '../widgets/common/henzo_header_back_button.dart';
import '../widgets/language_selector_modal.dart';
import 'business_registration_screen.dart';
import 'client_registration_screen.dart';

class RegistrationRoleScreen extends StatelessWidget {
  const RegistrationRoleScreen({super.key});

  static const Map<String, String> _languageLabels = {
    'en': 'English',
    'ru': 'Русский',
    'vi': 'Tiếng Việt',
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: Consumer<LocaleProvider>(
          builder: (context, locale, _) => Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    HenzoHeaderBackButton(
                      onPressed: () => Navigator.of(context).maybePop(),
                    ),
                    const Spacer(),
                    InkWell(
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
                  underlineWidth: 62,
                  imageOnLeft: true,
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const ClientRegistrationScreen(),
                    ),
                  ),
                ),

                const SizedBox(height: 22),

                // Manager card — image on right
                _RoleCard(
                  locale: locale,
                  roleWord: locale.t('auth.roleManagerWord'),
                  description: locale.t('auth.roleOwnerDesc'),
                  imageAssetPath: 'assets/public/manager.webp',
                  accentColor: const Color(0xFFC2F600),
                  underlineWidth: 96,
                  imageOnLeft: false,
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const BusinessRegistrationScreen(),
                    ),
                  ),
                ),

                const Spacer(),

                // Terms
                _TermsText(locale: locale),
              ],
            ),
          ),
        ),
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
        Wrap(
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
                Text(
                  locale.t('auth.roleSubtitleHighlight'),
                  style: TextStyle(
                    fontSize: 15.sp,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 2),
                const ChaoticUnderline(
                  width: 88,
                  height: 5,
                  color: AppColors.primary500,
                ),
              ],
            ),
          ],
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
    required this.underlineWidth,
    required this.imageOnLeft,
    required this.onTap,
  });

  final LocaleProvider locale;
  final String roleWord;
  final String description;
  final String imageAssetPath;
  final Color accentColor;
  final double underlineWidth;
  final bool imageOnLeft;
  final VoidCallback onTap;

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
                            width: underlineWidth,
                            height: 5,
                            color: accentColor,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            description,
                            style: TextStyle(
                              fontSize: 14.sp,
                              color: AppColors.textSecondary,
                              height: 1.2,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
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
          TextSpan(text: ' ${locale.t('auth.termsAnd')} '),
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
