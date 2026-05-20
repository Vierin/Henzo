import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../constants/colors.dart';
import 'settings_typography.dart';

const double _settingsCardRadius = 14;
const double _settingsIconBoxSize = 31;
const double _settingsSvgIconSize = 13;
const double _settingsMaterialIconSize = 18;
const double _settingsTileGap = 8;

/// Lime pill badge for active Pro on Settings hero card.
const Color kSettingsProBadgeBackground = Color(0xFFD4F06A);
const Color kSettingsProBadgeText = Color(0xFF000000);

class SettingsSectionLabel extends StatelessWidget {
  const SettingsSectionLabel({super.key, required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title.toUpperCase(),
      style: SettingsTypography.sectionTitle(context),
    );
  }
}

/// Vertical stack of separate setting cards (no grouped dividers).
class SettingsGroupCard extends StatelessWidget {
  const SettingsGroupCard({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (int i = 0; i < children.length; i++) ...[
          children[i],
          if (i != children.length - 1)
            const SizedBox(height: _settingsTileGap),
        ],
      ],
    );
  }
}

class SettingsListTile extends StatelessWidget {
  const SettingsListTile({
    super.key,
    this.icon,
    this.svgAsset,
    required this.title,
    required this.onTap,
    this.trailingText = '',
  }) : assert(icon != null || svgAsset != null, 'Provide icon or svgAsset');

  final IconData? icon;
  final String? svgAsset;
  final String title;
  final String trailingText;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.backgroundPrimary,
      borderRadius: BorderRadius.circular(_settingsCardRadius),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          child: Row(
            children: [
              _SettingsIconBadge(icon: icon, svgAsset: svgAsset),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -0.2,
                  ),
                ),
              ),
              if (trailingText.isNotEmpty) ...[
                ConstrainedBox(
                  constraints: BoxConstraints(
                    maxWidth: MediaQuery.sizeOf(context).width * 0.32,
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
                const SizedBox(width: 6),
              ],
              const Icon(
                Icons.chevron_right,
                size: 20,
                color: AppColors.textSecondary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SettingsIconBadge extends StatelessWidget {
  const _SettingsIconBadge({this.icon, this.svgAsset});

  final IconData? icon;
  final String? svgAsset;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: _settingsIconBoxSize,
      height: _settingsIconBoxSize,
      decoration: BoxDecoration(
        color: AppColors.primary500,
        borderRadius: BorderRadius.circular(999),
      ),
      alignment: Alignment.center,
      child: svgAsset != null
          ? SvgPicture.asset(
              svgAsset!,
              width: _settingsSvgIconSize,
              height: _settingsSvgIconSize,
              colorFilter: const ColorFilter.mode(
                Colors.white,
                BlendMode.srcIn,
              ),
            )
          : Icon(icon, color: Colors.white, size: _settingsMaterialIconSize),
    );
  }
}

class SettingsLogoutButton extends StatelessWidget {
  const SettingsLogoutButton({
    super.key,
    required this.label,
    required this.onTap,
  });

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(_settingsCardRadius),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
        hoverColor: Colors.transparent,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(_settingsCardRadius),
            border: Border.all(color: AppColors.error500),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppColors.error500,
            ),
          ),
        ),
      ),
    );
  }
}
