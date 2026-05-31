import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../utils/legal_web_links.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Tappable Privacy Policy + Terms footer (localized).
class LegalAgreementFooter extends StatelessWidget {
  const LegalAgreementFooter({super.key, this.textAlign = TextAlign.center});

  final TextAlign textAlign;

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final baseStyle = TextStyle(
      fontSize: 12.sp,
      fontWeight: FontWeight.w400,
      color: AppColors.textPrimary,
      height: 1.2,
    );
    final linkStyle = baseStyle.copyWith(fontWeight: FontWeight.w600);

    return Text.rich(
      TextSpan(
        style: baseStyle,
        children: [
          TextSpan(text: locale.t('legal.agreePrefix')),
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
          TextSpan(text: locale.t('legal.agreeSuffix')),
        ],
      ),
      textAlign: textAlign,
    );
  }
}

/// Checkbox + legal links for registration flows.
class LegalAgreementCheckbox extends StatelessWidget {
  const LegalAgreementCheckbox({
    super.key,
    required this.value,
    required this.onChanged,
  });

  final bool value;
  final ValueChanged<bool?> onChanged;

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Checkbox(
          value: value,
          onChanged: onChanged,
          activeColor: AppColors.primary500,
          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
          visualDensity: VisualDensity.compact,
        ),
        const SizedBox(width: 4),
        Expanded(
          child: GestureDetector(
            onTap: () => onChanged(!value),
            behavior: HitTestBehavior.opaque,
            child: Text(
              locale.t('legal.checkboxLabel'),
              style: TextStyle(
                fontSize: 13.sp,
                color: AppColors.textPrimary,
                height: 1.3,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
