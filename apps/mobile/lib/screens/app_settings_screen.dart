import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import '../constants/colors.dart';
import '../constants/layout.dart';
import '../l10n/locale_provider.dart';
import '../models/studio.dart';
import '../models/staff_member.dart';
import '../models/subscription.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../services/cache/studio_cache.dart';
import '../services/cache/services_staff_cache.dart';
import '../services/dashboard_api_service.dart';
import '../services/push_notification_service.dart';
import '../services/subscription_refresh_notifier.dart';
import '../utils/legal_web_links.dart';
import '../utils/operator_shell_prefs.dart';
import '../config/plan_limits.dart';
import '../utils/subscription_tier.dart';
import '../widgets/language_selector_modal.dart';
import 'account_settings_screen.dart';
import '../widgets/settings/feedback_sheet.dart';
import '../widgets/settings/owner_auto_confirm_sheet.dart';
import '../widgets/settings/owner_booking_period_sheet.dart';
import '../widgets/settings/owner_client_reminders_sheet.dart';
import '../widgets/settings/settings_header_back_button.dart';
import '../widgets/settings/settings_list_widgets.dart';
import '../widgets/settings/settings_typography.dart';
import 'dashboard/owner_studio_reviews_screen.dart';
import 'settings_screen.dart';
import 'services_screen.dart';
import 'staff_screen.dart';
import 'subscription_screen.dart';
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

  int _servicesCount = 0;
  int _staffCount = 0;
  int _monthlySessionsCount = 0;
  int? _bookingPeriodDays;
  bool _statsLoading = true;
  String? _studioName;
  Studio? _studio;
  Subscription? _subscription;
  bool _subscriptionLoading = true;
  bool? _autoConfirmOverride;
  int _autoConfirmReq = 0;
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

    if (!context.mounted) return;
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      SnackBar(
        content: Text(
          context
              .read<LocaleProvider>()
              .t('accountSettings.photoSelectionInterrupted'),
        ),
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
    final studioCache = context.read<StudioCache>();
    final staffCache = context.read<ServicesStaffCache>();
    try {
      final results = await Future.wait([
        studioCache.getStudio(token),
        DashboardApiService.getCurrentSubscription(token),
        DashboardApiService.getSubscriptionUsage(token),
      ]);
      final studio = results[0] as Studio?;
      final sub = results[1] as Subscription?;
      final usage = results[2] as PlanUsage?;
      final services = studio != null
          ? await staffCache.getServicesForStudio(token, studio.id)
          : const [];
      final staff = studio != null
          ? await staffCache.getTrainersForStudio(token, studio.id)
          : <StaffMember>[];
      if (!mounted) return;
      final owner = context.read<AuthService>().user;
      setState(() {
        _studio = studio;
        _studioName = studio?.name;
        _bookingPeriodDays = extractBookingPeriodDays(studio);
        _servicesCount = services.length;
        _staffCount = _teamDisplayCount(staff, owner);
        _subscription = sub;
        _monthlySessionsCount = usage?.sessionsUsed ?? 0;
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
    final studio = _studio;
    if (studio == null) return;
    final changed = await showOwnerBookingPeriodSheet(
      context,
      studio: studio,
      initialDays: _bookingPeriodDays,
    );
    if (changed == true && mounted) await _loadData();
  }

  bool get _autoConfirmOn =>
      _autoConfirmOverride ?? (_studio?.autoConfirmBookings ?? true);

  Future<void> _toggleAutoConfirm(bool next) async {
    final studio = _studio;
    if (studio == null) return;
    final req = ++_autoConfirmReq;
    setState(() => _autoConfirmOverride = next);
    final ok = await saveAutoConfirmBookings(context, studio, next);
    if (!mounted || req != _autoConfirmReq) return;
    if (!ok) {
      setState(() => _autoConfirmOverride = null);
      return;
    }
    await _loadData();
    if (!mounted || req != _autoConfirmReq) return;
    setState(() => _autoConfirmOverride = null);
  }

  Future<void> _openClientRemindersSheet() async {
    final studio = _studio;
    if (studio == null) return;
    final changed = await showOwnerClientRemindersSheet(
      context,
      studio: studio,
    );
    if (changed == true && mounted) await _loadData();
  }

  bool get _hasActiveProPlan {
    final sub = _subscription;
    return subscriptionIsActivePaid(type: sub?.type, status: sub?.status);
  }

  String _planBadgeLabel(LocaleProvider locale) {
    if (_subscriptionLoading) return locale.t('common.loading');
    final sub = _subscription;
    return locale.t(subscriptionPlanLabelKey(sub?.type));
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

        final usageQuota = PlanLimits.quotaForType(_subscription?.type);
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
                    showUsageLimits: usageQuota != null && !_statsLoading,
                    monthlySessionsCount: _monthlySessionsCount,
                    monthlySessionsLimit: usageQuota?.sessions ?? 0,
                    staffCount: _staffCount,
                    staffLimit: usageQuota?.trainers ?? 0,
                    statsLoading: _statsLoading,
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const AccountSettingsScreen(),
                      ),
                    ),
                  ),
                  if (context.watch<AuthService>().isTrainer) ...[
                    const SizedBox(height: 16),
                    SettingsGroupCard(
                      children: [
                        SettingsListTile(
                          icon: Icons.swap_horiz_rounded,
                          materialIconSize: 18,
                          title: locale.t('settings.switchToTrainerPanel'),
                          onTap: () => OperatorShellPrefs.preferTrainer(),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 20),
                  SettingsSectionLabel(
                    title: locale.t('settings.owner.sectionPayments'),
                  ),
                  const SizedBox(height: 8),
                  SettingsGroupCard(
                    children: [
                      SettingsListTile(
                        svgAsset: 'assets/icons/icon-card.svg',
                        svgIconSize: 11,
                        title: locale.t('settings.owner.subscriptionBilling'),
                        onTap: () async {
                          await Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const SubscriptionScreen(),
                            ),
                          );
                          if (!context.mounted) return;
                          await _loadData();
                          if (!context.mounted) return;
                          context
                              .read<SubscriptionRefreshNotifier>()
                              .notifySubscriptionMaybeChanged();
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
                        svgAsset: 'assets/icons/icon-calendar-check.svg',
                        title: locale.t('settings.owner.autoConfirmBookings'),
                        trailingWidget: Switch.adaptive(
                          value: _autoConfirmOn,
                          activeTrackColor: AppColors.primary500,
                          onChanged: _studio == null
                              ? null
                              : _toggleAutoConfirm,
                        ),
                      ),
                      SettingsListTile(
                        svgAsset: 'assets/icons/icon-bell.svg',
                        svgIconSize: 16,
                        title: locale.t('settings.owner.clientNotifications'),
                        trailingText: clientRemindersSummary(_studio, locale),
                        onTap: _openClientRemindersSheet,
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
                        svgAsset: 'assets/icons/icon-star.svg',
                        title: locale.t('dashboard.reviewsTitle'),
                        onTap: () {
                          final studioId = _studio?.id ?? '';
                          if (studioId.isEmpty) return;
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) =>
                                  OwnerStudioReviewsScreen(studioId: studioId),
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
                        svgAsset: 'assets/icons/icon-globe.svg',
                        svgIconSize: 15,
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
                        svgIconSize: 15,
                        title: locale.t('settings.privacyPolicy'),
                        onTap: () => openLegalWebPage(
                          context,
                          locale,
                          '/privacy-policy',
                        ),
                      ),
                      SettingsListTile(
                        svgAsset: 'assets/icons/icon-terms.svg',
                        svgIconSize: 15,
                        title: locale.t('settings.termsOfUse'),
                        onTap: () => openLegalWebPage(
                          context,
                          locale,
                          '/terms-of-service',
                        ),
                      ),
                      SettingsListTile(
                        icon: Icons.chat_bubble_outline,
                        materialIconSize: 15,
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
    required this.showUsageLimits,
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
  final bool showUsageLimits;
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
    final locale = context.read<LocaleProvider>();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Material(
          color: AppColors.backgroundPrimary,
          borderRadius: BorderRadius.circular(_radius),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(_radius),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
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
                  const SizedBox(width: 25),
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
                        _PlanTierBadge(label: planLabel, isPaid: isProPlan),
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
        ),
        if (showUsageLimits) ...[
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _UsageLimitCard(
                  svgAsset: 'assets/icons/icon-calendar.svg',
                  label: locale.t('settings.usage.classesThisMonth'),
                  used: monthlySessionsCount,
                  limit: monthlySessionsLimit,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _UsageLimitCard(
                  svgAsset: 'assets/icons/icon-people.svg',
                  label: locale.t('settings.usage.trainers'),
                  used: staffCount,
                  limit: staffLimit,
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

class _PlanTierBadge extends StatelessWidget {
  const _PlanTierBadge({required this.label, required this.isPaid});

  final String label;
  final bool isPaid;

  static const Color _badgeBg = Color(0xFFC2F600);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isPaid ? 12 : 10,
        vertical: isPaid ? 5 : 4,
      ),
      decoration: BoxDecoration(
        color: _badgeBg.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: AppColors.textPrimary,
          fontSize: 12.sp,
          fontWeight: FontWeight.w600,
          height: 1.1,
        ),
      ),
    );
  }
}

class _UsageLimitCard extends StatelessWidget {
  const _UsageLimitCard({
    required this.svgAsset,
    required this.label,
    required this.used,
    required this.limit,
  });

  final String svgAsset;
  final String label;
  final int used;
  final int limit;

  static const double _iconSize = 14;
  static const double _radius = 12;
  static const double _progressWidth = 52;

  @override
  Widget build(BuildContext context) {
    final progress = limit > 0 ? (used / limit).clamp(0.0, 1.0) : 0.0;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.primary500,
        borderRadius: BorderRadius.circular(_radius),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: Row(
          children: [
            SvgPicture.asset(
              svgAsset,
              width: _iconSize,
              height: _iconSize,
              colorFilter: const ColorFilter.mode(
                Colors.white,
                BlendMode.srcIn,
              ),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12.sp,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                  height: 1.1,
                ),
              ),
            ),
            SizedBox(
              width: _progressWidth,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Text(
                    '$used/$limit',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13.sp,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                      height: 1.1,
                    ),
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: SizedBox(
                      width: _progressWidth,
                      height: 3,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          ColoredBox(
                            color: Colors.white.withValues(alpha: 0.35),
                          ),
                          FractionallySizedBox(
                            alignment: Alignment.centerLeft,
                            widthFactor: progress,
                            child: const ColoredBox(color: Colors.white),
                          ),
                        ],
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
  }
}
