import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/app_config.dart';
import '../constants/colors.dart';
import '../constants/layout.dart';
import '../l10n/locale_provider.dart';
import '../models/salon.dart';
import '../models/staff_member.dart';
import '../models/subscription.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../services/cache/salon_cache.dart';
import '../services/cache/services_staff_cache.dart';
import '../services/dashboard_api_service.dart';
import '../services/push_notification_service.dart';
import '../widgets/language_selector_modal.dart';
import 'account_settings_screen.dart';
import '../widgets/settings/owner_booking_period_sheet.dart';
import 'settings_screen.dart';
import 'services_screen.dart';
import 'staff_screen.dart';
import 'subscription_screen.dart';

class AppSettingsScreen extends StatefulWidget {
  const AppSettingsScreen({super.key, this.embeddedInShell = false});

  final bool embeddedInShell;

  @override
  State<AppSettingsScreen> createState() => _AppSettingsScreenState();
}

class _AppSettingsScreenState extends State<AppSettingsScreen> {
  static const int _defaultBookingPeriodDays = 28;

  int _servicesCount = 0;
  int _staffCount = 0;
  int? _bookingPeriodDays;
  bool _statsLoading = true;
  String? _studioName;
  Salon? _salon;
  Subscription? _subscription;
  bool _subscriptionLoading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
  }

  Future<void> _loadData() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (!mounted) return;
      setState(() {
        _statsLoading = false;
        _subscriptionLoading = false;
      });
      return;
    }
    final salonCache = context.read<SalonCache>();
    final staffCache = context.read<ServicesStaffCache>();
    try {
      final results = await Future.wait([
        salonCache.getSalon(token),
        DashboardApiService.getCurrentSubscription(token),
      ]);
      final salon = results[0] as Salon?;
      final sub = results[1] as Subscription?;
      final services = salon != null
          ? await staffCache.getServicesForSalon(token, salon.id)
          : const [];
      final staff = salon != null
          ? await staffCache.getStaffForSalon(token, salon.id)
          : <StaffMember>[];
      if (!mounted) return;
      final owner = context.read<AuthService>().user;
      setState(() {
        _salon = salon;
        _studioName = salon?.name;
        _bookingPeriodDays = extractBookingPeriodDays(salon);
        _servicesCount = services.length;
        _staffCount = _teamDisplayCount(staff, owner);
        _subscription = sub;
        _statsLoading = false;
        _subscriptionLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _statsLoading = false;
        _subscriptionLoading = false;
      });
    }
  }

  int _teamDisplayCount(List<StaffMember> staff, UserModel? owner) {
    var count = staff.length;
    if (owner == null) return count > 0 ? count : 1;
    final ownerEmail = owner.email.trim().toLowerCase();
    if (ownerEmail.isEmpty) return count + 1;
    final ownerInList = staff.any(
      (m) => (m.email ?? '').trim().toLowerCase() == ownerEmail,
    );
    if (!ownerInList) count += 1;
    return count;
  }

  Future<void> _openBookingPeriodSheet() async {
    final salon = _salon;
    if (salon == null) return;
    final changed = await showOwnerBookingPeriodSheet(
      context,
      salon: salon,
      initialDays: _bookingPeriodDays,
    );
    if (changed == true && mounted) await _loadData();
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

  String _planBadgeLabel(LocaleProvider locale) {
    if (_subscriptionLoading) return locale.t('common.loading');
    final sub = _subscription;
    final isFree =
        sub == null ||
        (sub.type.toUpperCase() == 'FREEMIUM' && (sub.amount ?? 0) <= 0);
    if (isFree) return locale.t('profile.free');
    switch (sub.type.toUpperCase()) {
      case 'PRO':
        return locale.t('profile.pro');
      default:
        return sub.type;
    }
  }

  String _ownerSubtitle(LocaleProvider locale) {
    final role = locale.t('settings.owner.ownerRole');
    final studio = _studioName?.trim();
    if (studio != null && studio.isNotEmpty) {
      return '$role · $studio';
    }
    return role;
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<LocaleProvider>(
      builder: (context, locale, _) {
        final theme = Theme.of(context);
        final textTheme = theme.textTheme;
        final user = context.watch<AuthService>().user;
        final ownerName = (user?.name?.trim().isNotEmpty ?? false)
            ? user!.name!.trim()
            : locale.t('settings.owner.ownerRole');
        final initials = ownerName
            .split(' ')
            .where((x) => x.isNotEmpty)
            .take(2)
            .map((x) => x[0].toUpperCase())
            .join();

        final bookingDays = _bookingPeriodDays ?? _defaultBookingPeriodDays;
        final bookingTrailing = _statsLoading
            ? ''
            : locale
                  .t('settings.owner.bookingWindowDays')
                  .replaceAll('{count}', '$bookingDays');

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
            child: RefreshIndicator(
              onRefresh: _loadData,
              color: AppColors.primary500,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(
                  kScreenPaddingHorizontal,
                  12,
                  kScreenPaddingHorizontal,
                  24,
                ),
                children: [
                  Text(
                    locale.t('settings.title'),
                    style:
                        textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                          letterSpacing: -0.3,
                        ) ??
                        const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                          letterSpacing: -0.3,
                        ),
                  ),
                  const SizedBox(height: 16),
                  _OwnerHeroCard(
                    name: ownerName,
                    subtitle: _ownerSubtitle(locale),
                    initials: initials.isEmpty ? 'OW' : initials,
                    planLabel: _planBadgeLabel(locale),
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const AccountSettingsScreen(),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  _SectionLabel(
                    title: locale.t('settings.owner.sectionStudio'),
                  ),
                  const SizedBox(height: 8),
                  _SettingsGroupCard(
                    children: [
                      _SettingsTile(
                        icon: Icons.storefront_outlined,
                        title: locale.t('settings.owner.studioProfile'),
                        trailingText: _studioName?.trim() ?? '',
                        onTap: () async {
                          await Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const SettingsScreen(),
                            ),
                          );
                          if (mounted) await _loadData();
                        },
                      ),
                      _SettingsTile(
                        icon: Icons.calendar_month_outlined,
                        title: locale.t('settings.owner.onlineBooking'),
                        trailingText: bookingTrailing,
                        onTap: _openBookingPeriodSheet,
                      ),
                      _SettingsTile(
                        icon: Icons.fitness_center_outlined,
                        title: locale.t('settings.owner.trainings'),
                        trailingText: _statsLoading
                            ? ''
                            : locale
                                  .t('settings.owner.trainingsCount')
                                  .replaceAll('{count}', '$_servicesCount'),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const ServicesScreen(),
                          ),
                        ),
                      ),
                      _SettingsTile(
                        icon: Icons.groups_outlined,
                        title: locale.t('settings.owner.team'),
                        trailingText: _statsLoading ? '' : '$_staffCount',
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const StaffScreen(),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _SectionLabel(
                    title: locale.t('settings.owner.sectionAccount'),
                  ),
                  const SizedBox(height: 8),
                  _SettingsGroupCard(
                    children: [
                      _SettingsTile(
                        icon: Icons.credit_card_outlined,
                        title: locale.t('settings.owner.subscriptionBilling'),
                        onTap: () async {
                          await Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const SubscriptionScreen(),
                            ),
                          );
                          if (mounted) await _loadData();
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _SectionLabel(title: locale.t('settings.owner.sectionApp')),
                  const SizedBox(height: 8),
                  _SettingsGroupCard(
                    children: [
                      _SettingsTile(
                        icon: Icons.language_outlined,
                        title: locale.t('settings.changeLanguage'),
                        onTap: () => showLanguageSelectorModal(
                          context,
                          locale,
                          onLocaleSelected: (code) {
                            final token =
                                context.read<AuthService>().accessToken;
                            if (token != null && token.isNotEmpty) {
                              PushNotificationService.registerToken(
                                accessToken: token,
                                language: code,
                              );
                            }
                          },
                        ),
                      ),
                      _SettingsTile(
                        icon: Icons.privacy_tip_outlined,
                        title: locale.t('settings.privacyPolicy'),
                        onTap: () =>
                            _openWebPage(context, locale, '/privacy-policy'),
                      ),
                      _SettingsTile(
                        icon: Icons.description_outlined,
                        title: locale.t('settings.termsOfUse'),
                        onTap: () =>
                            _openWebPage(context, locale, '/terms-of-service'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  _LogoutButton(
                    label: locale.t('settings.logOut'),
                    onTap: () => context.read<AuthService>().logout(),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Text(
      title.toUpperCase(),
      style:
          textTheme.labelSmall?.copyWith(
            color: AppColors.textSecondary,
            fontSize: 14,
            fontWeight: FontWeight.w500,
            letterSpacing: -0.2,
          ) ??
          const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 14,
            fontWeight: FontWeight.w500,
            letterSpacing: -0.2,
          ),
    );
  }
}

class _OwnerHeroCard extends StatelessWidget {
  const _OwnerHeroCard({
    required this.name,
    required this.subtitle,
    required this.initials,
    required this.planLabel,
    required this.onTap,
  });

  final String name;
  final String subtitle;
  final String initials;
  final String planLabel;
  final VoidCallback onTap;

  static const double _radius = 16;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.backgroundPrimary,
      borderRadius: BorderRadius.circular(_radius),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(_radius),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          child: Row(
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: AppColors.primary100,
                child: Text(
                  initials,
                  style: const TextStyle(
                    color: AppColors.primary500,
                    fontSize: 22,
                    fontWeight: FontWeight.w600,
                    height: 1,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 14,
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
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        planLabel,
                        style: const TextStyle(
                          color: AppColors.primary700,
                          fontSize: 13,
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
                size: 22,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SettingsGroupCard extends StatelessWidget {
  const _SettingsGroupCard({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderPrimary),
      ),
      child: Column(
        children: [
          for (int i = 0; i < children.length; i++) ...[
            children[i],
            if (i != children.length - 1)
              const Divider(
                height: 1,
                indent: 58,
                endIndent: 12,
                color: AppColors.borderPrimary,
              ),
          ],
        ],
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.trailingText = '',
  });

  final IconData icon;
  final String title;
  final String trailingText;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final trailing = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (trailingText.isNotEmpty) ...[
          ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.sizeOf(context).width * 0.34,
            ),
            child: Text(
              trailingText,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.right,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(width: 4),
        ],
        const Icon(
          Icons.chevron_right,
          size: 20,
          color: AppColors.textSecondary,
        ),
      ],
    );

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primary100,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: AppColors.primary500, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              trailing,
            ],
          ),
        ),
      ),
    );
  }
}

class _LogoutButton extends StatelessWidget {
  const _LogoutButton({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.error500, width: 1.5),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 15,
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
