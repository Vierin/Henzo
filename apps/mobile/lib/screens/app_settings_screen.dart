import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../constants/colors.dart';
import '../config/app_config.dart';
import '../l10n/locale_provider.dart';
import '../services/auth_service.dart';
import '../widgets/language_selector_modal.dart';
import '../services/push_notification_service.dart';
import 'account_settings_screen.dart';

class AppSettingsScreen extends StatelessWidget {
  const AppSettingsScreen({super.key});

  Future<void> _openWebPage(
    BuildContext context,
    LocaleProvider locale,
    String path,
  ) async {
    final uri = Uri.parse('${AppConfig.webUrl}/${locale.languageTag}$path');
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened && context.mounted) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
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
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            leading: IconButton(
              onPressed: () => Navigator.pop(context),
              style: IconButton.styleFrom(
                backgroundColor: AppColors.neutral200,
                shape: const CircleBorder(),
              ),
              icon: const Icon(
                Icons.arrow_back,
                color: AppColors.textPrimary,
                size: 20,
              ),
            ),
            title: Text(
              locale.t('settings.title'),
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            centerTitle: true,
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(0, 16, 0, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildQuickActions(context, locale),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 24),
                      _buildListTile(
                        context,
                        locale,
                        icon: Icons.language,
                        title: locale.t('settings.changeLanguage'),
                        onTap: () => showLanguageSelectorModal(
                          context,
                          locale,
                          onLocaleSelected: (code) {
                            final token = context
                                .read<AuthService>()
                                .accessToken;
                            if (token != null && token.isNotEmpty) {
                              PushNotificationService.registerToken(
                                accessToken: token,
                                language: code,
                              );
                            }
                          },
                        ),
                      ),
                      const SizedBox(height: 8),
                      _buildListTile(
                        context,
                        locale,
                        icon: Icons.manage_accounts_outlined,
                        title: 'Настройка аккаунта',
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const AccountSettingsScreen(),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      _buildListTile(
                        context,
                        locale,
                        icon: Icons.description_outlined,
                        title: locale.t('settings.privacyPolicy'),
                        onTap: () => _openWebPage(
                          context,
                          locale,
                          '/privacy-policy',
                        ),
                      ),
                      const SizedBox(height: 8),
                      _buildListTile(
                        context,
                        locale,
                        icon: Icons.description_outlined,
                        title: locale.t('settings.termsOfUse'),
                        onTap: () => _openWebPage(
                          context,
                          locale,
                          '/terms-of-service',
                        ),
                      ),
                      const SizedBox(height: 24),
                      Center(
                        child: Text(
                          locale.t('settings.version'),
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      _buildExitButton(context, locale),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildListTile(
    BuildContext context,
    LocaleProvider locale, {
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return Material(
      color: AppColors.neutral100,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Icon(icon, size: 24, color: AppColors.primary500),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              Icon(
                Icons.chevron_right,
                size: 24,
                color: AppColors.textSecondary,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context, LocaleProvider locale) {
    final actions = [
      (icon: Icons.list_alt_outlined, label: locale.t('settings.howToService')),
      (icon: Icons.public_outlined, label: locale.t('settings.howToOnline')),
      (icon: Icons.language, label: locale.t('settings.changeLanguage')),
      (icon: Icons.manage_accounts_outlined, label: 'Настройка\nаккаунта'),
    ];
    return SizedBox(
      height: 100,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: actions.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final a = actions[index];
          return _buildQuickActionButton(
            icon: a.icon,
            label: a.label,
            onTap: () {
              ScaffoldMessenger.maybeOf(context)?.showSnackBar(
                SnackBar(
                  content: Text(
                    '${a.label.replaceAll('\n', ' ')} в разработке',
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildQuickActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(50),
      child: SizedBox(
        width: 80,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppColors.primary500,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: AppColors.textInverse, size: 26),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
              ),
              maxLines: 2,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExitButton(BuildContext context, LocaleProvider locale) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          context.read<AuthService>().logout();
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.error500, width: 2),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                locale.t('settings.logOut'),
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.error500,
                ),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.logout, size: 20, color: AppColors.error500),
            ],
          ),
        ),
      ),
    );
  }
}
