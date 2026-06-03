import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
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
import '../utils/legal_web_links.dart';
import '../utils/subscription_tier.dart';
import '../widgets/language_selector_modal.dart';
import 'account_settings_screen.dart';
import '../widgets/settings/feedback_sheet.dart';
import '../widgets/settings/owner_booking_period_sheet.dart';
import '../widgets/settings/settings_header_back_button.dart';
import '../widgets/settings/settings_list_widgets.dart';
import '../widgets/settings/settings_typography.dart';
import 'dashboard/owner_studio_reviews_screen.dart';
import 'public_studio_detail_screen.dart';
import 'settings_screen.dart';
import 'services_screen.dart';
import 'staff_screen.dart';
import 'subscription_screen.dart';
import '../main.dart';
import '../utils/owner_navigation_restore.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class AppSettingsScreen extends StatefulWidget {
  const AppSettingsScreen({super.key, this.embeddedInShell = false});

  final bool embeddedInShell;

  @override
  State<AppSettingsScreen> createState() => _AppSettingsScreenState();
}

class _AppSettingsScreenState extends State<AppSettingsScreen> {
  static const int _defaultBookingPeriodDays = 30;

  static const int _soloClassLimit = 12;
  static const int _soloTrainerLimit = 1;

  int _servicesCount = 0;
  int _staffCount = 0;
  int _monthlySessionsCount = 0;
  int? _bookingPeriodDays;
  bool _statsLoading = true;
  String? _studioName;
  Salon? _salon;
  Subscription? _subscription;
  bool _subscriptionLoading = true;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _loadData();
      await _reopenAccountSettingsAfterPhotoInterrupt();
    });
  }

  Future<void> _reopenAccountSettingsAfterPhotoInterrupt() async {
    final pending =
        await OwnerNavigationRestore.consumePendingProfilePhotoUpload();
    if (!pending || !mounted) return;

    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const AccountSettingsScreen()));
    if (!mounted) return;

    final rootCtx = henzoRootNavigatorKey.currentContext;
    final messenger = rootCtx != null
        ? ScaffoldMessenger.maybeOf(rootCtx)
        : ScaffoldMessenger.maybeOf(context);
    messenger?.showSnackBar(
      const SnackBar(
        content: Text('Приложение перезапустилось. Выберите фото ещё раз.'),
      ),
    );
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
      final now = DateTime.now();
      final monthStart = DateTime(now.year, now.month, 1);
      final monthEnd = DateTime(now.year, now.month + 1, 1)
          .subtract(const Duration(seconds: 1));
      final results = await Future.wait([
        salonCache.getSalon(token),
        DashboardApiService.getCurrentSubscription(token),
        DashboardApiService.getCurrentStudioAnalytics(
          token,
          fromIso: monthStart.toIso8601String(),
          toIso: monthEnd.toIso8601String(),
        ),
      ]);
      final salon = results[0] as Salon?;
      final sub = results[1] as Subscription?;
      final analytics = results[2] as StudioAnalytics?;
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
        _monthlySessionsCount =
            analytics?.trainingSessionsScheduled ?? 0;
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

  bool get _hasActiveProPlan {
    final sub = _subscription;
    if (sub == null) return false;
    return subscriptionTypeIsPaid(sub.type) && sub.isActive;
  }

  String _planBadgeLabel(LocaleProvider locale) {
    if (_subscriptionLoading) return locale.t('common.loading');
    if (_hasActiveProPlan) {
      return locale.t('settings.owner.activeProPlan');
    }
    final sub = _subscription;
    if (sub == null || subscriptionTypeIsSolo(sub.type)) {
      return locale.t('profile.free');
    }
    final localeKey = subscriptionPlanLabelKey(sub.type);
    if (localeKey.startsWith('subscription.')) {
      return locale.t(localeKey);
    }
    return sub.type;
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
        final user = context.watch<AuthService>().user;
        final ownerName = (user?.name?.trim().isNotEmpty ?? false)
            ? user!.name!.trim()
            : (user?.email.trim().isNotEmpty ?? false)
            ? user!.email.trim()
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
                  leading: SettingsHeaderBackButton(
                    onPressed: () => Navigator.pop(context),
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
                    style: SettingsTypography.screenTitle(context),
                  ),
                  const SizedBox(height: 16),
                  _OwnerHeroCard(
                    name: ownerName,
                    subtitle: _ownerSubtitle(locale),
                    initials: initials.isEmpty ? 'OW' : initials,
                    avatarUrl: user?.avatarUrl?.trim().isNotEmpty == true
                        ? user!.avatarUrl!.trim()
                        : null,
                    planLabel: _planBadgeLabel(locale),
                    isProPlan: _hasActiveProPlan,
                    monthlySessionsCount: _monthlySessionsCount,
                    monthlySessionsLimit: _soloClassLimit,
                    staffCount: _staffCount,
                    staffLimit: _soloTrainerLimit,
                    statsLoading: _statsLoading,
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const AccountSettingsScreen(),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  SettingsSectionLabel(
                    title: locale.t('settings.owner.sectionPayments'),
                  ),
                  const SizedBox(height: 8),
                  SettingsGroupCard(
                    children: [
                      SettingsListTile(
                        svgAsset: 'assets/icons/icon-card.svg',
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
                  SettingsSectionLabel(
                    title: locale.t('settings.owner.sectionStudio'),
                  ),
                  const SizedBox(height: 8),
                  SettingsGroupCard(
                    children: [
                      SettingsListTile(
                        svgAsset: 'assets/icons/icon-studio.svg',
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
                      SettingsListTile(
                        svgAsset: 'assets/icons/icon-calendar.svg',
                        title: locale.t('settings.owner.onlineBooking'),
                        trailingText: bookingTrailing,
                        onTap: _openBookingPeriodSheet,
                      ),
                      SettingsListTile(
                        svgAsset: 'assets/icons/icon-train.svg',
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
                      SettingsListTile(
                        svgAsset: 'assets/icons/icon-people.svg',
                        title: locale.t('settings.owner.team'),
                        trailingText: _statsLoading ? '' : '$_staffCount',
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const StaffScreen(),
                          ),
                        ),
                      ),
                      SettingsListTile(
                        icon: Icons.visibility_outlined,
                        title: locale.t('settings.owner.bookingLink'),
                        onTap: () {
                          final salon = _salon;
                          if (salon == null) return;
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => PublicStudioDetailScreen(studioId: salon.id),
                            ),
                          );
                        },
                      ),
                      SettingsListTile(
                        icon: Icons.star_outline,
                        title: locale.t('dashboard.reviewsTitle'),
                        onTap: () {
                          final studioId = _salon?.id ?? '';
                          if (studioId.isEmpty) return;
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => OwnerStudioReviewsScreen(
                                studioId: studioId,
                              ),
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
                      SettingsListTile(
                        svgAsset: 'assets/icons/icon-shield.svg',
                        title: locale.t('settings.privacyPolicy'),
                        onTap: () =>
                            openLegalWebPage(
                              context,
                              locale,
                              '/privacy-policy',
                            ),
                      ),
                      SettingsListTile(
                        icon: Icons.description_outlined,
                        title: locale.t('settings.termsOfUse'),
                        onTap: () =>
                            openLegalWebPage(
                              context,
                              locale,
                              '/terms-of-service',
                            ),
                      ),
                      SettingsListTile(
                        icon: Icons.chat_bubble_outline,
                        title: locale.t('settings.feedback.sendFeedback'),
                        onTap: () => showFeedbackSheet(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  SettingsLogoutButton(
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

class _OwnerHeroCard extends StatelessWidget {
  const _OwnerHeroCard({
    required this.name,
    required this.subtitle,
    required this.initials,
    required this.avatarUrl,
    required this.planLabel,
    required this.isProPlan,
    required this.monthlySessionsCount,
    required this.monthlySessionsLimit,
    required this.staffCount,
    required this.staffLimit,
    required this.statsLoading,
    required this.onTap,
  });

  final String name;
  final String subtitle;
  final String initials;
  final String? avatarUrl;
  final String planLabel;
  final bool isProPlan;
  final int monthlySessionsCount;
  final int monthlySessionsLimit;
  final int staffCount;
  final int staffLimit;
  final bool statsLoading;
  final VoidCallback onTap;

  static const double _radius = 14;
  static const double _avatarRadius = 38;

  @override
  Widget build(BuildContext context) {
    final hasPhoto = avatarUrl != null && avatarUrl!.isNotEmpty;

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
                radius: _avatarRadius,
                backgroundColor: AppColors.primary100,
                backgroundImage: hasPhoto ? NetworkImage(avatarUrl!) : null,
                child: hasPhoto
                    ? null
                    : Text(
                        initials,
                        style: TextStyle(
                          color: AppColors.primary500,
                          fontSize: 24.sp,
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
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 16.sp,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 14.sp,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: EdgeInsets.symmetric(
                        horizontal: isProPlan ? 14 : 10,
                        vertical: isProPlan ? 6 : 5,
                      ),
                      decoration: BoxDecoration(
                        color: isProPlan
                            ? kSettingsProBadgeBackground
                            : AppColors.primary100,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        planLabel,
                        style: TextStyle(
                          color: isProPlan
                              ? kSettingsProBadgeText
                              : AppColors.primary700,
                          fontSize: isProPlan ? 13 : 12,
                          fontWeight:
                              isProPlan ? FontWeight.w500 : FontWeight.w600,
                          height: 1.15,
                          letterSpacing: isProPlan ? -0.1 : 0,
                        ),
                      ),
                    ),
                    if (!isProPlan && !statsLoading) ...[
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: _UsageStat(
                              icon: Icons.calendar_today_outlined,
                              label: context
                                  .read<LocaleProvider>()
                                  .t('settings.usage.classesThisMonth'),
                              used: monthlySessionsCount,
                              limit: monthlySessionsLimit,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _UsageStat(
                              icon: Icons.people_outline,
                              label: context
                                  .read<LocaleProvider>()
                                  .t('settings.usage.trainers'),
                              used: staffCount,
                              limit: staffLimit,
                            ),
                          ),
                        ],
                      ),
                    ],
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

class _UsageStat extends StatelessWidget {
  const _UsageStat({
    required this.icon,
    required this.label,
    required this.used,
    required this.limit,
  });

  final IconData icon;
  final String label;
  final int used;
  final int limit;

  @override
  Widget build(BuildContext context) {
    final isAtLimit = used >= limit;
    final accent = isAtLimit ? AppColors.error500 : AppColors.primary500;
    final circleBg = isAtLimit ? AppColors.error50 : AppColors.primary100;

    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: circleBg,
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: Icon(icon, size: 18, color: accent),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$used/$limit',
                style: TextStyle(
                  fontSize: 15.sp,
                  fontWeight: FontWeight.w700,
                  color: accent,
                  height: 1.1,
                ),
              ),
              Text(
                label,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 10.sp,
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w500,
                  height: 1.2,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
