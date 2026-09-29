import 'package:flutter/material.dart';

import '../../../constants/colors.dart';
import '../../../l10n/locale_provider.dart';
import '../../../models/training_category_option.dart';
import '../../../services/client_favorites_store.dart';
import '../../../services/client_location_store.dart';
import '../../../utils/formatters.dart';
import '../../../utils/currency_format.dart';
import '../../../widgets/client/browse_results_skeleton.dart';
import '../../../widgets/client/browse_studio_list_card.dart';
import '../../../widgets/client/client_panel_empty_state.dart';
import '../../../widgets/common/load_error_view.dart';
import '../../../widgets/dashboard/owner_daily_schedule_session_card.dart';
import '../client_explore_models.dart';
import 'client_explore_session_mapper.dart';
import 'client_explore_studio_utils.dart';

List<Widget> buildBrowseResultsSlivers({
  required bool showClasses,
  required String? loadError,
  required bool isLoading,
  required bool studiosEmpty,
  required bool classesEmpty,
  required List<ExploreClassItem> dayClasses,
  required List<ExploreStudioItem> visibleStudios,
  required Map<String, List<ExploreClassItem>> todayClassesByStudio,
  required List<TrainingCategoryOption> trainingCategories,
  required ClientLocationStore locationStore,
  required ClientFavoritesStore favStore,
  required LocaleProvider locale,
  required VoidCallback onRetry,
  required VoidCallback onOpenLocationPicker,
  required void Function(ExploreClassItem) onOpenClassDetail,
  required void Function(ExploreStudioItem) onOpenStudio,
  required void Function(ExploreStudioItem) onToggleFavorite,
  required double? Function(ExploreStudioItem) resolveDistanceKm,
}) {
  Widget emptyState({required bool forClasses}) {
    final noCoords = !hasClientCoordinates(locationStore);
    final noSourceData = forClasses ? classesEmpty : studiosEmpty;

    late final String title;
    late final String body;
    VoidCallback? onAction;
    String? actionLabel;

    if (noCoords) {
      title = locale.t('clientHome.browseEmptyNoLocationTitle');
      body = locale.t('clientHome.browseEmptyNoLocationBody');
      onAction = onOpenLocationPicker;
      actionLabel = locale.t('clientHome.setLocation');
    } else if (noSourceData) {
      title = forClasses
          ? locale.t('clientHome.browseEmptyNoClassesTitle')
          : locale.t('clientHome.browseEmptyNoStudiosTitle');
      body = forClasses
          ? locale.t('clientHome.browseEmptyNoClassesBody')
          : locale.t('clientHome.browseEmptyNoStudiosBody');
    } else {
      title = locale.t('clientHome.browseEmptyFiltersTitle');
      body = locale.t('clientHome.browseEmptyFiltersBody');
    }

    return ClientPanelEmptyState(
      title: title,
      subtitle: body,
      actionLabel: actionLabel,
      onAction: onAction,
    );
  }

  if (loadError != null && studiosEmpty) {
    return [
      SliverFillRemaining(
        hasScrollBody: false,
        child: LoadErrorView(
          message: loadError,
          onRetry: onRetry,
          compact: true,
        ),
      ),
    ];
  }

  if (isLoading) {
    final itemCount = showClasses ? 5 : 4;
    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(12, 4, 12, 56),
        sliver: SliverList.separated(
          itemCount: itemCount,
          separatorBuilder: (_, _) => const SizedBox(height: 8),
          itemBuilder: (_, _) => showClasses
              ? const BrowseClassCardSkeleton()
              : const BrowseStudioCardSkeleton(),
        ),
      ),
    ];
  }

  if (showClasses) {
    if (dayClasses.isEmpty) {
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: emptyState(forClasses: true),
        ),
      ];
    }
    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(12, 4, 12, 56),
        sliver: SliverList.separated(
          itemCount: dayClasses.length,
          separatorBuilder: (_, _) => const SizedBox(height: 8),
          itemBuilder: (_, index) {
            final c = dayClasses[index];
            final session = ownerSessionFromExplore(c);
            final loc = (c.locationName ?? '').trim();
            final subtitle = loc.isNotEmpty ? loc : c.studioName;
            final trainerLine = scheduleTrainerLineOrNull(
              session,
              solePublicTrainerName(
                dayClasses
                    .where((other) => other.studioId == c.studioId)
                    .map((other) => other.trainerName),
              ),
            );
            return OwnerDailyScheduleSessionCard(
              session: session,
              subtitleLabel: subtitle,
              showLocationPin: loc.isNotEmpty,
              trainerLine: trainerLine,
              useLargeTrainerIcon: true,
              showSubtitleLeadingIcon: subtitle.isNotEmpty,
              dimPastSessions: false,
              trailingPriceLabel:
                  c.price != null ? formatMoney(c.price!, c.currency) : null,
              trailingPriceColor: AppColors.textPrimary,
              bookActionLabel: locale.t('booking.book'),
              onBookAgain: () => onOpenClassDetail(c),
              onTap: () => onOpenClassDetail(c),
            );
          },
        ),
      ),
    ];
  }

  if (visibleStudios.isEmpty) {
    return [
      SliverFillRemaining(
        hasScrollBody: false,
        child: emptyState(forClasses: false),
      ),
    ];
  }

  return [
    SliverPadding(
      padding: const EdgeInsets.fromLTRB(12, 6, 12, 56),
      sliver: SliverList.separated(
        itemCount: visibleStudios.length,
        separatorBuilder: (_, _) => const SizedBox(height: 8),
        itemBuilder: (_, index) {
          final s = visibleStudios[index];
          final todayClasses = todayClassesByStudio[s.id] ?? const [];
          return BrowseStudioListCard(
            studio: s,
            todayClasses: todayClasses,
            trainingCategories: trainingCategories,
            distanceLabel: formatBrowseStudioDistanceLabel(
              resolveDistanceKm(s),
            ),
            isFavorite: favStore.isFavorite(s.id),
            onTap: () => onOpenStudio(s),
            onToggleFavorite: () => onToggleFavorite(s),
            onClassTap: onOpenClassDetail,
          );
        },
      ),
    ),
  ];
}
