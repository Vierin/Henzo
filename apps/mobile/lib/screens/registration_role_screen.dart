import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../widgets/chaotic_underline.dart';
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
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
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
                const SizedBox(height: 68),
                const _ScreenHeading(),
                const SizedBox(height: 34),
                _RoleCard(
                  title: 'Client',
                  imageAssetPath: 'assets/public/client.webp',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const ClientRegistrationScreen(),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 20),
                _RoleCard(
                  title: 'Business',
                  imageAssetPath: 'assets/public/business.webp',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const BusinessRegistrationScreen(),
                      ),
                    );
                  },
                ),
                const Spacer(),
                const Padding(
                  padding: EdgeInsets.only(bottom: 14),
                  child: _LegalFooter(),
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
  const _ScreenHeading();

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: [
        Text(
          'Choose',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 40,
            fontWeight: FontWeight.w400,
            color: AppColors.textPrimary,
            height: 0.95,
          ),
        ),
        SizedBox(height: 2),
        _UnderlinedSubheading(text: 'your path'),
      ],
    );
  }
}

class _UnderlinedSubheading extends StatelessWidget {
  const _UnderlinedSubheading({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    const titleStyle = TextStyle(
      fontSize: 24,
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
      height: 1,
    );

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          text,
          textAlign: TextAlign.center,
          style: titleStyle,
        ),
        const SizedBox(height: 2),
        const ChaoticUnderline(
          width: 128,
          height: 8,
          color: AppColors.primary500,
        ),
      ],
    );
  }
}

class _LegalFooter extends StatelessWidget {
  const _LegalFooter();

  @override
  Widget build(BuildContext context) {
    const baseStyle = TextStyle(
      fontSize: 12,
      fontWeight: FontWeight.w400,
      color: AppColors.textPrimary,
      height: 1.2,
    );
    return Text.rich(
      const TextSpan(
        style: baseStyle,
        children: [
          TextSpan(text: 'By continuing, you agree to out '),
          TextSpan(
            text: 'Privacy Policy',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
          TextSpan(text: '\nand '),
          TextSpan(
            text: 'Terms of Service.',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
        ],
      ),
      textAlign: TextAlign.center,
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.title,
    required this.imageAssetPath,
    required this.onTap,
  });

  final String title;
  final String imageAssetPath;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final imageWidth = constraints.maxWidth * 0.5;
        return Material(
          color: Colors.white,
          elevation: 0,
          borderRadius: BorderRadius.circular(22),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(22),
            child: Container(
              height: 140,
              padding: const EdgeInsets.fromLTRB(22, 0, 0, 0),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(22),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        title,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                          height: 1,
                        ),
                      ),
                    ),
                  ),
                  SizedBox(
                    width: imageWidth,
                    child: _CardPhoto(imageAssetPath: imageAssetPath),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _CardPhoto extends StatelessWidget {
  const _CardPhoto({required this.imageAssetPath});

  final String imageAssetPath;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: const BorderRadius.only(
        topRight: Radius.circular(22),
        bottomRight: Radius.circular(22),
        topLeft: Radius.circular(30),
        bottomLeft: Radius.circular(30),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [Image.asset(imageAssetPath, fit: BoxFit.cover)],
      ),
    );
  }
}
