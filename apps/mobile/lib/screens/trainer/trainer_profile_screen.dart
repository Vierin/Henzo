import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../services/auth_service.dart';
import '../../widgets/client/client_profile_sections.dart';
import 'trainer_profile_settings_screen.dart';

class TrainerProfileScreen extends StatefulWidget {
  const TrainerProfileScreen({super.key});

  @override
  State<TrainerProfileScreen> createState() => _TrainerProfileScreenState();
}

class _TrainerProfileScreenState extends State<TrainerProfileScreen>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

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

    final trainerName = trainer?.name.trim() ?? '';
    final userName = user?.name?.trim() ?? '';
    final name = trainerName.isNotEmpty
        ? trainerName
        : (userName.isNotEmpty ? userName : locale.t('trainer.role'));
    final email = (user?.email ?? trainer?.email ?? '').trim();
    final studio = trainer?.studioName.trim();
    final studioLogo = trainer?.studioLogoUrl?.trim();
    final accessLabel = _accessLevelLabel(locale, trainer?.accessLevel);
    final trainings = trainer?.trainings ?? const [];

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(
            kScreenPaddingHorizontal,
            12,
            kScreenPaddingHorizontal,
            28,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ClientProfileHeader(
                title: locale.t('clientProfile.title'),
                onSettings: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const TrainerProfileSettingsScreen(),
                    ),
                  );
                },
              ),
              const SizedBox(height: 20),
              ClientProfileUserRow(
                name: name,
                email: email,
                location: studio?.isNotEmpty == true ? studio : null,
                avatarUrl: user?.avatarUrl,
              ),
              if (accessLabel != null) ...[
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primary100,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      accessLabel,
                      style: TextStyle(
                        fontSize: 12.sp,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary700,
                      ),
                    ),
                  ),
                ),
              ],
              if (studio?.isNotEmpty == true) ...[
                const SizedBox(height: 16),
                _StudioRow(
                  studioName: studio!,
                  logoUrl: studioLogo,
                ),
              ],
              if (trainings.isNotEmpty) ...[
                const SizedBox(height: 20),
                Text(
                  locale.t('trainer.assignedTrainings'),
                  style: TextStyle(
                    fontSize: 15.sp,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 10),
                ...trainings.map(
                  (training) => Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.backgroundPrimary,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      training.name,
                      style: TextStyle(
                        fontSize: 14.sp,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _StudioRow extends StatelessWidget {
  const _StudioRow({
    required this.studioName,
    this.logoUrl,
  });

  final String studioName;
  final String? logoUrl;

  @override
  Widget build(BuildContext context) {
    final initial =
        studioName.isNotEmpty ? studioName.characters.first.toUpperCase() : '?';
    final hasLogo = logoUrl != null && logoUrl!.isNotEmpty;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: AppColors.primary100,
            backgroundImage: hasLogo ? NetworkImage(logoUrl!) : null,
            child: hasLogo
                ? null
                : Text(
                    initial,
                    style: TextStyle(
                      fontSize: 16.sp,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary700,
                    ),
                  ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              studioName,
              style: TextStyle(
                fontSize: 15.sp,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
