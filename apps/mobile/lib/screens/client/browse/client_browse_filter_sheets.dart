import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../constants/colors.dart';
import '../../../l10n/locale_provider.dart';
import '../../../models/training_category_option.dart';
import '../../../utils/formatters.dart';
import '../../../widgets/common/henzo_modal.dart';
import '../../../widgets/language_selector_modal.dart';
import '../../../widgets/training/training_category_color_chip.dart';
import '../client_search_constants.dart';
import 'client_browse_widgets.dart';
import 'client_explore_dates.dart';
import 'client_explore_derived_lists.dart';

class ClientBrowseFilterSheets {
  const ClientBrowseFilterSheets._();

  static Future<int?> showCategorySheet(
    BuildContext context, {
    required List<TrainingCategoryOption> categories,
    required int? initialCategoryId,
  }) async {
    final localeCode = context.read<LocaleProvider>().localeCode;
    var tempSelection = initialCategoryId ?? -1;

    return showHenzoModalBottomSheet<int>(
      context: context,
      showDragHandle: false,
      isScrollControlled: true,
      backgroundColor: AppColors.backgroundPrimary,
      builder: (ctx) {
        final maxH = MediaQuery.of(context).size.height * 0.72;
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Theme(
              data: browseFilterSheetTheme(context),
              child: SafeArea(
                child: SizedBox(
                  height: maxH,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        BrowseFilterSheetTitleRow(
                          title: context.read<LocaleProvider>().t(
                            'clientHome.filterByType',
                          ),
                        ),
                        const SizedBox(height: 12),
                        Expanded(
                          child: SingleChildScrollView(
                            child: Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                TrainingCategoryColorChip(
                                  label: context.read<LocaleProvider>().t(
                                    'clientHome.filterAllTypes',
                                  ),
                                  selected: tempSelection < 0,
                                  fontWeight: FontWeight.w400,
                                  lineHeight: kBrowseFilterLineHeight,
                                  onTap: () =>
                                      setModalState(() => tempSelection = -1),
                                ),
                                ...categories.map(
                                  (cat) => TrainingCategoryColorChip(
                                    category: cat,
                                    label: cat.label(localeCode),
                                    selected: tempSelection == cat.id,
                                    fontWeight: FontWeight.w400,
                                    lineHeight: kBrowseFilterLineHeight,
                                    onTap: () => setModalState(
                                      () => tempSelection = cat.id,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        SizedBox(
                          width: double.infinity,
                          child: TextButton(
                            onPressed: () =>
                                setModalState(() => tempSelection = -1),
                            style: browseFilterResetButtonStyle(),
                            child: Text(
                              context.read<LocaleProvider>().t('common.reset'),
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton(
                            onPressed: () =>
                                Navigator.of(ctx).pop(tempSelection),
                            style: browseFilterApplyButtonStyle(),
                            child: Text(
                              context.watch<LocaleProvider>().t('common.apply'),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  static Future<List<String>?> showLanguageSheet(
    BuildContext context, {
    required Set<String> initialLanguages,
  }) async {
    final tempLanguages = Set<String>.from(initialLanguages);
    return showHenzoModalBottomSheet<List<String>>(
      context: context,
      showDragHandle: false,
      isScrollControlled: true,
      backgroundColor: AppColors.backgroundPrimary,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Theme(
              data: browseFilterSheetTheme(context),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      BrowseFilterSheetTitleRow(
                        title: context.read<LocaleProvider>().t(
                          'clientHome.filterByLanguage',
                        ),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          for (final code in kTrainingLanguageCodes)
                            BrowseLanguageFilterTile(
                              code: code,
                              flag: kTrainingLanguageFlags[code] ?? '',
                              label: browseTrainingLanguageLabel(
                                code,
                                context.read<LocaleProvider>().t,
                              ),
                              selected: tempLanguages.contains(code),
                              onTap: () {
                                setModalState(() {
                                  if (tempLanguages.contains(code)) {
                                    tempLanguages.remove(code);
                                  } else {
                                    tempLanguages.add(code);
                                  }
                                });
                              },
                            ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      SizedBox(
                        width: double.infinity,
                        child: TextButton(
                          onPressed: () =>
                              setModalState(() => tempLanguages.clear()),
                          style: browseFilterResetButtonStyle(),
                          child: Text(
                            context.read<LocaleProvider>().t('common.reset'),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: () =>
                              Navigator.of(ctx).pop(tempLanguages.toList()),
                          style: browseFilterApplyButtonStyle(),
                          child: Text(
                            context.watch<LocaleProvider>().t('common.apply'),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  static Future<Map<String, dynamic>?> showTimeSheet(
    BuildContext context, {
    required Set<String> initialPeriods,
    required RangeValues initialRange,
  }) async {
    final tempPeriods = Set<String>.from(initialPeriods);
    RangeValues tempRange = alignTimeRangeToSlider(initialRange);

    return showHenzoModalBottomSheet<Map<String, dynamic>>(
      context: context,
      showDragHandle: false,
      backgroundColor: AppColors.backgroundPrimary,
      isScrollControlled: true,
      builder: (ctx) {
        Widget periodTile({
          required String id,
          required String label,
          required IconData icon,
          required StateSetter setModalState,
        }) {
          final selected = tempPeriods.contains(id);
          return Expanded(
            child: InkWell(
              splashColor: Colors.transparent,
              highlightColor: Colors.transparent,
              hoverColor: Colors.transparent,
              borderRadius: BorderRadius.circular(8),
              onTap: () {
                setModalState(() {
                  if (selected) {
                    tempPeriods.clear();
                    tempRange = kExploreDefaultTimeRange;
                    return;
                  }
                  tempPeriods
                    ..clear()
                    ..add(id);
                  if (id == 'morning') {
                    tempRange = const RangeValues(300, 720);
                  } else if (id == 'afternoon') {
                    tempRange = const RangeValues(720, 960);
                  } else if (id == 'evening') {
                    tempRange = const RangeValues(960, 1320);
                  }
                });
              },
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 4),
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.backgroundPrimary,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: selected
                        ? AppColors.primary500
                        : AppColors.borderPrimary,
                  ),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      icon,
                      color: selected
                          ? AppColors.primary500
                          : AppColors.textSecondary,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      label,
                      style: browseFilterChoiceTextStyle(selected: selected),
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        return StatefulBuilder(
          builder: (context, setModalState) {
            return Theme(
              data: browseFilterSheetTheme(context),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      BrowseFilterSheetTitleRow(
                        title: context.read<LocaleProvider>().t(
                          'clientHome.filterByTime',
                        ),
                      ),
                      const SizedBox(height: 14),
                      Text(
                        context.read<LocaleProvider>().t(
                          'clientHome.activitiesByTimePeriod',
                        ),
                        style: browseFilterSectionTitleTextStyle(),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          periodTile(
                            id: 'morning',
                            label: context.read<LocaleProvider>().t(
                              'clientHome.timePeriodMorning',
                            ),
                            icon: Icons.wb_twilight_outlined,
                            setModalState: setModalState,
                          ),
                          periodTile(
                            id: 'afternoon',
                            label: context.read<LocaleProvider>().t(
                              'clientHome.timePeriodAfternoon',
                            ),
                            icon: Icons.wb_sunny_outlined,
                            setModalState: setModalState,
                          ),
                          periodTile(
                            id: 'evening',
                            label: context.read<LocaleProvider>().t(
                              'clientHome.timePeriodEvening',
                            ),
                            icon: Icons.nights_stay_outlined,
                            setModalState: setModalState,
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      Text(
                        context.read<LocaleProvider>().t(
                          'clientHome.activitiesByStartTime',
                        ),
                        style: browseFilterSectionTitleTextStyle(),
                      ),
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerRight,
                        child: Text(
                          '${formatMinutesSliderLabel(tempRange.start)} - ${formatMinutesSliderLabel(tempRange.end)}',
                          style: browseFilterSectionTitleTextStyle(
                            color: AppColors.primary500,
                          ),
                        ),
                      ),
                      RangeSlider(
                        values: tempRange,
                        min: 300,
                        max: 1440,
                        divisions: 38,
                        activeColor: AppColors.primary500,
                        inactiveColor: AppColors.borderPrimary,
                        onChanged: (values) =>
                            setModalState(() => tempRange = values),
                      ),
                      const SizedBox(height: 6),
                      SizedBox(
                        width: double.infinity,
                        child: TextButton(
                          onPressed: () {
                            setModalState(() {
                              tempPeriods.clear();
                              tempRange = kExploreDefaultTimeRange;
                            });
                          },
                          style: browseFilterResetButtonStyle(),
                          child: Text(
                            context.read<LocaleProvider>().t('common.reset'),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: () => Navigator.of(ctx).pop({
                            'periods': tempPeriods.toList(),
                            'start': tempRange.start,
                            'end': tempRange.end,
                          }),
                          style: browseFilterApplyButtonStyle(),
                          child: Text(
                            context.watch<LocaleProvider>().t('common.apply'),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  static Future<String?> showSortSheet(
    BuildContext context, {
    required String initialSort,
  }) async {
    String temp = initialSort;
    return showHenzoModalBottomSheet<String>(
      context: context,
      showDragHandle: false,
      backgroundColor: AppColors.backgroundPrimary,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Theme(
              data: browseFilterSheetTheme(context),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      BrowseFilterSheetTitleRow(
                        title: context.read<LocaleProvider>().t(
                          'clientHome.filterSort',
                        ),
                      ),
                      const SizedBox(height: 12),
                      BrowseFilterRadioOption(
                        title: context.read<LocaleProvider>().t(
                          'clientHome.sortRecommended',
                        ),
                        subtitle: context.read<LocaleProvider>().t(
                          'clientHome.sortRecommendedDesc',
                        ),
                        selected: temp == 'recommended',
                        onTap: () =>
                            setModalState(() => temp = 'recommended'),
                      ),
                      BrowseFilterRadioOption(
                        title: context.read<LocaleProvider>().t(
                          'clientHome.sortRatings',
                        ),
                        subtitle: context.read<LocaleProvider>().t(
                          'clientHome.sortRatingsDesc',
                        ),
                        selected: temp == 'ratings',
                        onTap: () => setModalState(() => temp = 'ratings'),
                      ),
                      BrowseFilterRadioOption(
                        title: context.read<LocaleProvider>().t(
                          'clientHome.sortDistance',
                        ),
                        subtitle: context.read<LocaleProvider>().t(
                          'clientHome.sortDistanceAsc',
                        ),
                        selected: temp == 'distance',
                        onTap: () => setModalState(() => temp = 'distance'),
                      ),
                      const SizedBox(height: 4),
                      SizedBox(
                        width: double.infinity,
                        child: TextButton(
                          onPressed: () =>
                              setModalState(() => temp = 'recommended'),
                          style: browseFilterResetButtonStyle(),
                          child: Text(
                            context.read<LocaleProvider>().t('common.reset'),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: () => Navigator.of(ctx).pop(temp),
                          style: browseFilterApplyButtonStyle(),
                          child: Text(
                            context.watch<LocaleProvider>().t('common.apply'),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  static Future<String?> showDistanceSheet(
    BuildContext context, {
    required String initialDistance,
  }) async {
    String tempDistance = initialDistance;
    return showHenzoModalBottomSheet<String>(
      context: context,
      showDragHandle: false,
      backgroundColor: AppColors.backgroundPrimary,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final tr = context.read<LocaleProvider>().t;
            return Theme(
              data: browseFilterSheetTheme(context),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      BrowseFilterSheetTitleRow(
                        title: tr('clientHome.filterDistance'),
                      ),
                      const SizedBox(height: 12),
                      for (final entry in <String, String>{
                        'auto': tr('clientHome.distanceAuto'),
                        '5': tr('clientHome.distance5km'),
                        '10': tr('clientHome.distance10km'),
                        '15': tr('clientHome.distance15km'),
                        '30+': tr('clientHome.distance30plus'),
                      }.entries)
                        BrowseFilterRadioOption(
                          title: entry.value,
                          selected: tempDistance == entry.key,
                          onTap: () =>
                              setModalState(() => tempDistance = entry.key),
                        ),
                      const SizedBox(height: 4),
                      SizedBox(
                        width: double.infinity,
                        child: TextButton(
                          onPressed: () =>
                              setModalState(() => tempDistance = 'auto'),
                          style: browseFilterResetButtonStyle(),
                          child: Text(tr('common.reset')),
                        ),
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: () => Navigator.of(ctx).pop(tempDistance),
                          style: browseFilterApplyButtonStyle(),
                          child: Text(
                            context.watch<LocaleProvider>().t('common.apply'),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  static Future<Map<String, dynamic>?> showAllFiltersSheet(
    BuildContext context, {
    required String initialSort,
    required String initialDistance,
    required Set<String> initialPeriods,
    required Set<String> initialLanguages,
    required RangeValues initialRange,
  }) async {
    String tempSort = initialSort;
    String tempDistance = initialDistance;
    final tempPeriods = Set<String>.from(initialPeriods);
    final tempLanguages = Set<String>.from(initialLanguages);
    RangeValues tempRange = alignTimeRangeToSlider(initialRange);

    return showHenzoModalBottomSheet<Map<String, dynamic>>(
      context: context,
      showDragHandle: false,
      isScrollControlled: true,
      backgroundColor: AppColors.backgroundPrimary,
      builder: (ctx) {
        Widget sectionTitle(String text) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(text, style: browseFilterSectionTitleTextStyle()),
          );
        }

        Widget periodTile({
          required String id,
          required String label,
          required IconData icon,
          required bool selected,
          required VoidCallback onTap,
        }) {
          return Expanded(
            child: InkWell(
              splashColor: Colors.transparent,
              highlightColor: Colors.transparent,
              hoverColor: Colors.transparent,
              borderRadius: BorderRadius.circular(8),
              onTap: onTap,
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 4),
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: selected
                        ? AppColors.primary500
                        : AppColors.borderPrimary,
                  ),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      icon,
                      color: selected
                          ? AppColors.primary500
                          : AppColors.textSecondary,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      label,
                      style: browseFilterChoiceTextStyle(selected: selected),
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        return StatefulBuilder(
          builder: (context, setModalState) {
            final tr = context.read<LocaleProvider>().t;
            return Theme(
              data: browseFilterSheetTheme(context),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        BrowseFilterSheetTitleRow(
                          title: tr('clientHome.filtersTitle'),
                        ),
                        const SizedBox(height: 14),
                        sectionTitle(tr('clientHome.sortBySection')),
                        BrowseFilterRadioOption(
                          compact: true,
                          title: tr('clientHome.sortRecommended'),
                          subtitle: tr('clientHome.sortRecommendedDesc'),
                          selected: tempSort == 'recommended',
                          onTap: () =>
                              setModalState(() => tempSort = 'recommended'),
                        ),
                        BrowseFilterRadioOption(
                          compact: true,
                          title: tr('clientHome.sortRatings'),
                          subtitle: tr('clientHome.sortRatingsDesc'),
                          selected: tempSort == 'ratings',
                          onTap: () => setModalState(() => tempSort = 'ratings'),
                        ),
                        BrowseFilterRadioOption(
                          compact: true,
                          title: tr('clientHome.sortDistance'),
                          subtitle: tr('clientHome.sortDistanceAsc'),
                          selected: tempSort == 'distance',
                          onTap: () =>
                              setModalState(() => tempSort = 'distance'),
                        ),
                        const SizedBox(height: 6),
                        sectionTitle(tr('clientHome.distanceFromLocation')),
                        for (final entry in <String, String>{
                          'auto': tr('clientHome.distanceAuto'),
                          '5': tr('clientHome.distance5km'),
                          '10': tr('clientHome.distance10km'),
                          '15': tr('clientHome.distance15km'),
                          '30+': tr('clientHome.distance30plus'),
                        }.entries)
                          BrowseFilterRadioOption(
                            compact: true,
                            title: entry.value,
                            selected: tempDistance == entry.key,
                            onTap: () =>
                                setModalState(() => tempDistance = entry.key),
                          ),
                        const SizedBox(height: 6),
                        sectionTitle(tr('clientHome.trainingLanguageSection')),
                        Row(
                          children: [
                            for (final code in kTrainingLanguageCodes)
                              BrowseLanguageFilterTile(
                                code: code,
                                flag: kTrainingLanguageFlags[code] ?? '',
                                label: browseTrainingLanguageLabel(code, tr),
                                selected: tempLanguages.contains(code),
                                onTap: () {
                                  setModalState(() {
                                    if (tempLanguages.contains(code)) {
                                      tempLanguages.remove(code);
                                    } else {
                                      tempLanguages.add(code);
                                    }
                                  });
                                },
                              ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        sectionTitle(tr('clientHome.activitiesByTimePeriod')),
                        Row(
                          children: [
                            periodTile(
                              id: 'morning',
                              label: tr('clientHome.timePeriodMorning'),
                              icon: Icons.wb_twilight_outlined,
                              selected: tempPeriods.contains('morning'),
                              onTap: () {
                                setModalState(() {
                                  if (tempPeriods.contains('morning')) {
                                    tempPeriods.clear();
                                    tempRange = kExploreDefaultTimeRange;
                                    return;
                                  }
                                  tempPeriods
                                    ..clear()
                                    ..add('morning');
                                  tempRange = const RangeValues(300, 720);
                                });
                              },
                            ),
                            periodTile(
                              id: 'afternoon',
                              label: tr('clientHome.timePeriodAfternoon'),
                              icon: Icons.wb_sunny_outlined,
                              selected: tempPeriods.contains('afternoon'),
                              onTap: () {
                                setModalState(() {
                                  if (tempPeriods.contains('afternoon')) {
                                    tempPeriods.clear();
                                    tempRange = kExploreDefaultTimeRange;
                                    return;
                                  }
                                  tempPeriods
                                    ..clear()
                                    ..add('afternoon');
                                  tempRange = const RangeValues(720, 960);
                                });
                              },
                            ),
                            periodTile(
                              id: 'evening',
                              label: tr('clientHome.timePeriodEvening'),
                              icon: Icons.nights_stay_outlined,
                              selected: tempPeriods.contains('evening'),
                              onTap: () {
                                setModalState(() {
                                  if (tempPeriods.contains('evening')) {
                                    tempPeriods.clear();
                                    tempRange = kExploreDefaultTimeRange;
                                    return;
                                  }
                                  tempPeriods
                                    ..clear()
                                    ..add('evening');
                                  tempRange = const RangeValues(960, 1320);
                                });
                              },
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        sectionTitle(tr('clientHome.activitiesByStartTime')),
                        Align(
                          alignment: Alignment.centerRight,
                          child: Text(
                            '${formatMinutesSliderLabel(tempRange.start)} - ${formatMinutesSliderLabel(tempRange.end)}',
                            style: browseFilterSectionTitleTextStyle(
                              color: AppColors.primary500,
                            ),
                          ),
                        ),
                        RangeSlider(
                          values: tempRange,
                          min: 300,
                          max: 1440,
                          divisions: 38,
                          activeColor: AppColors.primary500,
                          inactiveColor: AppColors.borderPrimary,
                          onChanged: (values) =>
                              setModalState(() => tempRange = values),
                        ),
                        const SizedBox(height: 6),
                        SizedBox(
                          width: double.infinity,
                          child: TextButton(
                            onPressed: () {
                              setModalState(() {
                                tempSort = 'recommended';
                                tempDistance = 'auto';
                                tempPeriods.clear();
                                tempLanguages.clear();
                                tempRange = kExploreDefaultTimeRange;
                              });
                            },
                            style: browseFilterResetButtonStyle(),
                            child: Text(tr('common.reset')),
                          ),
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton(
                            onPressed: () => Navigator.of(ctx).pop({
                              'sort': tempSort,
                              'distance': tempDistance,
                              'periods': tempPeriods.toList(),
                              'languages': tempLanguages.toList(),
                              'start': tempRange.start,
                              'end': tempRange.end,
                            }),
                            style: browseFilterApplyButtonStyle(),
                            child: Text(
                              context.watch<LocaleProvider>().t('common.apply'),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }
}
