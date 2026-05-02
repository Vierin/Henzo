import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config/app_config.dart';
import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../services/auth_service.dart';
import '../../widgets/client/client_settings_item_tile.dart';
import 'client_edit_profile_screen.dart';

class ClientProfileSettingsScreen extends StatelessWidget {
  const ClientProfileSettingsScreen({super.key});

  Future<void> _logout(BuildContext context) async {
    await context.read<AuthService>().logout();
    if (!context.mounted) return;
    Navigator.of(
      context,
      rootNavigator: true,
    ).popUntil((route) => route.isFirst);
  }

  Future<void> _openWebPage(
    BuildContext context,
    String localeTag,
    String path,
  ) async {
    final uri = Uri.parse('${AppConfig.webUrl}/$localeTag$path');
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened && context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Failed to open link')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        title: const Text('Profile settings'),
        backgroundColor: AppColors.backgroundPrimary,
        foregroundColor: AppColors.textPrimary,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ClientSettingsItemTile(
                icon: Icons.person_outline,
                title: 'Edit profile',
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const ClientEditProfileScreen(),
                    ),
                  );
                },
              ),
              const SizedBox(height: 10),
              ClientSettingsItemTile(
                icon: Icons.description_outlined,
                title: 'Terms of use',
                onTap: () => _openWebPage(
                  context,
                  context.read<LocaleProvider>().languageTag,
                  '/terms-of-service',
                ),
              ),
              const SizedBox(height: 10),
              ClientSettingsItemTile(
                icon: Icons.privacy_tip_outlined,
                title: 'Privacy policy',
                onTap: () => _openWebPage(
                  context,
                  context.read<LocaleProvider>().languageTag,
                  '/privacy-policy',
                ),
              ),
              const Spacer(),
              FilledButton.icon(
                onPressed: () => _logout(context),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.error500,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                icon: const Icon(Icons.logout),
                label: const Text('Logout'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
