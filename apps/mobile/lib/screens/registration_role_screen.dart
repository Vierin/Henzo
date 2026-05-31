import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../widgets/chaotic_underline.dart';
import '../widgets/common/henzo_header_back_button.dart';
import '../widgets/language_selector_modal.dart';
import 'business_registration_screen.dart';
import 'client_registration_screen.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

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
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
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
                                fontWeight: FontWeight.w400,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 28),
                _ScreenHeading(locale: locale),
                const SizedBox(height: 28),
                _RoleCard(
                  locale: locale,
                  roleWord: locale.t('auth.roleTrain'),
                  features: [
                    locale.t('auth.roleClientFeature1'),
                    locale.t('auth.roleClientFeature2'),
                    locale.t('auth.roleClientFeature3'),
                  ],
                  imageAssetPath: 'assets/public/client.webp',
                  accentColor: AppColors.primary500,
                  underlineWidth: 56,
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const ClientRegistrationScreen(),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 16),
                _RoleCard(
                  locale: locale,
                  roleWord: locale.t('auth.roleManage'),
                  features: [
                    locale.t('auth.roleOwnerFeature1'),
                    locale.t('auth.roleOwnerFeature2'),
                    locale.t('auth.roleOwnerFeature3'),
                  ],
                  imageAssetPath: 'assets/public/manager.webp',
                  accentColor: const Color(0xFFC2F600),
                  accentForegroundColor: AppColors.textPrimary,
                  underlineWidth: 88,
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const BusinessRegistrationScreen(),
                      ),
                    );
                  },
                ),
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
            fontSize: 32.sp,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
            letterSpacing: -0.3,
            height: 1.05,
          ),
        ),
        const SizedBox(height: 10),
        Wrap(
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.start,
          children: [
            Text(
              locale.t('auth.roleSubtitleBefore'),
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14.sp,
                fontWeight: FontWeight.w400,
                color: AppColors.textPrimary,
                height: 1.2,
              ),
            ),
            Transform.translate(
              offset: const Offset(-3, 0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    locale.t('auth.roleSubtitleHighlight'),
                    style: TextStyle(
                      fontSize: 14.sp,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 2),
                  const ChaoticUnderline(
                    width: 88,
                    height: 6,
                    color: AppColors.primary500,
                  ),
                ],
              ),
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
    required this.features,
    required this.imageAssetPath,
    required this.accentColor,
    required this.underlineWidth,
    required this.onTap,
    this.accentForegroundColor = Colors.white,
  });

  final LocaleProvider locale;
  final String roleWord;
  final List<String> features;
  final String imageAssetPath;
  final Color accentColor;
  final Color accentForegroundColor;
  final double underlineWidth;
  final VoidCallback onTap;

  static const double _cardHeight = 196;
  static const double _photoHeight = 194;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Ink(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: SizedBox(
                  height: _cardHeight,
                  width: double.infinity,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 18, 0, 18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          locale.t('auth.roleHereTo'),
                          style: TextStyle(
                            fontSize: 14.sp,
                            fontWeight: FontWeight.w400,
                            color: AppColors.textSecondary,
                            height: 1.2,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          roleWord,
                          style: TextStyle(
                            fontSize: 28.sp,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                            height: 1,
                          ),
                        ),
                        const SizedBox(height: 2),
                        ChaoticUnderline(
                          width: underlineWidth,
                          height: 7,
                          color: accentColor,
                        ),
                        const SizedBox(height: 12),
                        for (var i = 0; i < features.length; i++) ...[
                          _FeatureRow(
                            label: features[i],
                            accentColor: accentColor,
                            iconColor: accentForegroundColor,
                          ),
                          if (i < features.length - 1)
                            const SizedBox(height: 6),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
              Positioned(
                right: 0,
                bottom: 0,
                top: -(_photoHeight - _cardHeight),
                width: 158,
                child: Image.asset(
                  imageAssetPath,
                  fit: BoxFit.contain,
                  alignment: Alignment.bottomCenter,
                  errorBuilder: (_, _, _) => const SizedBox.shrink(),
                ),
              ),
              Positioned(
                right: 12,
                bottom: 12,
                child: _ActionCircle(
                  color: accentColor,
                  iconColor: accentForegroundColor,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FeatureRow extends StatelessWidget {
  const _FeatureRow({
    required this.label,
    required this.accentColor,
    this.iconColor = Colors.white,
  });

  final String label;
  final Color accentColor;
  final Color iconColor;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 18,
          height: 18,
          decoration: BoxDecoration(color: accentColor, shape: BoxShape.circle),
          child: Icon(Icons.check, size: 12, color: iconColor),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11.sp,
              fontWeight: FontWeight.w400,
              color: AppColors.textPrimary,
              height: 1.2,
            ),
          ),
        ),
      ],
    );
  }
}

class _ActionCircle extends StatelessWidget {
  const _ActionCircle({required this.color, this.iconColor = Colors.white});

  final Color color;
  final Color iconColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      child: Icon(Icons.arrow_forward_ios_rounded, size: 16, color: iconColor),
    );
  }
}
