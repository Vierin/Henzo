import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../utils/legal_web_links.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Apple 3.1.2 / Play subscription legal text + Privacy/Terms links.
class SubscriptionLegalDisclosure extends StatelessWidget {
  const SubscriptionLegalDisclosure({super.key});

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final baseStyle = TextStyle(
      fontSize: 11.sp,
      color: AppColors.textTertiary,
      height: 1.35,
    );
    final linkStyle = baseStyle.copyWith(
      color: AppColors.primary500,
      fontWeight: FontWeight.w600,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          locale.t('subscription.autoRenewDisclosure'),
          style: baseStyle,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text.rich(
          TextSpan(
            style: baseStyle,
            children: [
              TextSpan(text: locale.t('subscription.legalLinksPrefix')),
              TextSpan(
                text: locale.t('settings.privacyPolicy'),
                style: linkStyle,
                recognizer: TapGestureRecognizer()
                  ..onTap = () => openLegalWebPage(
                        context,
                        locale,
                        '/privacy-policy',
                      ),
              ),
              TextSpan(text: locale.t('legal.agreeAnd')),
              TextSpan(
                text: locale.t('settings.termsOfUse'),
                style: linkStyle,
                recognizer: TapGestureRecognizer()
                  ..onTap = () => openLegalWebPage(
                        context,
                        locale,
                        '/terms-of-service',
                      ),
              ),
              TextSpan(text: locale.t('subscription.legalLinksSuffix')),
            ],
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
