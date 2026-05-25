import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../constants/brand_typography.dart';
import '../../constants/colors.dart';
import '../../services/health_service.dart';
import 'client_section_header.dart';

String formatProfileCount(int value) {
  final digits = value.toString();
  if (digits.length <= 3) return digits;
  final buf = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    buf.write(digits[i]);
    final left = digits.length - i - 1;
    if (left > 0 && left % 3 == 0) buf.write(' ');
  }
  return buf.toString();
}

/// Header: title + settings.
class ClientProfileHeader extends StatelessWidget {
  const ClientProfileHeader({
    super.key,
    required this.title,
    required this.onSettings,
  });

  final String title;
  final VoidCallback onSettings;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: BrandTypography.greeting(context).copyWith(
              fontSize: 28,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onSettings,
            customBorder: const CircleBorder(),
            child: Padding(
              padding: const EdgeInsets.all(6),
              child: SvgPicture.asset(
                'assets/icons/icon-gear.svg',
                width: 22,
                height: 22,
                colorFilter: const ColorFilter.mode(
                  AppColors.textPrimary,
                  BlendMode.srcIn,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class ClientProfileUserRow extends StatelessWidget {
  const ClientProfileUserRow({
    super.key,
    required this.name,
    required this.email,
    required this.location,
    this.avatarUrl,
  });

  final String name;
  final String email;
  final String? location;
  final String? avatarUrl;

  @override
  Widget build(BuildContext context) {
    final initial = name.isNotEmpty ? name.characters.first.toUpperCase() : '?';

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CircleAvatar(
          radius: 32,
          backgroundColor: AppColors.brandAccent.withValues(alpha: 0.2),
          backgroundImage:
              avatarUrl != null && avatarUrl!.isNotEmpty
                  ? NetworkImage(avatarUrl!)
                  : null,
          child: avatarUrl == null || avatarUrl!.isEmpty
              ? Text(
                  initial,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                )
              : null,
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              if (email.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  email,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
              if (location != null && location!.isNotEmpty) ...[
                const SizedBox(height: 6),
                Row(
                  children: [
                    SvgPicture.asset(
                      'assets/icons/icon-pin-simple.svg',
                      width: 8,
                      height: 11,
                      colorFilter: const ColorFilter.mode(
                        AppColors.textTertiary,
                        BlendMode.srcIn,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        location!,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textTertiary,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class ClientProfileStatsCard extends StatelessWidget {
  const ClientProfileStatsCard({super.key, required this.items});

  final List<ClientProfileStatItem> items;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(16),
      ),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (var i = 0; i < items.length; i++) ...[
              if (i > 0)
                const VerticalDivider(
                  width: 1,
                  thickness: 1,
                  color: AppColors.borderPrimary,
                ),
              Expanded(
                child: Align(
                  alignment: Alignment.topCenter,
                  child: _StatCell(item: items[i]),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class ClientProfileStatItem {
  const ClientProfileStatItem._({
    this.icon,
    this.svgAsset,
    this.imageAsset,
    required this.value,
    required this.label,
    this.isSvg = false,
    this.isAsset = false,
  });

  final IconData? icon;
  final String? svgAsset;
  final String? imageAsset;
  final String value;
  final String label;
  final bool isSvg;
  final bool isAsset;

  factory ClientProfileStatItem.icon({
    required IconData icon,
    required String value,
    required String label,
  }) => ClientProfileStatItem._(
    icon: icon,
    value: value,
    label: label,
  );

  factory ClientProfileStatItem.svg({
    required String asset,
    required String value,
    required String label,
  }) => ClientProfileStatItem._(
    svgAsset: asset,
    value: value,
    label: label,
    isSvg: true,
  );

  factory ClientProfileStatItem.image({
    required String asset,
    required String value,
    required String label,
  }) => ClientProfileStatItem._(
    imageAsset: asset,
    value: value,
    label: label,
    isAsset: true,
  );
}

class _StatCell extends StatelessWidget {
  const _StatCell({required this.item});

  final ClientProfileStatItem item;

  @override
  Widget build(BuildContext context) {
    Widget iconWidget;
    if (item.isAsset && item.imageAsset != null) {
      iconWidget = Image.asset(
        item.imageAsset!,
        width: 20,
        height: 20,
        fit: BoxFit.contain,
      );
    } else if (item.isSvg && item.svgAsset != null) {
      iconWidget = SvgPicture.asset(
        item.svgAsset!,
        width: 18,
        height: 18,
        colorFilter: const ColorFilter.mode(
          AppColors.primary500,
          BlendMode.srcIn,
        ),
      );
    } else {
      iconWidget = Icon(
        item.icon ?? Icons.circle,
        size: 20,
        color: AppColors.primary500,
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          SizedBox(
            height: 20,
            child: Center(child: iconWidget),
          ),
          const SizedBox(height: 8),
          Text(
            item.value,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            item.label,
            textAlign: TextAlign.center,
            maxLines: 2,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w400,
              color: AppColors.textTertiary,
              height: 1.2,
            ),
          ),
        ],
      ),
    );
  }
}

class ClientProfileHealthSection extends StatelessWidget {
  const ClientProfileHealthSection({
    super.key,
    required this.title,
    required this.connectTitle,
    required this.connectSubtitle,
    required this.connectLabel,
    required this.secureLabel,
    required this.isLoading,
    required this.isConnected,
    required this.isFullySynced,
    required this.needsInstall,
    required this.onConnect,
    required this.onRefresh,
    required this.stepsLabel,
    required this.caloriesLabel,
    required this.workoutsLabel,
    required this.health,
  });

  final String title;
  final String connectTitle;
  final String connectSubtitle;
  final String connectLabel;
  final String secureLabel;
  final bool isLoading;
  final bool isConnected;
  final bool isFullySynced;
  final bool needsInstall;
  final VoidCallback onConnect;
  final VoidCallback onRefresh;
  final String stepsLabel;
  final String caloriesLabel;
  final String workoutsLabel;
  final HealthData? health;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClientSectionHeader(title: title, bottomPadding: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.backgroundPrimary,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.primary50,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.favorite_rounded,
                      color: AppColors.primary500,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          connectTitle,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                            height: 1.2,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          connectSubtitle,
                          style: const TextStyle(
                            fontSize: 12,
                            height: 1.35,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  _HealthConnectActionColumn(
                    isLoading: isLoading,
                    isFullySynced: isFullySynced,
                    needsInstall: needsInstall,
                    connectLabel: connectLabel,
                    secureLabel: secureLabel,
                    onConnect: onConnect,
                    onRefresh: onRefresh,
                  ),
                ],
              ),
              if (isFullySynced && health != null) ...[
                const SizedBox(height: 16),
                const Divider(height: 1, color: AppColors.borderPrimary),
                const SizedBox(height: 16),
                IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _HealthMetric(
                        icon: Icons.directions_walk_outlined,
                        value: _formatSteps(health!.steps),
                        label: stepsLabel,
                        tint: const Color(0xFF4A90D9),
                      ),
                      const VerticalDivider(
                        width: 1,
                        thickness: 1,
                        color: AppColors.borderPrimary,
                      ),
                      _HealthMetric(
                        icon: Icons.local_fire_department_outlined,
                        value: formatProfileCount(health!.calories),
                        label: caloriesLabel,
                        tint: AppColors.primary500,
                      ),
                      const VerticalDivider(
                        width: 1,
                        thickness: 1,
                        color: AppColors.borderPrimary,
                      ),
                      _HealthMetric(
                        icon: Icons.fitness_center_outlined,
                        value: '${health!.workouts}',
                        label: workoutsLabel,
                        tint: const Color(0xFF34A853),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  static String _formatSteps(int steps) {
    if (steps >= 1000) {
      final k = steps / 1000;
      return k.truncateToDouble() == k
          ? '${k.toInt()}k'
          : '${k.toStringAsFixed(1)}k';
    }
    return '$steps';
  }
}

class _HealthConnectActionColumn extends StatelessWidget {
  const _HealthConnectActionColumn({
    required this.isLoading,
    required this.isFullySynced,
    required this.needsInstall,
    required this.connectLabel,
    required this.secureLabel,
    required this.onConnect,
    required this.onRefresh,
  });

  final bool isLoading;
  final bool isFullySynced;
  final bool needsInstall;
  final String connectLabel;
  final String secureLabel;
  final VoidCallback onConnect;
  final VoidCallback onRefresh;

  static const double _columnWidth = 100;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: _columnWidth,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 36,
            child: Center(child: _actionControl()),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.only(top: 1),
                child: Icon(
                  Icons.lock_outline_rounded,
                  size: 12,
                  color: AppColors.textTertiary,
                ),
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  secureLabel,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 10,
                    height: 1.25,
                    color: AppColors.textTertiary,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _actionControl() {
    if (isLoading) {
      return const SizedBox(
        width: 22,
        height: 22,
        child: CircularProgressIndicator(strokeWidth: 2),
      );
    }
    if (!isFullySynced) {
      return FilledButton(
        onPressed: onConnect,
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary500,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          minimumSize: Size.zero,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(999),
          ),
        ),
        child: Text(
          needsInstall ? 'Install' : connectLabel,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }
    return IconButton(
      onPressed: onRefresh,
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
      icon: const Icon(Icons.refresh_rounded, size: 20),
      color: AppColors.textSecondary,
    );
  }
}

class _HealthMetric extends StatelessWidget {
  const _HealthMetric({
    required this.icon,
    required this.value,
    required this.label,
    required this.tint,
  });

  final IconData icon;
  final String value;
  final String label;
  final Color tint;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.start,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: tint.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 20, color: tint),
            ),
            const SizedBox(height: 8),
            Text(
              value,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
                height: 1.1,
              ),
            ),
            const SizedBox(height: 4),
            SizedBox(
              height: 28,
              child: Align(
                alignment: Alignment.topCenter,
                child: Text(
                  label,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  style: const TextStyle(
                    fontSize: 10,
                    color: AppColors.textTertiary,
                    height: 1.2,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ClientProfileNotificationsBanner extends StatelessWidget {
  const ClientProfileNotificationsBanner({
    super.key,
    required this.title,
    required this.subtitle,
    required this.actionLabel,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final String actionLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.primary50,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.notifications_outlined,
              color: AppColors.primary500,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    height: 1.35,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          InkWell(
            onTap: onTap,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Flexible(
                  child: Text(
                    actionLabel,
                    textAlign: TextAlign.right,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary500,
                    ),
                  ),
                ),
                const Icon(
                  Icons.chevron_right_rounded,
                  size: 18,
                  color: AppColors.primary500,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
