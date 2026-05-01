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
import 'online_booking_screen.dart';
import 'profile_screen.dart';
import 'settings_screen.dart';

enum SettingsHubSection { studio, booking, account, app }

class AppSettingsScreen extends StatelessWidget {
  const AppSettingsScreen({super.key, this.initialSection = SettingsHubSection.studio});

  final SettingsHubSection initialSection;

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
                _buildSectionTabs(context, locale),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 20),
                      ..._buildSectionContent(context, locale),
                      const SizedBox(height: 20),
                      Center(
                        child: Text(
                          locale.t('settings.version'),
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
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

  List<Widget> _buildSectionContent(BuildContext context, LocaleProvider locale) {
    switch (initialSection) {
      case SettingsHubSection.studio:
        return [
          _buildListTile(
            context,
            locale,
            icon: Icons.store_outlined,
            title: 'Настройки студии',
            subtitle: 'Основные данные, фото, контакты',
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const SettingsScreen()),
            ),
          ),
          const SizedBox(height: 8),
          _buildListTile(
            context,
            locale,
            icon: Icons.public_outlined,
            title: 'Онлайн бронирование',
            subtitle: 'Окно записи и публичная ссылка',
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const OnlineBookingScreen()),
            ),
          ),
        ];
      case SettingsHubSection.booking:
        return [
          _buildListTile(
            context,
            locale,
            icon: Icons.public_outlined,
            title: 'Онлайн бронирование',
            subtitle: 'Управление окном записи и ссылкой',
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const OnlineBookingScreen()),
            ),
          ),
        ];
      case SettingsHubSection.account:
        return [
          _buildListTile(
            context,
            locale,
            icon: Icons.person_outline,
            title: 'Профиль владельца',
            subtitle: 'Подписка и рабочие разделы',
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const ProfileScreen()),
            ),
          ),
          const SizedBox(height: 8),
          _buildListTile(
            context,
            locale,
            icon: Icons.manage_accounts_outlined,
            title: 'Настройка аккаунта',
            subtitle: 'Личные данные, пароль, удаление аккаунта',
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => const AccountSettingsScreen(),
              ),
            ),
          ),
        ];
      case SettingsHubSection.app:
        return [
          _buildListTile(
            context,
            locale,
            icon: Icons.language,
            title: locale.t('settings.changeLanguage'),
            onTap: () => showLanguageSelectorModal(
              context,
              locale,
              onLocaleSelected: (code) {
                final token = context.read<AuthService>().accessToken;
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
          _buildExitButton(context, locale),
        ];
    }
  }

  Widget _buildListTile(
    BuildContext context,
    LocaleProvider locale, {
    required IconData icon,
    required String title,
    String? subtitle,
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
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    if (subtitle != null && subtitle.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ],
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

  Widget _buildSectionTabs(BuildContext context, LocaleProvider locale) {
    final tabs = <({SettingsHubSection section, IconData icon, String label})>[
      (
        section: SettingsHubSection.studio,
        icon: Icons.store_outlined,
        label: 'Studio',
      ),
      (
        section: SettingsHubSection.booking,
        icon: Icons.public_outlined,
        label: 'Booking',
      ),
      (
        section: SettingsHubSection.account,
        icon: Icons.manage_accounts_outlined,
        label: 'Account',
      ),
      (
        section: SettingsHubSection.app,
        icon: Icons.settings_suggest_outlined,
        label: 'App',
      ),
    ];
    return SizedBox(
      height: 88,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: tabs.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final item = tabs[index];
          final isActive = item.section == initialSection;
          return InkWell(
            onTap: () => Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (_) => AppSettingsScreen(initialSection: item.section),
              ),
            ),
            borderRadius: BorderRadius.circular(12),
            child: Container(
              width: 86,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
              decoration: BoxDecoration(
                color: isActive ? AppColors.primary500 : AppColors.neutral100,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isActive ? AppColors.primary500 : AppColors.neutral200,
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    item.icon,
                    size: 22,
                    color: isActive
                        ? AppColors.textInverse
                        : AppColors.textSecondary,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    item.label,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: isActive
                          ? AppColors.textInverse
                          : AppColors.textPrimary,
                    ),
                    maxLines: 2,
                  ),
                ],
              ),
            ),
          );
        },
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
