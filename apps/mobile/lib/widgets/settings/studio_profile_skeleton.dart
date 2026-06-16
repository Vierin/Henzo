import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../l10n/locale_provider.dart';
import '../common/shimmer_box.dart';
import 'settings_form_tokens.dart';
import 'settings_list_widgets.dart';

/// Skeleton layout for owner studio profile while studio data loads.
class StudioProfileSkeleton extends StatelessWidget {
  const StudioProfileSkeleton({super.key});

  static const double _cardPadding = 16;
  static const double _logoSize = 120;
  static const double _photoSize = 120;

  @override
  Widget build(BuildContext context) {
    final locale = context.read<LocaleProvider>();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SettingsFormSection(
          title: locale.t('profileForm.studioLogo'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const ShimmerBox(height: 14, borderRadius: 4),
              const SizedBox(height: 12),
              Center(
                child: ShimmerBox(
                  width: _logoSize,
                  height: _logoSize,
                  borderRadius: kSettingsInputBorderRadius,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SettingsFormSectionLabel(
              title: locale.t('profileForm.studioPhotos'),
            ),
            const SizedBox(height: 8),
            Container(
              clipBehavior: Clip.antiAlias,
              decoration: settingsSectionDecoration(),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  _cardPadding,
                  _cardPadding,
                  _cardPadding,
                  _cardPadding,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const ShimmerBox(height: 14, borderRadius: 4),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: _photoSize,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: 3,
                        separatorBuilder: (_, _) => const SizedBox(width: 10),
                        itemBuilder: (_, _) => ShimmerBox(
                          width: _photoSize,
                          height: _photoSize,
                          borderRadius: kSettingsInputBorderRadius,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    const ShimmerBox(height: 12, borderRadius: 4),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        SettingsFormSection(
          title: locale.t('profileForm.mainInfo'),
          carded: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _fieldSkeleton(),
              const SizedBox(height: 16),
              _fieldSkeleton(height: 96),
              const SizedBox(height: 16),
              _fieldSkeleton(height: 72),
            ],
          ),
        ),
        const SizedBox(height: 24),
        SettingsFormSection(
          title: locale.t('profileForm.contactInfo'),
          carded: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _fieldSkeleton(),
              const SizedBox(height: 16),
              _fieldSkeleton(),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SettingsFormSectionLabel(
              title: locale.t('profileForm.socialLinks'),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: settingsSectionDecoration(),
              child: Row(
                children: [
                  ShimmerBox(
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ShimmerBox(width: 72, height: 14, borderRadius: 4),
                        SizedBox(height: 6),
                        ShimmerBox(height: 12, borderRadius: 4),
                      ],
                    ),
                  ),
                  ShimmerBox(width: 40, height: 40, borderRadius: 20),
                  const SizedBox(width: 8),
                  ShimmerBox(width: 40, height: 40, borderRadius: 20),
                ],
              ),
            ),
            const SizedBox(height: 10),
            ShimmerBox(
              height: 48,
              borderRadius: kSettingsInputBorderRadius,
            ),
          ],
        ),
      ],
    );
  }

  static Widget _fieldSkeleton({double height = 48}) {
    return ShimmerBox(
      height: height,
      borderRadius: kSettingsInputBorderRadius,
    );
  }
}
