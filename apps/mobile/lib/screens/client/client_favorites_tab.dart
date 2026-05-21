import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../services/auth_service.dart';
import '../../services/client_favorites_mutations.dart';
import '../../services/client_favorites_store.dart';
import '../../widgets/public/cached_salon_network_image.dart';
import '../public_studio_detail_screen.dart';
import 'client_shell_scope.dart';

/// Favorites list embedded in Activity tab (no own app bar).
class ClientFavoritesTab extends StatefulWidget {
  const ClientFavoritesTab({super.key});

  @override
  State<ClientFavoritesTab> createState() => _ClientFavoritesTabState();
}

class _ClientFavoritesTabState extends State<ClientFavoritesTab> {
  final Set<String> _removingIds = <String>{};

  static const double _favoriteLogoSize = 60;

  String? _studioLogoUrl(Map<String, dynamic> studio) {
    final raw =
        studio['logoUrl'] ??
        studio['logo'] ??
        studio['brandLogoUrl'] ??
        studio['avatarUrl'];
    if (raw != null) {
      final s = raw.toString().trim();
      if (s.isNotEmpty) return s;
    }
    final photos = studio['photos'];
    if (photos is List && photos.isNotEmpty) {
      final first = photos.first;
      if (first != null) {
        final s = first.toString().trim();
        if (s.isNotEmpty) return s;
      }
    }
    return null;
  }

  Future<void> _removeFavorite(String studioId) async {
    final token = context.read<AuthService>().accessToken;
    final favStore = context.read<ClientFavoritesStore>();
    final locale = context.read<LocaleProvider>();
    if (token == null || token.isEmpty || _removingIds.contains(studioId)) {
      return;
    }
    setState(() => _removingIds.add(studioId));
    var ok = false;
    try {
      ok = await ClientFavoritesMutations.removeStudio(
        favStore: favStore,
        token: token,
        studioId: studioId,
      );
    } finally {
      if (mounted) {
        setState(() => _removingIds.remove(studioId));
      }
    }
    if (!mounted) return;
    if (ok) {
      HapticFeedback.lightImpact();
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(content: Text(locale.t('clientFavorites.removed'))),
        );
    } else {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(content: Text(locale.t('clientFavorites.removeError'))),
        );
    }
  }

  Future<void> _refreshFavorites() async {
    final token = context.read<AuthService>().accessToken;
    await context.read<ClientFavoritesStore>().sync(token, force: true);
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<ClientFavoritesStore>().sync(
            context.read<AuthService>().accessToken,
            force: true,
          );
    });
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final token = context.watch<AuthService>().accessToken;
    final favStore = context.watch<ClientFavoritesStore>();
    final favorites = favStore.favorites;
    final showInitialSpinner = token != null &&
        token.isNotEmpty &&
        (!favStore.hasCompletedSync ||
            (favStore.isLoading && favorites.isEmpty));

    if (showInitialSpinner) {
      return const Center(child: CircularProgressIndicator());
    }

    if (favorites.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(kScreenPaddingHorizontal),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              locale.t('clientFavorites.emptyTitle'),
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              locale.t('clientFavorites.emptySubtitle'),
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () {
                ClientShellScope.maybeOf(context)?.goToExplore();
              },
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary500,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: Text(locale.t('clientFavorites.explore')),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _refreshFavorites,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
        itemCount: favorites.length,
        separatorBuilder: (context, _) => const SizedBox(height: 8),
        itemBuilder: (_, index) {
          final studio = favorites[index];
          final id = (studio['id'] ?? '').toString();
          final name = (studio['name'] ?? 'Studio').toString();
          final address = (studio['address'] ?? '').toString();
          final logoUrl = _studioLogoUrl(studio);
          final reviews = studio['Review'];
          final reviewCount = reviews is List ? reviews.length : 0;
          final avgRating = reviewCount > 0
              ? (reviews as List)
                        .whereType<Map>()
                        .map(
                          (r) => (r['rating'] as num?)?.toDouble() ?? 0,
                        )
                        .fold<double>(0, (a, b) => a + b) /
                    reviewCount
              : 0.0;
          final removing = _removingIds.contains(id);
          return Material(
            color: AppColors.backgroundPrimary,
            borderRadius: BorderRadius.circular(12),
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => PublicStudioDetailScreen(studioId: id),
                  ),
                );
              },
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.borderPrimary),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: logoUrl != null
                          ? CachedSalonNetworkImage(
                              imageUrl: logoUrl,
                              width: _favoriteLogoSize,
                              height: _favoriteLogoSize,
                              fit: BoxFit.cover,
                            )
                          : Container(
                              width: _favoriteLogoSize,
                              height: _favoriteLogoSize,
                              decoration: BoxDecoration(
                                color: AppColors.secondary100,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              alignment: Alignment.center,
                              child: const Icon(
                                Icons.fitness_center,
                                color: AppColors.primary500,
                              ),
                            ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 18,
                              height: 1.2,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          if (address.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(
                              address,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 13,
                              ),
                            ),
                          ],
                          if (avgRating > 0) ...[
                            const SizedBox(height: 4),
                            Text(
                              '★ ${avgRating.toStringAsFixed(1)}',
                              style: const TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.only(top: 0),
                      child: removing
                          ? const SizedBox(
                              width: 40,
                              height: 40,
                              child: Center(
                                child: SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                ),
                              ),
                            )
                          : IconButton(
                              padding: EdgeInsets.zero,
                              visualDensity: VisualDensity.compact,
                              constraints: const BoxConstraints(
                                minWidth: 40,
                                minHeight: 40,
                              ),
                              onPressed: () => _removeFavorite(id),
                              icon: const Icon(
                                Icons.favorite,
                                color: AppColors.primary500,
                                size: 26,
                              ),
                            ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
