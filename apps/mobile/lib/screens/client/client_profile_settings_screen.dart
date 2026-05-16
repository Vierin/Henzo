import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config/app_config.dart';
import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../services/auth_service.dart';
import '../../widgets/language_selector_modal.dart';
import '../../widgets/settings/branded_settings_app_bar.dart';
import '../../widgets/settings/settings_list_widgets.dart';
import 'client_edit_profile_screen.dart';

class ClientProfileSettingsScreen extends StatelessWidget {
  const ClientProfileSettingsScreen({super.key});

  Future<void> _logout(BuildContext context) async {
    await context.read<AuthService>().logout();
    if (!context.mounted) return;
    Navigator.of(context, rootNavigator: true).popUntil((route) => route.isFirst);
  }

  Future<void> _openWebPage(
    BuildContext context,
    LocaleProvider locale,
    String path,
  ) async {
    final uri = Uri.parse('${AppConfig.webUrl}/${locale.languageTag}$path');
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(locale.t('errors.generic'))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<LocaleProvider>(
      builder: (context, locale, _) {
        return Scaffold(
          backgroundColor: AppColors.backgroundSecondary,
          appBar: buildBrandedSettingsAppBar(
            context,
            title: locale.t('profileForm.profileSettings'),
          ),
          body: SafeArea(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(
                kScreenPaddingHorizontal,
                8,
                kScreenPaddingHorizontal,
                24,
              ),
              children: [
                SettingsGroupCard(
                  children: [
                    SettingsListTile(
                      icon: Icons.person_outline,
                      title: locale.t('profileForm.personalData'),
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const ClientEditProfileScreen(),
                          ),
                        );
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                SettingsSectionLabel(
                  title: locale.t('settings.owner.sectionApp'),
                ),
                const SizedBox(height: 8),
                SettingsGroupCard(
                  children: [
                    SettingsListTile(
                      icon: Icons.language_outlined,
                      title: locale.t('settings.changeLanguage'),
                      onTap: () => showLanguageSelectorModal(context, locale),
                    ),
                    SettingsListTile(
                      icon: Icons.description_outlined,
                      title: locale.t('settings.termsOfUse'),
                      onTap: () =>
                          _openWebPage(context, locale, '/terms-of-service'),
                    ),
                    SettingsListTile(
                      icon: Icons.privacy_tip_outlined,
                      title: locale.t('settings.privacyPolicy'),
                      onTap: () =>
                          _openWebPage(context, locale, '/privacy-policy'),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                SettingsLogoutButton(
                  label: locale.t('settings.logOut'),
                  onTap: () => _logout(context),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
