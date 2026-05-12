import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../constants/colors.dart';
import '../config/app_config.dart';
import '../l10n/locale_provider.dart';
import '../services/analytics_service.dart';
import '../services/auth_service.dart';
import '../services/cache/salon_cache.dart';
import '../services/cache/services_staff_cache.dart';
import '../widgets/language_selector_modal.dart';
import '../services/push_notification_service.dart';
import 'account_settings_screen.dart';
import 'online_booking_screen.dart';
import 'profile_screen.dart';
import 'settings_screen.dart';
import 'services_screen.dart';
import 'staff_screen.dart';
import 'subscription_screen.dart';

enum SettingsHubSection { studio, account, app }

class AppSettingsScreen extends StatefulWidget {
  const AppSettingsScreen({
    super.key,
    this.initialSection = SettingsHubSection.studio,
    this.embeddedInShell = false,
  });

  final SettingsHubSection initialSection;
  final bool embeddedInShell;

  @override
  State<AppSettingsScreen> createState() => _AppSettingsScreenState();
}

class _AppSettingsScreenState extends State<AppSettingsScreen> {
  bool _classReminders = true;
  bool _bookingConfirmations = true;
  bool _winBackNudges = false;
  bool _analyticsOptIn = AnalyticsService.instance.isOptedIn;
  int _servicesCount = 0;
  int _staffCount = 0;
  bool _statsLoading = true;
  String? _studioName;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadStats());
  }

  Future<void> _loadStats() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (!mounted) return;
      setState(() => _statsLoading = false);
      return;
    }
    try {
      final salon = await context.read<SalonCache>().getSalon(token);
      final services = salon != null
          ? await context.read<ServicesStaffCache>().getServicesForSalon(
              token,
              salon.id,
            )
          : const [];
      final staff = salon != null
          ? await context.read<ServicesStaffCache>().getStaffForSalon(
              token,
              salon.id,
            )
          : const [];
      if (!mounted) return;
      setState(() {
        _studioName = salon?.name;
        _servicesCount = services.length;
        _staffCount = staff.length;
        _statsLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _statsLoading = false);
    }
  }

  Future<void> _openWebPage(
    BuildContext context,
    LocaleProvider locale,
    String path,
  ) async {
    final uri = Uri.parse('${AppConfig.webUrl}/${locale.languageTag}$path');
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened && context.mounted) {
      ScaffoldMessenger.maybeOf(
        context,
      )?.showSnackBar(SnackBar(content: Text(locale.t('errors.generic'))));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<LocaleProvider>(
      builder: (context, locale, _) {
        final user = context.watch<AuthService>().user;
        final ownerName = (user?.name?.trim().isNotEmpty ?? false)
            ? user!.name!.trim()
            : 'Owner';
        final initials = ownerName
            .split(' ')
            .where((x) => x.isNotEmpty)
            .take(2)
            .map((x) => x[0].toUpperCase())
            .join();

        return Scaffold(
          backgroundColor: AppColors.backgroundSecondary,
          appBar: widget.embeddedInShell
              ? null
              : AppBar(
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
                ),
          body: SafeArea(
            top: true,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              children: [
                Text(
                  locale.t('settings.title'),
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    height: 1,
                  ),
                ),
                const SizedBox(height: 18),
                _buildOwnerCard(
                  name: ownerName,
                  subtitle:
                      'Owner${_studioName != null && _studioName!.isNotEmpty ? ' \u00b7 $_studioName' : ''}',
                  initials: initials.isEmpty ? 'OW' : initials,
                ),
                const SizedBox(height: 20),
                _sectionLabel('STUDIO'),
                const SizedBox(height: 8),
                _groupCard([
                  _settingsTile(
                    icon: Icons.spa_outlined,
                    title: 'Studio profile',
                    trailingText: _studioName ?? '',
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const SettingsScreen()),
                    ),
                  ),
                  _settingsTile(
                    icon: Icons.calendar_month_outlined,
                    title: 'Hours & rooms',
                    trailingText: '',
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const OnlineBookingScreen(),
                      ),
                    ),
                  ),
                  _settingsTile(
                    icon: Icons.inventory_2_outlined,
                    title: 'Packages & passes',
                    trailingText: _statsLoading ? '' : '$_servicesCount active',
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) =>
                            const ServicesScreen(trainingMode: true),
                      ),
                    ),
                  ),
                  _settingsTile(
                    icon: Icons.group_outlined,
                    title: 'Instructors',
                    trailingText: _statsLoading ? '' : '$_staffCount',
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const StaffScreen()),
                    ),
                  ),
                ]),
                const SizedBox(height: 16),
                _sectionLabel('NOTIFICATIONS'),
                const SizedBox(height: 8),
                _groupCard([
                  _switchTile(
                    icon: Icons.notifications_none_rounded,
                    title: 'Class reminders',
                    value: _classReminders,
                    onChanged: (v) => setState(() => _classReminders = v),
                  ),
                  _switchTile(
                    icon: Icons.chat_bubble_outline_rounded,
                    title: 'Booking confirmations',
                    value: _bookingConfirmations,
                    onChanged: (v) => setState(() => _bookingConfirmations = v),
                  ),
                  _switchTile(
                    icon: Icons.auto_awesome_outlined,
                    title: 'Win-back nudges',
                    value: _winBackNudges,
                    onChanged: (v) => setState(() => _winBackNudges = v),
                  ),
                ]),
                const SizedBox(height: 16),
                _sectionLabel('PRIVACY'),
                const SizedBox(height: 8),
                _groupCard([
                  _switchTile(
                    icon: Icons.insights_outlined,
                    title: 'Allow anonymous analytics',
                    value: _analyticsOptIn,
                    onChanged: (v) {
                      setState(() => _analyticsOptIn = v);
                      AnalyticsService.instance.setOptIn(v);
                    },
                  ),
                ]),
                const SizedBox(height: 16),
                _sectionLabel('ACCOUNT'),
                const SizedBox(height: 8),
                _groupCard([
                  _settingsTile(
                    icon: Icons.credit_card_outlined,
                    title: 'Billing',
                    trailingText: '',
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const SubscriptionScreen(),
                      ),
                    ),
                  ),
                  _settingsTile(
                    icon: Icons.person_outline,
                    title: 'Profile',
                    trailingText: '',
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const ProfileScreen()),
                    ),
                  ),
                  _settingsTile(
                    icon: Icons.manage_accounts_outlined,
                    title: 'Account settings',
                    trailingText: '',
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const AccountSettingsScreen(),
                      ),
                    ),
                  ),
                  _settingsTile(
                    icon: Icons.language,
                    title: locale.t('settings.changeLanguage'),
                    trailingText: '',
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
                  _settingsTile(
                    icon: Icons.description_outlined,
                    title: locale.t('settings.privacyPolicy'),
                    trailingText: '',
                    onTap: () =>
                        _openWebPage(context, locale, '/privacy-policy'),
                  ),
                  _settingsTile(
                    icon: Icons.description_outlined,
                    title: locale.t('settings.termsOfUse'),
                    trailingText: '',
                    onTap: () =>
                        _openWebPage(context, locale, '/terms-of-service'),
                  ),
                ]),
                const SizedBox(height: 14),
                if (!widget.embeddedInShell) _buildExitButton(context, locale),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _sectionLabel(String title) {
    return Text(
      title,
      style: const TextStyle(
        color: AppColors.textSecondary,
        fontSize: 16,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.2,
      ),
    );
  }

  Widget _buildOwnerCard({
    required String name,
    required String subtitle,
    required String initials,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          Container(
            width: 66,
            height: 66,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.primary50,
              border: Border.all(color: AppColors.primary500, width: 1.4),
            ),
            child: Text(
              initials,
              style: const TextStyle(
                color: AppColors.primary700,
                fontSize: 28,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary100,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text(
                    'Pro plan',
                    style: TextStyle(
                      color: AppColors.primary700,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Icon(
            Icons.chevron_right,
            color: AppColors.textSecondary,
            size: 24,
          ),
        ],
      ),
    );
  }

  Widget _groupCard(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          for (int i = 0; i < children.length; i++) ...[
            children[i],
            if (i != children.length - 1)
              const Divider(
                height: 1,
                indent: 64,
                endIndent: 16,
                color: AppColors.borderPrimary,
              ),
          ],
        ],
      ),
    );
  }

  Widget _settingsTile({
    required IconData icon,
    required String title,
    required String trailingText,
    required VoidCallback onTap,
  }) {
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      leading: _tileIcon(icon),
      title: Text(
        title,
        style: const TextStyle(
          color: AppColors.textPrimary,
          fontSize: 16,
          fontWeight: FontWeight.w500,
        ),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (trailingText.isNotEmpty)
            Text(
              trailingText,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
          const SizedBox(width: 4),
          const Icon(
            Icons.chevron_right,
            size: 22,
            color: AppColors.textSecondary,
          ),
        ],
      ),
    );
  }

  Widget _switchTile({
    required IconData icon,
    required String title,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      leading: _tileIcon(icon),
      title: Text(
        title,
        style: const TextStyle(
          color: AppColors.textPrimary,
          fontSize: 16,
          fontWeight: FontWeight.w500,
        ),
      ),
      trailing: Switch(
        value: value,
        onChanged: onChanged,
        activeColor: AppColors.backgroundPrimary,
        activeTrackColor: AppColors.primary500,
      ),
    );
  }

  Widget _tileIcon(IconData icon) {
    return Container(
      width: 42,
      height: 42,
      decoration: BoxDecoration(
        color: AppColors.primary100,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(icon, color: AppColors.primary700, size: 22),
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
