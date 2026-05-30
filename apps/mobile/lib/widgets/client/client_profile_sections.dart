import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../constants/brand_typography.dart';
import '../../constants/colors.dart';
import '../../services/health_service.dart';

String formatProfileCount(int value) {
  final digits = value.toString();
  if (digits.length <= 3) return digits;
  final buf = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    buf.write(digits[i]);
    final left = digits.length - i - 1;
    if (left > 0 && left % 3 == 0) buf.write(',');
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
            style: BrandTypography.greeting(
              context,
            ).copyWith(fontSize: 28, fontWeight: FontWeight.w700),
          ),
        ),
        Material(
          color: AppColors.backgroundPrimary,
          shape: const CircleBorder(),
          child: InkWell(
            onTap: onSettings,
            customBorder: const CircleBorder(),
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: SvgPicture.asset(
                'assets/icons/icon-gear.svg',
                width: 20,
                height: 20,
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

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          CircleAvatar(
            radius: 32,
            backgroundColor: AppColors.brandAccent.withValues(alpha: 0.15),
            backgroundImage: avatarUrl != null && avatarUrl!.isNotEmpty
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
                if (location != null && location!.isNotEmpty) ...[
                  const SizedBox(height: 4),
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
                ] else if (email.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    email,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
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
    this.background = AppColors.backgroundPrimary,
    this.textColor = AppColors.textPrimary,
    this.iconSize,
    this.iconColor,
    this.iconPaddingTop,
  });

  final IconData? icon;
  final String? svgAsset;
  final String? imageAsset;
  final String value;
  final String label;
  final bool isSvg;
  final bool isAsset;
  final Color background;
  final Color textColor;
  final double? iconSize;
  final Color? iconColor;
  final double? iconPaddingTop;

  factory ClientProfileStatItem.icon({
    required IconData icon,
    required String value,
    required String label,
    Color background = AppColors.backgroundPrimary,
    Color textColor = AppColors.textPrimary,
    double? iconSize,
    Color? iconColor,
    double? iconPaddingTop,
  }) => ClientProfileStatItem._(
    icon: icon,
    value: value,
    label: label,
    background: background,
    textColor: textColor,
    iconSize: iconSize,
    iconColor: iconColor,
    iconPaddingTop: iconPaddingTop,
  );

  factory ClientProfileStatItem.svg({
    required String asset,
    required String value,
    required String label,
    Color background = AppColors.backgroundPrimary,
    Color textColor = AppColors.textPrimary,
    double? iconSize,
    Color? iconColor,
    double? iconPaddingTop,
  }) => ClientProfileStatItem._(
    svgAsset: asset,
    value: value,
    label: label,
    isSvg: true,
    background: background,
    textColor: textColor,
    iconSize: iconSize,
    iconColor: iconColor,
    iconPaddingTop: iconPaddingTop,
  );

  factory ClientProfileStatItem.image({
    required String asset,
    required String value,
    required String label,
    Color background = AppColors.backgroundPrimary,
    Color textColor = AppColors.textPrimary,
    double? iconSize,
    Color? iconColor,
    double? iconPaddingTop,
  }) => ClientProfileStatItem._(
    imageAsset: asset,
    value: value,
    label: label,
    isAsset: true,
    background: background,
    textColor: textColor,
    iconSize: iconSize,
    iconColor: iconColor,
    iconPaddingTop: iconPaddingTop,
  );
}

/// 3 separate square stat cards styled like the owner dashboard.
class ClientProfileStatsCard extends StatelessWidget {
  const ClientProfileStatsCard({super.key, required this.items});

  final List<ClientProfileStatItem> items;

  @override
  Widget build(BuildContext context) {
    final display = items.take(3).toList();
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < display.length; i++) ...[
          if (i > 0) const SizedBox(width: 10),
          Expanded(child: _StatSquareCard(item: display[i])),
        ],
      ],
    );
  }
}

class _StatSquareCard extends StatelessWidget {
  const _StatSquareCard({required this.item});

  final ClientProfileStatItem item;

  @override
  Widget build(BuildContext context) {
    final iconSize = item.iconSize ?? 14;
    final resolvedIconColor = item.iconColor ?? item.textColor;

    Widget iconWidget;
    if (item.isAsset && item.imageAsset != null) {
      iconWidget = Image.asset(
        item.imageAsset!,
        width: iconSize,
        height: iconSize,
        fit: BoxFit.contain,
      );
    } else if (item.isSvg && item.svgAsset != null) {
      iconWidget = SvgPicture.asset(
        item.svgAsset!,
        width: iconSize,
        height: iconSize,
        colorFilter: ColorFilter.mode(resolvedIconColor, BlendMode.srcIn),
      );
    } else {
      iconWidget = Icon(
        item.icon ?? Icons.circle,
        size: iconSize,
        color: resolvedIconColor,
      );
    }

    return AspectRatio(
      aspectRatio: 1,
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 16, 12, 10),
        decoration: BoxDecoration(
          color: item.background,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                item.value,
                style: TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.w500,
                  height: 0.9,
                  color: item.textColor,
                ),
              ),
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: EdgeInsets.only(top: item.iconPaddingTop ?? 0),
                  child: iconWidget,
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    item.label,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w400,
                      height: 1.1,
                      color: item.textColor,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
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
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primary500,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: Colors.white,
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
                        color: Colors.white,
                        height: 1.2,
                      ),
                    ),
                    if (!isFullySynced) ...[
                      const SizedBox(height: 4),
                      Text(
                        connectSubtitle,
                        style: const TextStyle(
                          fontSize: 11,
                          height: 1.3,
                          color: Colors.white70,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisSize: MainAxisSize.min,
                children: [
                  _buildAction(),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.lock_outline_rounded,
                        size: 10,
                        color: Colors.white60,
                      ),
                      const SizedBox(width: 3),
                      Text(
                        secureLabel,
                        style: const TextStyle(
                          fontSize: 9,
                          color: Colors.white60,
                          height: 1.2,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          if (isFullySynced && health != null) ...[
            const SizedBox(height: 16),
            const Divider(height: 1, color: Colors.white24),
            const SizedBox(height: 16),
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _HealthMetric(
                    icon: Icons.directions_walk_outlined,
                    value: _formatSteps(health!.steps),
                    label: stepsLabel,
                  ),
                  const VerticalDivider(
                    width: 1,
                    thickness: 1,
                    color: Colors.white24,
                  ),
                  _HealthMetric(
                    icon: Icons.local_fire_department_outlined,
                    value: formatProfileCount(health!.calories),
                    label: caloriesLabel,
                  ),
                  const VerticalDivider(
                    width: 1,
                    thickness: 1,
                    color: Colors.white24,
                  ),
                  _HealthMetric(
                    icon: Icons.fitness_center_outlined,
                    value: '${health!.workouts}',
                    label: workoutsLabel,
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAction() {
    if (isLoading) {
      return const SizedBox(
        width: 22,
        height: 22,
        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
      );
    }
    if (!isFullySynced) {
      return OutlinedButton(
        onPressed: onConnect,
        style: OutlinedButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: AppColors.textPrimary,
          side: BorderSide.none,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          minimumSize: Size.zero,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(999),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              needsInstall ? 'Install' : connectLabel,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            ),
            const Icon(Icons.chevron_right_rounded, size: 16),
          ],
        ),
      );
    }
    return IconButton(
      onPressed: onRefresh,
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
      icon: const Icon(Icons.refresh_rounded, size: 20, color: Colors.white70),
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

class _HealthMetric extends StatelessWidget {
  const _HealthMetric({
    required this.icon,
    required this.value,
    required this.label,
  });

  final IconData icon;
  final String value;
  final String label;

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
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 18, color: Colors.white),
            ),
            const SizedBox(height: 6),
            Text(
              value,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: Colors.white,
                height: 1.1,
              ),
            ),
            const SizedBox(height: 3),
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
                    color: Colors.white70,
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
