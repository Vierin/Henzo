import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../models/public_studio_preview.dart';
import '../../models/training_category_option.dart';
import '../../services/auth_service.dart';
import '../../services/cache/training_categories_cache.dart';
import '../../services/client_favorites_mutations.dart';
import '../../services/client_favorites_store.dart';
import '../../utils/nearby_payload.dart';
import '../../widgets/client/client_panel_empty_state.dart';
import '../../widgets/public/top_studio_card.dart';
import '../../widgets/settings/branded_settings_app_bar.dart';
import '../public_studio_detail_screen.dart';

class ClientFavoritesScreen extends StatefulWidget {
  const ClientFavoritesScreen({super.key});

  @override
  State<ClientFavoritesScreen> createState() => _ClientFavoritesScreenState();
}

class _ClientFavoritesScreenState extends State<ClientFavoritesScreen> {
  final Set<String> _favoriteLoadingIds = <String>{};
  List<TrainingCategoryOption> _trainingCategories = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _loadTrainingCategories();
      context.read<ClientFavoritesStore>().sync(
        context.read<AuthService>().accessToken,
        force: true,
      );
    });
  }

  Future<void> _loadTrainingCategories() async {
    final categories = await context
        .read<TrainingCategoriesCache>()
        .getCategories();
    if (!mounted) return;
    setState(() => _trainingCategories = categories);
  }

  Future<void> _toggleFavorite(PublicStudioPreview studio) async {
    final token = context.read<AuthService>().accessToken;
    final favoritesStore = context.read<ClientFavoritesStore>();
    if (token == null ||
        token.isEmpty ||
        _favoriteLoadingIds.contains(studio.id)) {
      return;
    }
    final wasFavorite = favoritesStore.isFavorite(studio.id);
    setState(() => _favoriteLoadingIds.add(studio.id));
    final ok = wasFavorite
        ? await ClientFavoritesMutations.removeStudio(
            favStore: favoritesStore,
            token: token,
            studioId: studio.id,
          )
        : await ClientFavoritesMutations.addStudio(
            favStore: favoritesStore,
            token: token,
            studioId: studio.id,
            optimisticStudioPayload: {
              'id': studio.id,
              'name': studio.studioName,
              'address': studio.address,
              if (studio.photoUrl != null) 'photos': [studio.photoUrl],
              'categories': studio.categories,
            },
          );
    if (!mounted) return;
    setState(() => _favoriteLoadingIds.remove(studio.id));
    if (!ok) {
      final locale = context.read<LocaleProvider>();
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text(locale.t('clientProfile.failedToUpdateFavorites')),
          ),
        );
    }
  }

  PublicStudioPreview _studioPreview(
    Map<String, dynamic> studio,
    String localeCode,
  ) => parsePublicStudioPreviewFromNearby(
    studio,
    localeCode: localeCode,
    categoryOptions: _trainingCategories,
  );

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final favoritesStore = context.watch<ClientFavoritesStore>();
    final favorites = favoritesStore.favorites;

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: buildBrandedSettingsAppBar(
        context,
        title: locale.t('clientActivity.favorites'),
      ),
      body: RefreshIndicator(
        color: AppColors.primary500,
        onRefresh: () async {
          await Future.wait([
            _loadTrainingCategories(),
            context.read<ClientFavoritesStore>().sync(
              context.read<AuthService>().accessToken,
              force: true,
            ),
          ]);
        },
        child: favorites.isEmpty
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(
                  kScreenPaddingHorizontal,
                  24,
                  kScreenPaddingHorizontal,
                  24,
                ),
                children: [
                  ClientPanelEmptyState(
                    title: locale.t('clientFavorites.emptyTitle'),
                    subtitle: locale.t('clientFavorites.emptySubtitle'),
                    actionLabel: locale.t('clientFavorites.explore'),
                    onAction: () => Navigator.of(context).pop(),
                  ),
                ],
              )
            : ListView.builder(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(
                  kScreenPaddingHorizontal,
                  12,
                  kScreenPaddingHorizontal,
                  24,
                ),
                itemCount: favorites.length,
                itemBuilder: (_, index) {
                  final studio = _studioPreview(
                    favorites[index],
                    locale.localeCode,
                  );
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: SizedBox(
                      height: 190,
                      child: TopStudioCard(
                        homeLayout: true,
                        studio: studio,
                        categoryOptions: _trainingCategories,
                        isFavorite: favoritesStore.isFavorite(studio.id),
                        isFavoriteLoading: _favoriteLoadingIds.contains(
                          studio.id,
                        ),
                        onToggleFavorite: () => _toggleFavorite(studio),
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) =>
                                  PublicStudioDetailScreen(studioId: studio.id),
                            ),
                          );
                        },
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }
}
