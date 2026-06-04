import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../models/studio.dart';
import '../common/henzo_modal.dart';
import '../common/sheet_action_button_style.dart';
import 'settings_form_tokens.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

enum StudioSocialPlatform {
  instagram,
  facebook,
  youtube,
  tiktok,
  whatsApp,
  telegram,
  website;

  static StudioSocialPlatform? fromId(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    for (final p in StudioSocialPlatform.values) {
      if (p.name == raw) return p;
    }
    return null;
  }

  String get iconAsset => switch (this) {
        StudioSocialPlatform.instagram =>
          'assets/icons/icon-instagram.png',
        StudioSocialPlatform.facebook => 'assets/icons/icon-facebook.png',
        StudioSocialPlatform.youtube => 'assets/icons/icon-youtube.png',
        StudioSocialPlatform.tiktok => 'assets/icons/icon-tiktok.png',
        StudioSocialPlatform.whatsApp => 'assets/icons/icon-whatsap.png',
        StudioSocialPlatform.telegram => 'assets/icons/icon-telegram.png',
        StudioSocialPlatform.website => 'assets/icons/icon-web.png',
      };

  bool get isRasterIcon => iconAsset.endsWith('.png');

  String label(LocaleProvider locale) => switch (this) {
        StudioSocialPlatform.instagram => locale.t('profileForm.instagram'),
        StudioSocialPlatform.facebook => locale.t('profileForm.facebook'),
        StudioSocialPlatform.youtube => locale.t('profileForm.youtube'),
        StudioSocialPlatform.tiktok => locale.t('profileForm.tiktok'),
        StudioSocialPlatform.whatsApp => locale.t('profileForm.whatsApp'),
        StudioSocialPlatform.website => locale.t('profileForm.website'),
        StudioSocialPlatform.telegram => locale.t('profileForm.telegram'),
      };

  String valueHint(LocaleProvider locale) => switch (this) {
        StudioSocialPlatform.instagram => '@username',
        StudioSocialPlatform.facebook => 'https://facebook.com/...',
        StudioSocialPlatform.youtube => 'https://youtube.com/@...',
        StudioSocialPlatform.tiktok => 'https://tiktok.com/@...',
        StudioSocialPlatform.whatsApp => '+84...',
        StudioSocialPlatform.website => 'https://...',
        StudioSocialPlatform.telegram => '@username',
      };

  bool get usesPhoneKeyboard => this == StudioSocialPlatform.whatsApp;
}

class StudioSocialLink {
  StudioSocialLink({required this.platform, required this.value});

  final StudioSocialPlatform platform;
  String value;

  String displayValue() {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return '—';
    return trimmed;
  }
}

List<StudioSocialLink> studioSocialLinksFromStudio(Studio studio) {
  final links = <StudioSocialLink>[];
  final instagram = studio.instagram?.trim();
  if (instagram != null && instagram.isNotEmpty) {
    links.add(
      StudioSocialLink(
        platform: StudioSocialPlatform.instagram,
        value: instagram,
      ),
    );
  }

  final website = studio.website?.trim();
  if (website != null && website.isNotEmpty) {
    final isFacebook = RegExp(
      r'facebook\.com|fb\.com|fb\.me',
      caseSensitive: false,
    ).hasMatch(website);
    links.add(
      StudioSocialLink(
        platform: isFacebook
            ? StudioSocialPlatform.facebook
            : StudioSocialPlatform.website,
        value: website,
      ),
    );
  }

  final extra = studio.reminderSettings?['socialLinks'];
  if (extra is List) {
    for (final item in extra) {
      if (item is! Map) continue;
      final platform = StudioSocialPlatform.fromId(item['platform']?.toString());
      final value = item['value']?.toString().trim() ?? '';
      if (platform == null || value.isEmpty) continue;
      if (links.any((l) => l.platform == platform)) continue;
      links.add(StudioSocialLink(platform: platform, value: value));
    }
  }
  return links;
}

({String? instagram, String? website, List<Map<String, String>> extras})
    studioSocialLinksToPayload(List<StudioSocialLink> links) {
  String? instagram;
  String? website;
  final extras = <Map<String, String>>[];

  for (final link in links) {
    final value = link.value.trim();
    if (value.isEmpty) continue;
    switch (link.platform) {
      case StudioSocialPlatform.instagram:
        instagram = value;
      case StudioSocialPlatform.facebook:
      case StudioSocialPlatform.website:
        website = value;
      case StudioSocialPlatform.youtube:
      case StudioSocialPlatform.tiktok:
      case StudioSocialPlatform.whatsApp:
      case StudioSocialPlatform.telegram:
        extras.add({
          'platform': link.platform.name,
          'value': value,
        });
    }
  }
  return (instagram: instagram, website: website, extras: extras);
}

String studioSocialLinksSnapshot(List<StudioSocialLink> links) {
  final sorted = links
      .map((l) => '${l.platform.name}:${l.value.trim()}')
      .toList()
    ..sort();
  return sorted.join('|');
}

Future<StudioSocialPlatform?> showStudioSocialPlatformPickerSheet(
  BuildContext context, {
  required Set<StudioSocialPlatform> excluded,
}) {
  final locale = context.read<LocaleProvider>();
  final options = StudioSocialPlatform.values
      .where((p) => !excluded.contains(p))
      .toList();
  if (options.isEmpty) return Future.value(null);

  return showHenzoModalBottomSheet<StudioSocialPlatform>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetCtx) {
      return SafeArea(
        top: false,
        child: Container(
          margin: const EdgeInsets.only(top: 24),
          decoration: const BoxDecoration(
            color: AppColors.backgroundPrimary,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Padding(
            padding: EdgeInsets.fromLTRB(
              16,
              12,
              16,
              16 + MediaQuery.viewInsetsOf(sheetCtx).bottom,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        locale.t('profileForm.addSocialLinkSheetTitle'),
                        style: TextStyle(
                          fontSize: 13.sp,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.4,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                    Material(
                      color: AppColors.primary500,
                      shape: const CircleBorder(),
                      child: InkWell(
                        onTap: () => Navigator.of(sheetCtx).pop(),
                        customBorder: const CircleBorder(),
                        child: const SizedBox(
                          width: 32,
                          height: 32,
                          child: Icon(
                            Icons.close,
                            size: 18,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ...options.map((platform) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Material(
                      color: AppColors.backgroundSecondary,
                      borderRadius: BorderRadius.circular(
                        kSettingsInputBorderRadius,
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        onTap: () =>
                            Navigator.of(sheetCtx).pop(platform),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 12,
                          ),
                          child: Row(
                            children: [
                              SocialPlatformIcon(platform: platform),
                              const SizedBox(width: 12),
                              Text(
                                platform.label(locale),
                                style: TextStyle(
                                  fontSize: 16.sp,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
        ),
      );
    },
  );
}

Future<String?> showStudioSocialLinkEditSheet(
  BuildContext context, {
  required StudioSocialPlatform platform,
  String initialValue = '',
}) {
  final locale = context.read<LocaleProvider>();
  final controller = TextEditingController(text: initialValue);

  return showHenzoModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetCtx) {
      return Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.viewInsetsOf(sheetCtx).bottom,
        ),
        child: SafeArea(
          top: false,
          child: Container(
            margin: const EdgeInsets.only(top: 24),
            decoration: const BoxDecoration(
              color: AppColors.backgroundPrimary,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    platform.label(locale),
                    style: TextStyle(
                      fontSize: 18.sp,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: controller,
                    autofocus: true,
                    decoration: settingsInputDecoration(
                      hintText: platform.valueHint(locale),
                    ),
                    keyboardType: platform.usesPhoneKeyboard
                        ? TextInputType.phone
                        : TextInputType.url,
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: SizedBox(
                          height: 46,
                          child: OutlinedButton(
                            onPressed: () => Navigator.of(sheetCtx).pop(),
                            style: sheetCancelButtonStyle(),
                            child: Text(locale.t('common.cancel')),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: SizedBox(
                          height: 46,
                          child: FilledButton(
                            onPressed: () => Navigator.of(sheetCtx)
                                .pop(controller.text.trim()),
                            style: sheetPrimaryButtonStyle(),
                            child: Text(locale.t('common.save')),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    },
  );
}

class SocialPlatformIcon extends StatelessWidget {
  const SocialPlatformIcon({
    super.key,
    required this.platform,
    this.size = SocialPlatformIcon.defaultSize,
  });

  static const double defaultSize = 44;

  final StudioSocialPlatform platform;
  final double size;

  @override
  Widget build(BuildContext context) {
    final asset = platform.isRasterIcon
        ? Image.asset(
            platform.iconAsset,
            width: size,
            height: size,
            fit: BoxFit.cover,
          )
        : SvgPicture.asset(
            platform.iconAsset,
            width: size,
            height: size,
            fit: BoxFit.cover,
          );

    return ClipOval(
      child: SizedBox(width: size, height: size, child: asset),
    );
  }
}
