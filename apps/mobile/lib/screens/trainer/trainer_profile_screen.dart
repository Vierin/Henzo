import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

import '../../constants/brand_typography.dart';
import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../services/auth_service.dart';
import '../../utils/legal_web_links.dart';
import '../../utils/operator_shell_prefs.dart';
import '../../widgets/client/client_profile_sections.dart';
import '../../widgets/language_selector_modal.dart';
import '../../widgets/settings/feedback_sheet.dart';
import '../../widgets/settings/settings_list_widgets.dart';
import '../account_settings_screen.dart';

class TrainerProfileScreen extends StatefulWidget {
  const TrainerProfileScreen({super.key});

  @override
  State<TrainerProfileScreen> createState() => _TrainerProfileScreenState();
}

class _TrainerProfileScreenState extends State<TrainerProfileScreen>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  Future<void> _logout(BuildContext context) async {
    await context.read<AuthService>().logout();
    if (!context.mounted) return;
    Navigator.of(context, rootNavigator: true)
        .popUntil((route) => route.isFirst);
  }

  String? _accessLevelLabel(LocaleProvider locale, String? accessLevel) {
    if (accessLevel == null || accessLevel.isEmpty) return null;
    if (accessLevel == 'ADMIN') return locale.t('trainer.accessAdmin');
    if (accessLevel == 'EMPLOYEE') return locale.t('trainer.accessEmployee');
    return null;
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final locale = context.watch<LocaleProvider>();
    final auth = context.watch<AuthService>();
    final trainer = auth.trainerInfo;
    final user = auth.user;

    final userName = user?.name?.trim() ?? '';
    final trainerName = trainer?.name.trim() ?? '';
    final name = userName.isNotEmpty
        ? userName
        : (trainerName.isNotEmpty ? trainerName : locale.t('trainer.role'));
    final email = (user?.email ?? trainer?.email ?? '').trim();
    final studio = trainer?.studioName.trim();
    final accessLabel = _accessLevelLabel(locale, trainer?.accessLevel) ??
        (trainer != null ? locale.t('trainer.accessEmployee') : null);

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(
            kScreenPaddingHorizontal,
            12,
            kScreenPaddingHorizontal,
            28,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                locale.t('clientProfile.title'),
                style: BrandTypography.greeting(context).copyWith(
                  fontSize: 28.sp,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 20),
              ClientProfileUserRow(
                name: name,
                email: email,
                location: studio?.isNotEmpty == true ? studio : null,
                avatarUrl: user?.avatarUrl,
                roleLabel: accessLabel,
              ),
              const SizedBox(height: 20),
              SettingsGroupCard(
                children: [
                  SettingsListTile(
                    svgAsset: 'assets/icons/icon-profile.svg',
                    title: locale.t('profileForm.accountSettings'),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const AccountSettingsScreen(),
                        ),
                      );
                    },
                  ),
                  if (auth.isStudioOperator)
                    SettingsListTile(
                      icon: Icons.swap_horiz_rounded,
                      title: locale.t('settings.switchToOwnerPanel'),
                      onTap: () => OperatorShellPrefs.preferOwner(),
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
                    onTap: () => openLegalWebPage(
                      context,
                      locale,
                      '/terms-of-service',
                    ),
                  ),
                  SettingsListTile(
                    svgAsset: 'assets/icons/icon-settings.svg',
                    title: locale.t('settings.privacyPolicy'),
                    onTap: () => openLegalWebPage(
                      context,
                      locale,
                      '/privacy-policy',
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
                onTap: () => _logout(context),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
