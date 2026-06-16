import 'package:flutter/material.dart';

import '../../constants/colors.dart';

const int kExploreHorizonDays = 31;

/// Expanded Browse calendar: current month + one ahead.
const int kBrowseMaxMonthSpan = 2;

/// Default activities by start time on Browse: 05:00-22:00.
const RangeValues kExploreDefaultTimeRange = RangeValues(300, 1320);
const int kExploreDefaultTimeStartMin = 300;
const int kExploreDefaultTimeEndMin = 1320;
const double kBrowseFilterLineHeight = 1.2;

const List<String> kTrainingLanguageCodes = ['en', 'ru', 'vi'];

const double kBrowseDayPillGap = 7;
const double kBrowseCollapsedHeaderHeight = 44;
const double kBrowseModeOuterRadius = 14;
const double kBrowseModeInnerRadius = 12;
const double kBrowseModeInset = 3;
const double kBrowseModeInnerHeight = 38;
const Duration kBrowseModeAnimDuration = Duration(milliseconds: 280);

const Color kBrowseLocationBlue = Color(0xFF4D39A8);

TextStyle browseFilterResetTextStyle() => const TextStyle(
  fontSize: 16,
  color: AppColors.textPrimary,
  fontWeight: FontWeight.w400,
  height: kBrowseFilterLineHeight,
);

TextStyle browseFilterApplyTextStyle() => const TextStyle(
  fontSize: 16,
  fontWeight: FontWeight.w400,
  color: AppColors.textInverse,
  height: kBrowseFilterLineHeight,
);

TextStyle browseFilterChoiceTextStyle({
  required bool selected,
  double? fontSize,
}) => TextStyle(
  color: selected ? AppColors.primary500 : AppColors.textPrimary,
  fontWeight: FontWeight.w400,
  fontSize: fontSize,
  height: kBrowseFilterLineHeight,
);

TextStyle browseFilterSectionTitleTextStyle({Color? color}) => TextStyle(
  color: color ?? AppColors.textPrimary,
  fontWeight: FontWeight.w700,
  height: kBrowseFilterLineHeight,
);

TextStyle browseFilterSubtitleTextStyle({double? fontSize}) => TextStyle(
  color: AppColors.textSecondary,
  fontSize: fontSize,
  height: kBrowseFilterLineHeight,
);

ButtonStyle browseFilterResetButtonStyle() => TextButton.styleFrom(
  textStyle: browseFilterResetTextStyle(),
  foregroundColor: AppColors.textPrimary,
);

ButtonStyle browseFilterApplyButtonStyle() => FilledButton.styleFrom(
  backgroundColor: AppColors.primary500,
  textStyle: browseFilterApplyTextStyle(),
  foregroundColor: AppColors.textInverse,
);
