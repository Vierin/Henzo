import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import 'settings_form_tokens.dart';
import 'settings_typography.dart';

/// Studio name + default address row — same as owner [SettingsScreen] main info.
class StudioNameAddressFields extends StatelessWidget {
  const StudioNameAddressFields({
    super.key,
    required this.nameController,
    required this.locationDisplayName,
    required this.addressText,
    required this.onAddressTap,
    this.nameValidator,
  });

  final TextEditingController nameController;
  final String locationDisplayName;
  final String addressText;
  final VoidCallback onAddressTap;
  final String? Function(String?)? nameValidator;

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextFormField(
          controller: nameController,
          decoration: settingsBorderlessInputDecoration(
            hintText: locale.t('profileForm.enterSalonName'),
          ),
          textCapitalization: TextCapitalization.words,
          validator: nameValidator,
        ),
        const SizedBox(height: 16),
        Material(
          color: AppColors.backgroundPrimary,
          borderRadius: settingsInputBorderRadius(maxLines: 2),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: onAddressTap,
            borderRadius: settingsInputBorderRadius(maxLines: 2),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: SvgPicture.asset(
                      'assets/icons/icon-pin.svg',
                      width: 15,
                      height: 21,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          locationDisplayName.trim().isNotEmpty
                              ? locationDisplayName.trim()
                              : locale.t('addTraining.studioNameFallback'),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        if (addressText.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            addressText,
                            style: const TextStyle(
                              fontSize: 14,
                              height: 1.25,
                              fontWeight: FontWeight.w400,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ] else
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              locale.t('addTraining.noAddress'),
                              style: const TextStyle(
                                fontSize: 14,
                                color: AppColors.textTertiary,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const Padding(
                    padding: EdgeInsets.only(top: 4),
                    child: Icon(
                      CupertinoIcons.chevron_forward,
                      size: 18,
                      color: AppColors.textTertiary,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Section header used on studio profile / details forms.
class StudioProfileFormSection extends StatelessWidget {
  const StudioProfileFormSection({
    super.key,
    required this.title,
    required this.child,
  });

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 12, bottom: 8),
          child: Text(
            title.toUpperCase(),
            style: SettingsTypography.sectionTitle(context),
          ),
        ),
        child,
      ],
    );
  }
}
