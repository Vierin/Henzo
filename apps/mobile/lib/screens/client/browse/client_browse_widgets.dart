import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';

import '../../../constants/colors.dart';
import '../../../l10n/locale_provider.dart';
import '../client_search_constants.dart';

class BrowseFilterSheetTitleRow extends StatelessWidget {
  const BrowseFilterSheetTitleRow({
    super.key,
    required this.title,
  });

  final String title;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              fontSize: 30.sp / 1.6,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
              height: kBrowseFilterLineHeight,
            ),
          ),
        ),
        IconButton(
          padding: EdgeInsets.zero,
          visualDensity: VisualDensity.compact,
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.close, color: AppColors.textSecondary),
        ),
      ],
    );
  }
}

class BrowseLanguageFilterTile extends StatelessWidget {
  const BrowseLanguageFilterTile({
    super.key,
    required this.code,
    required this.label,
    required this.selected,
    required this.onTap,
    required this.flag,
  });

  final String code;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final String flag;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
        hoverColor: Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 4),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.backgroundPrimary,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: selected ? AppColors.primary500 : AppColors.borderPrimary,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (flag.isNotEmpty)
                Text(flag, style: TextStyle(fontSize: 22.sp)),
              if (flag.isNotEmpty) const SizedBox(height: 6),
              Text(
                label,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: browseFilterChoiceTextStyle(
                  selected: selected,
                  fontSize: 12.sp,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class BrowseFilterRadioOption extends StatelessWidget {
  const BrowseFilterRadioOption({
    super.key,
    required this.title,
    this.subtitle,
    required this.selected,
    required this.onTap,
    this.titleFontSize,
    this.subtitleFontSize,
    this.compact = false,
  });

  final String title;
  final String? subtitle;
  final bool selected;
  final VoidCallback onTap;
  final double? titleFontSize;
  final double? subtitleFontSize;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      splashColor: Colors.transparent,
      highlightColor: Colors.transparent,
      hoverColor: Colors.transparent,
      borderRadius: BorderRadius.circular(10),
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: EdgeInsets.symmetric(
          horizontal: compact ? 12 : 14,
          vertical: compact ? 12 : 14,
        ),
        decoration: BoxDecoration(
          color: compact ? null : AppColors.backgroundPrimary,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? AppColors.primary500 : AppColors.borderPrimary,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: browseFilterChoiceTextStyle(
                      selected: selected,
                      fontSize: titleFontSize ?? (compact ? null : 15.sp),
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle!,
                      style: browseFilterSubtitleTextStyle(
                        fontSize: subtitleFontSize ?? (compact ? 12.sp : 13.sp),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Icon(
              selected ? Icons.radio_button_checked : Icons.radio_button_off,
              color: selected ? AppColors.primary500 : AppColors.textSecondary,
            ),
          ],
        ),
      ),
    );
  }
}

class BrowseCompactDatePill extends StatelessWidget {
  const BrowseCompactDatePill({
    super.key,
    required this.label,
    required this.onTap,
  });

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.backgroundPrimary,
      borderRadius: BorderRadius.circular(999),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              SvgPicture.asset(
                'assets/icons/icon-calendar.svg',
                width: 11,
                height: 10,
                fit: BoxFit.contain,
                excludeFromSemantics: true,
                colorFilter: const ColorFilter.mode(
                  AppColors.textPrimary,
                  BlendMode.srcIn,
                ),
              ),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12.sp,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                  height: 1.1,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class BrowseCompactFilterButton extends StatelessWidget {
  const BrowseCompactFilterButton({
    super.key,
    required this.count,
    required this.onTap,
  });

  final int count;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final label = count > 0
        ? locale
              .t('clientHome.filtersCompactCount')
              .replaceAll('{count}', '$count')
        : locale.t('clientHome.filtersCompact');
    return Material(
      color: AppColors.backgroundPrimary,
      borderRadius: BorderRadius.circular(999),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.tune_rounded,
                size: 18,
                color: count > 0
                    ? AppColors.primary500
                    : AppColors.textSecondary,
              ),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11.sp,
                  fontWeight: FontWeight.w600,
                  color: count > 0
                      ? AppColors.primary500
                      : AppColors.textSecondary,
                  height: kBrowseFilterLineHeight,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class BrowseFilterIconButton extends StatelessWidget {
  const BrowseFilterIconButton({
    super.key,
    required this.isActive,
    required this.onTap,
  });

  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.only(right: 10),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(
              Icons.tune_rounded,
              size: 22,
              color: isActive ? AppColors.primary500 : AppColors.textSecondary,
            ),
            if (isActive)
              Positioned(
                top: 8,
                right: 0,
                child: Container(
                  width: 7,
                  height: 7,
                  decoration: const BoxDecoration(
                    color: AppColors.primary500,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

ThemeData browseFilterSheetTheme(BuildContext context) =>
    Theme.of(context).copyWith(
      splashColor: Colors.transparent,
      highlightColor: Colors.transparent,
      bottomSheetTheme: const BottomSheetThemeData(
        surfaceTintColor: Colors.transparent,
      ),
    );
