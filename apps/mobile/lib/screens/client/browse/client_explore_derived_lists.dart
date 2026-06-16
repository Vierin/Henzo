import 'package:flutter/material.dart';

import '../../../models/training_category_option.dart';
import '../../../services/client_location_store.dart';
import '../../../widgets/schedule/calendar_day_pill.dart';
import '../client_explore_models.dart';
import '../client_search_constants.dart';
import 'client_explore_dates.dart';
import 'client_explore_studio_utils.dart';

class ClientExploreDerivedResult {
  const ClientExploreDerivedResult({
    required this.dayClasses,
    required this.visibleStudios,
    required this.todayClassesByStudio,
    required this.dayClassesCount,
    required this.visibleStudiosCount,
  });

  final List<ExploreClassItem> dayClasses;
  final List<ExploreStudioItem> visibleStudios;
  final Map<String, List<ExploreClassItem>> todayClassesByStudio;
  final int dayClassesCount;
  final int visibleStudiosCount;
}

class ClientExploreDerivedLists {
  const ClientExploreDerivedLists._();

  static int computeInputsHash({
    required DateTime selectedDay,
    required int classesLength,
    required int studiosLength,
    required String sortBy,
    required String distanceFilter,
    required int? selectedCategoryId,
    required Set<String> selectedLanguages,
    required String searchQuery,
    required Set<String> timePeriods,
    required RangeValues timeRange,
    required double? clientLat,
    required double? clientLon,
  }) {
    return Object.hash(
      exploreDayKey(selectedDay),
      classesLength,
      studiosLength,
      sortBy,
      distanceFilter,
      selectedCategoryId,
      Object.hashAll(selectedLanguages),
      searchQuery,
      Object.hashAll(timePeriods),
      timeRange.start.round(),
      timeRange.end.round(),
      clientLat,
      clientLon,
    );
  }

  static ClientExploreDerivedResult compute({
    required List<ExploreStudioItem> studios,
    required List<ExploreClassItem> classes,
    required DateTime selectedDay,
    required ClientLocationStore loc,
    required String distanceFilter,
    required int? selectedCategoryId,
    required Set<String> selectedLanguages,
    required Set<String> timePeriods,
    required RangeValues timeRange,
    required String searchQuery,
    required List<TrainingCategoryOption> trainingCategories,
  }) {
    final inRangeStudios = studios
        .where(
          (s) => isStudioWithinDistanceFilter(
            studio: s,
            loc: loc,
            distanceFilter: distanceFilter,
          ),
        )
        .toList(growable: false);
    final inRangeStudioIds = inRangeStudios.map((s) => s.id).toSet();

    final dayClasses = classes.where((c) {
      if (!inRangeStudioIds.contains(c.studioId)) return false;
      if (!CalendarDayPill.isSameDay(c.startsAt, selectedDay)) return false;
      if (!isClassInSelectedPeriods(c.startsAt, timePeriods)) return false;
      if (!isClassInTimeRange(c.startsAt, timeRange)) return false;
      if (!classMatchesCategory(
        c,
        selectedCategoryId: selectedCategoryId,
      )) {
        return false;
      }
      if (!classMatchesLanguage(c, selectedLanguages)) return false;
      return true;
    }).toList();
    final derivedDayClassesCount = dayClasses.length;
    final derivedDayClasses = dayClasses
        .where((c) => matchesSearchClass(c, searchQuery))
        .toList(growable: false);

    final visibleStudios = inRangeStudios
        .where(
          (s) => studioMatchesCategory(
            s,
            classes: classes,
            selectedCategoryId: selectedCategoryId,
            trainingCategories: trainingCategories,
          ),
        )
        .where(
          (s) => studioMatchesLanguage(
            s,
            classes: classes,
            selectedLanguages: selectedLanguages,
          ),
        )
        .toList(growable: false);
    final derivedVisibleStudiosCount = visibleStudios.length;
    final derivedVisibleStudios = visibleStudios
        .where((s) => matchesSearchStudio(s, searchQuery))
        .toList(growable: false);

    final classesByStudio = <String, List<ExploreClassItem>>{};
    for (final s in derivedVisibleStudios) {
      final list = <ExploreClassItem>[];
      for (final c in classes) {
        if (c.studioId != s.id) continue;
        if (!CalendarDayPill.isSameDay(c.startsAt, selectedDay)) continue;
        if (!isClassInSelectedPeriods(c.startsAt, timePeriods)) continue;
        if (!isClassInTimeRange(c.startsAt, timeRange)) continue;
        if (!classMatchesCategory(
          c,
          selectedCategoryId: selectedCategoryId,
        )) {
          continue;
        }
        if (!classMatchesLanguage(c, selectedLanguages)) continue;
        list.add(c);
      }
      list.sort((a, b) => a.startsAt.compareTo(b.startsAt));
      classesByStudio[s.id] = list;
    }

    return ClientExploreDerivedResult(
      dayClasses: derivedDayClasses,
      visibleStudios: derivedVisibleStudios,
      todayClassesByStudio: classesByStudio,
      dayClassesCount: derivedDayClassesCount,
      visibleStudiosCount: derivedVisibleStudiosCount,
    );
  }

  static bool matchesSearchClass(ExploreClassItem c, String searchQuery) {
    final q = searchQuery.trim().toLowerCase();
    if (q.isEmpty) return true;
    return c.className.toLowerCase().contains(q) ||
        c.studioName.toLowerCase().contains(q) ||
        c.trainerName.toLowerCase().contains(q);
  }

  static bool matchesSearchStudio(ExploreStudioItem s, String searchQuery) {
    final q = searchQuery.trim().toLowerCase();
    if (q.isEmpty) return true;
    return s.name.toLowerCase().contains(q) ||
        s.address.toLowerCase().contains(q);
  }

  static bool isClassInSelectedPeriods(
    DateTime startsAt,
    Set<String> timePeriods,
  ) {
    if (timePeriods.isEmpty) return true;
    final hour = startsAt.hour;
    final isMorning = hour >= 5 && hour < 12;
    final isAfternoon = hour >= 12 && hour < 16;
    final isEvening = hour >= 16 && hour < 20;
    if (timePeriods.contains('morning') && isMorning) return true;
    if (timePeriods.contains('afternoon') && isAfternoon) return true;
    if (timePeriods.contains('evening') && isEvening) return true;
    return false;
  }

  static bool isClassInTimeRange(DateTime startsAt, RangeValues timeRange) {
    final startMin = (startsAt.hour * 60) + startsAt.minute;
    final from = timeRange.start.round();
    final to = timeRange.end.round();
    return startMin >= from && startMin <= to;
  }

  static bool classMatchesCategory(
    ExploreClassItem c, {
    required int? selectedCategoryId,
  }) {
    if (selectedCategoryId == null) return true;
    return c.trainingCategoryId == selectedCategoryId;
  }

  static TrainingCategoryOption? categoryOptionById(
    List<TrainingCategoryOption> options,
    int id,
  ) {
    for (final o in options) {
      if (o.id == id) return o;
    }
    return null;
  }

  static bool studioMatchesCategory(
    ExploreStudioItem s, {
    required List<ExploreClassItem> classes,
    required int? selectedCategoryId,
    required List<TrainingCategoryOption> trainingCategories,
  }) {
    final cid = selectedCategoryId;
    if (cid == null) return true;
    if (s.trainingCategoryIds.contains(cid)) return true;
    final bySessions = classes.any(
      (c) => c.studioId == s.id && c.trainingCategoryId == cid,
    );
    if (bySessions) return true;
    if (s.trainingCategoryIds.isEmpty && s.categoryNames.isEmpty) {
      return true;
    }
    final opt = categoryOptionById(trainingCategories, cid);
    if (opt == null || s.categoryNames.isEmpty) return true;
    final labels = {
      opt.nameEn,
      opt.nameRu,
      opt.nameVn,
    }.map((e) => e.trim().toLowerCase()).where((e) => e.isNotEmpty).toSet();
    return s.categoryNames.any((n) => labels.contains(n.trim().toLowerCase()));
  }

  static bool classMatchesLanguage(
    ExploreClassItem c,
    Set<String> selectedLanguages,
  ) {
    if (selectedLanguages.isEmpty) return true;
    final lang = c.language?.trim().toLowerCase();
    if (lang == null || lang.isEmpty) return false;
    return selectedLanguages.contains(lang);
  }

  static bool studioMatchesLanguage(
    ExploreStudioItem s, {
    required List<ExploreClassItem> classes,
    required Set<String> selectedLanguages,
  }) {
    if (selectedLanguages.isEmpty) return true;
    return classes.any(
      (c) => c.studioId == s.id && classMatchesLanguage(c, selectedLanguages),
    );
  }

  static bool hasActiveTimeFilter({
    required Set<String> timePeriods,
    required RangeValues timeRange,
  }) {
    if (timePeriods.isNotEmpty) return true;
    final startMin = timeRange.start.round();
    final endMin = timeRange.end.round();
    if (startMin != kExploreDefaultTimeStartMin) return true;
    if (endMin != kExploreDefaultTimeEndMin) return true;
    return false;
  }

  static bool hasActiveFilters({
    required int? selectedCategoryId,
    required Set<String> selectedLanguages,
    required Set<String> timePeriods,
    required RangeValues timeRange,
    required String distanceFilter,
    required String sortBy,
  }) {
    return selectedCategoryId != null ||
        selectedLanguages.isNotEmpty ||
        hasActiveTimeFilter(timePeriods: timePeriods, timeRange: timeRange) ||
        distanceFilter != 'auto' ||
        sortBy != 'recommended';
  }

  static int activeFilterCount({
    required int? selectedCategoryId,
    required Set<String> selectedLanguages,
    required Set<String> timePeriods,
    required RangeValues timeRange,
    required String distanceFilter,
    required String sortBy,
  }) {
    var count = 0;
    if (selectedCategoryId != null) count++;
    if (selectedLanguages.isNotEmpty) count++;
    if (hasActiveTimeFilter(timePeriods: timePeriods, timeRange: timeRange)) {
      count++;
    }
    if (distanceFilter != 'auto') count++;
    if (sortBy != 'recommended') count++;
    return count;
  }
}

String browseTrainingLanguageLabel(
  String code,
  String Function(String) tr,
) {
  switch (code) {
    case 'en':
      return tr('settings.languageEn');
    case 'ru':
      return tr('settings.languageRu');
    case 'vi':
      return tr('settings.languageVi');
    default:
      return code;
  }
}
