import 'dart:io';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../models/public_studio_preview.dart';
import '../../models/training_category_option.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import '../../services/cache/training_categories_cache.dart';
import '../../services/client_favorites_mutations.dart';
import '../../services/client_favorites_store.dart';
import '../../services/client_location_store.dart';
import '../../services/health_service.dart';
import '../../services/workout_service.dart';
import '../../utils/nearby_payload.dart';
import '../../widgets/client/client_panel_empty_state.dart';
import '../../widgets/client/client_profile_sections.dart';
import 'client_shell_scope.dart';
import '../../widgets/client/client_section_header.dart';
import '../../widgets/public/top_studio_card.dart';
import '../public_studio_detail_screen.dart';
import 'client_edit_profile_screen.dart';
import 'client_profile_settings_screen.dart';

class ClientProfileScreen extends StatefulWidget {
  const ClientProfileScreen({super.key});

  @override
  State<ClientProfileScreen> createState() => _ClientProfileScreenState();
}

class _ClientProfileScreenState extends State<ClientProfileScreen>
    with AutomaticKeepAliveClientMixin {
  static const Duration _statsCacheTtl = Duration(minutes: 2);
  static int? _cachedClassesVisited;
  static int? _cachedHoursTrained;
  static int? _cachedActivePasses;
  static DateTime? _statsCachedAt;

  static HealthData? _cachedHealth;
  static DateTime? _healthCachedAt;

  int _classesVisited = 0;
  int _hoursTrained = 0;
  int _activePasses = 0;
  bool _loadingStats = true;
  final Set<String> _favoriteLoadingIds = {};

  HealthData? _health;
  bool _loadingHealth = false;
  bool _healthPermissionDenied = true;
  bool _healthNeedsInstall = false;

  List<TrainingCategoryOption> _trainingCategories = [];

  @override
  void initState() {
    super.initState();
    _loadStats();
    _loadTrainingCategories();
    _restoreHealthIfAlreadyAuthorized();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<ClientFavoritesStore>().sync(
        context.read<AuthService>().accessToken,
        force: true,
      );
    });
  }

  @override
  bool get wantKeepAlive => true;

  Future<void> _loadTrainingCategories() async {
    final cats = await context.read<TrainingCategoriesCache>().getCategories();
    if (!mounted) return;
    setState(() => _trainingCategories = cats);
  }

  Future<void> _loadStats({bool force = false}) async {
    if (!force &&
        _cachedClassesVisited != null &&
        _cachedHoursTrained != null &&
        _statsCachedAt != null &&
        DateTime.now().difference(_statsCachedAt!) < _statsCacheTtl) {
      if (mounted) {
        setState(() {
          _classesVisited = _cachedClassesVisited!;
          _hoursTrained = _cachedHoursTrained!;
          _activePasses = _cachedActivePasses ?? 0;
          _loadingStats = false;
        });
      }
      return;
    }
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (!mounted) return;
      setState(() {
        _classesVisited = 0;
        _hoursTrained = 0;
        _loadingStats = false;
      });
      return;
    }
    if (mounted) setState(() => _loadingStats = true);
    try {
      final raw = await ApiClient.get('/fitness/client/profile-stats', token);
      final map = raw is Map<String, dynamic>
          ? raw
          : (raw is Map ? Map<String, dynamic>.from(raw) : <String, dynamic>{});
      if (!mounted) return;
      setState(() {
        _classesVisited = (map['classesVisited'] as num?)?.toInt() ?? 0;
        _hoursTrained = (map['hoursTrained'] as num?)?.toInt() ?? 0;
        _activePasses = (map['activePasses'] as num?)?.toInt() ?? 0;
        _loadingStats = false;
      });
      _cachedClassesVisited = _classesVisited;
      _cachedHoursTrained = _hoursTrained;
      _cachedActivePasses = _activePasses;
      _statsCachedAt = DateTime.now();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        if (_cachedClassesVisited != null) {
          _classesVisited = _cachedClassesVisited!;
          _hoursTrained = _cachedHoursTrained ?? 0;
          _activePasses = _cachedActivePasses ?? 0;
        }
        _loadingStats = false;
      });
    }
  }

  Future<void> _restoreHealthIfAlreadyAuthorized() async {
    if (_cachedHealth != null &&
        _healthCachedAt != null &&
        DateTime.now().difference(_healthCachedAt!) < _statsCacheTtl) {
      if (!mounted) return;
      setState(() {
        _health = _cachedHealth;
        _healthPermissionDenied = false;
      });
      return;
    }
    if (!await HealthService.hasAccess()) return;
    if (mounted) setState(() => _loadingHealth = true);
    await _fetchHealthData();
  }

  Future<void> _connectHealth() async {
    if (mounted) setState(() => _loadingHealth = true);
    final result = await HealthService.connect();
    if (!result.ok) {
      if (!mounted) return;
      setState(() {
        _loadingHealth = false;
        _healthPermissionDenied = true;
        _healthNeedsInstall =
            result.issue == HealthConnectIssue.needsHealthConnectApp;
      });
      final msg = result.userMessage;
      if (msg != null && msg.isNotEmpty) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(content: Text(msg), duration: const Duration(seconds: 7)),
          );
      }
      return;
    }
    await _fetchHealthData();
  }

  Future<void> _fetchHealthData() async {
    try {
      final data = await HealthService.fetchData();
      if (!mounted) return;
      setState(() {
        _health = data;
        _loadingHealth = false;
        _healthPermissionDenied = false;
        _healthNeedsInstall = false;
      });
      _cachedHealth = data;
      _healthCachedAt = DateTime.now();
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingHealth = false);
    }
  }

  bool get _healthFullySynced =>
      !_loadingHealth &&
      !_healthPermissionDenied &&
      (_health?.hasAnyMetrics ?? false);

  Future<void> _refreshAll() async {
    await Future.wait([
      _loadStats(force: true),
      _refreshHealth(),
      context.read<ClientFavoritesStore>().sync(
        context.read<AuthService>().accessToken,
        force: true,
      ),
    ]);
  }

  Future<void> _refreshHealth() async {
    if (_cachedHealth != null &&
        _healthCachedAt != null &&
        DateTime.now().difference(_healthCachedAt!) < _statsCacheTtl) {
      if (mounted) {
        setState(() {
          _health = _cachedHealth;
          _loadingHealth = false;
        });
      }
      return;
    }
    if (await HealthService.hasAccess()) {
      await _fetchHealthData();
    }
  }

  Future<void> _toggleFavorite(PublicStudioPreview studio) async {
    final token = context.read<AuthService>().accessToken;
    final favStore = context.read<ClientFavoritesStore>();
    if (token == null ||
        token.isEmpty ||
        _favoriteLoadingIds.contains(studio.id)) {
      return;
    }
    final wasFavorite = favStore.isFavorite(studio.id);
    setState(() => _favoriteLoadingIds.add(studio.id));
    final ok = wasFavorite
        ? await ClientFavoritesMutations.removeStudio(
            favStore: favStore,
            token: token,
            studioId: studio.id,
          )
        : await ClientFavoritesMutations.addStudio(
            favStore: favStore,
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
    if (!ok && mounted) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(content: Text(context.read<LocaleProvider>().t('clientProfile.failedToUpdateFavorites'))),
        );
    }
  }

  PublicStudioPreview _studioPreview(
    Map<String, dynamic> studio,
    String localeCode,
  ) {
    return parsePublicStudioPreviewFromNearby(
      studio,
      localeCode: localeCode,
      categoryOptions: _trainingCategories,
    );
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final locale = context.watch<LocaleProvider>();
    String t(String k) => locale.t('clientProfile.$k');
    final auth = context.watch<AuthService>();
    final user = auth.user;
    final locStore = context.watch<ClientLocationStore>();
    final favStore = context.watch<ClientFavoritesStore>();

    final displayName = user?.name?.trim().isNotEmpty == true
        ? user!.name!.trim()
        : 'Client';
    final email = (user?.email ?? '').trim();
    final location = locStore.hasCity ? locStore.city!.trim() : null;
    final favorites = favStore.favorites;

    final calories = _healthFullySynced ? (_health?.calories ?? 0) : 0;

    const statGreen = Color(0xFFC2F600);
    const statPink = Color(0xFFFAD0C5);

    final stats = [
      ClientProfileStatItem.svg(
        asset: 'assets/icons/icon-calendar.svg',
        value: _loadingStats ? '—' : formatProfileCount(_classesVisited),
        label: t('classesBooked'),
        background: statGreen,
        iconPaddingTop: 1,
      ),
      ClientProfileStatItem.svg(
        asset: 'assets/icons/icon-ticket.svg',
        value: _loadingStats ? '—' : formatProfileCount(_activePasses),
        label: t('activePasses'),
        background: statPink,
        iconSize: 11,
        iconPaddingTop: 3,
      ),
      ClientProfileStatItem.svg(
        asset: 'assets/icons/icon-flame.svg',
        value: formatProfileCount(calories),
        label: t('caloriesBurned'),
        background: AppColors.backgroundPrimary,
        iconSize: 17,
        iconColor: AppColors.brandAccent,
        iconPaddingTop: 0,
      ),
    ];

    final healthSubtitle = Platform.isIOS
        ? t('connectHealthSubtitle')
        : t('connectHealthSubtitleAndroid');

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refreshAll,
          color: AppColors.primary500,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(
              kScreenPaddingHorizontal,
              12,
              kScreenPaddingHorizontal,
              28,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ClientProfileHeader(
                  title: t('title'),
                  onSettings: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const ClientProfileSettingsScreen(),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 20),
                ClientProfileUserRow(
                  name: displayName,
                  email: email,
                  location: location,
                  avatarUrl: user?.avatarUrl,
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const ClientEditProfileScreen(),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 20),
                ClientProfileStatsCard(items: stats),
                const SizedBox(height: 24),
                ClientProfileHealthSection(
                  title: '',
                  connectTitle: t('connectHealthTitle'),
                  connectSubtitle: healthSubtitle,
                  connectLabel: t('connect'),
                  secureLabel: t('dataSecure'),
                  isLoading: _loadingHealth,
                  isConnected: !_healthPermissionDenied,
                  isFullySynced: _healthFullySynced,
                  needsInstall: _healthNeedsInstall,
                  onConnect: _connectHealth,
                  onRefresh: () {
                    _cachedHealth = null;
                    _healthCachedAt = null;
                    _fetchHealthData();
                  },
                  stepsLabel: t('stepsToday'),
                  caloriesLabel: t('caloriesToday'),
                  workoutsLabel: t('workoutsWeek'),
                  health: _health,
                  onStartWorkout: Platform.isIOS
                      ? () => WorkoutService.sendToWatch(workoutType: 'yoga')
                      : null,
                ),
                const SizedBox(height: 24),
                ClientSectionHeader(
                  title: locale.t('clientActivity.favorites'),
                  actionLabel: favorites.isNotEmpty ? t('seeAll') : null,
                  onAction: favorites.isNotEmpty ? () {} : null,
                ),
                if (favorites.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: ClientPanelEmptyState(
                      title: locale.t('clientFavorites.emptyTitle'),
                      subtitle: locale.t('clientFavorites.emptySubtitle'),
                      actionLabel: locale.t('clientFavorites.explore'),
                      onAction: () {
                        ClientShellScope.maybeOf(context)?.goToExplore(
                          showClasses: false,
                        );
                      },
                    ),
                  )
                else
                  ClipRect(
                    child: SizedBox(
                      height: 190,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: favorites.length,
                        itemBuilder: (_, index) {
                          final studio = _studioPreview(
                            favorites[index],
                            locale.localeCode,
                          );
                          return TopStudioCard(
                            homeLayout: true,
                            studio: studio,
                            categoryOptions: _trainingCategories,
                            isFavorite: favStore.isFavorite(studio.id),
                            isFavoriteLoading: _favoriteLoadingIds.contains(
                              studio.id,
                            ),
                            onToggleFavorite: () => _toggleFavorite(studio),
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) => PublicStudioDetailScreen(
                                    studioId: studio.id,
                                  ),
                                ),
                              );
                            },
                          );
                        },
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
