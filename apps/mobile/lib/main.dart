import 'dart:async';
import 'dart:ui';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config/app_config.dart';
import 'config/load_app_env.dart';
import 'config/release_env.dart';
import 'config/screen_util_config.dart';
import 'deep_links/class_session_deep_link.dart';
import 'deep_links/studio_deep_link.dart';
import 'deep_links/trainer_invite_deep_link.dart';
import 'firebase_options.dart';
import 'l10n/locale_provider.dart';
import 'screens/main_shell.dart';
import 'screens/client_shell.dart';
import 'screens/login_screen.dart';
import 'screens/non_owner_gate_screen.dart';
import 'screens/trainer/trainer_shell.dart';
import 'services/analytics_service.dart';
import 'services/auth_service.dart';
import 'services/client_favorites_store.dart';
import 'services/cache/bookings_cache.dart';
import 'services/cache/client_nearby_cache.dart';
import 'services/cache/training_categories_cache.dart';
import 'services/cache/studio_public_detail_cache.dart';
import 'services/cache/owner_sessions_cache.dart';
import 'services/cache/studio_cache.dart';
import 'services/cache/services_staff_cache.dart';
import 'services/client_location_store.dart';
import 'services/client_schedule_store.dart';
import 'services/notifications_store.dart';
import 'services/push_notification_service.dart';
import 'services/revenuecat_service.dart';
import 'services/subscription_refresh_notifier.dart';
import 'theme/app_theme.dart';
import 'utils/owner_image_picker.dart';

Future<void> main() async {
  runZonedGuarded<Future<void>>(
    () async {
      WidgetsFlutterBinding.ensureInitialized();
      OwnerImagePicker.configure();
      await Future.wait([
        initializeDateFormatting('en'),
        initializeDateFormatting('ru'),
        initializeDateFormatting('vi'),
      ]);
      final loadedEnv = await loadAppEnv();
      assertValidReleaseConfiguration();
      assert(() {
        // ignore: avoid_print
        print(
          '[Env] Loaded $loadedEnv '
          '(mode=${kDebugMode ? 'debug' : 'release'}, '
          'henzo=${AppConfig.henzoEnv}, '
          'supabase=${AppConfig.supabaseUrl})',
        );
        if (AppConfig.supabaseUrl.contains('your-project.supabase.co') ||
            AppConfig.supabaseUrl.contains('STAGING_REF') ||
            AppConfig.supabaseUrl.contains('YOUR_PROD_REF')) {
          // ignore: avoid_print
          print(
            '[Env] Invalid EXPO_PUBLIC_SUPABASE_URL: placeholder value is active',
          );
        }
        return true;
      }());
      final notificationsStore = NotificationsStore();
      await notificationsStore.load();
      final clientLocationStore = ClientLocationStore();
      await clientLocationStore.load();
      var firebaseReady = false;
      try {
        await Firebase.initializeApp(
          options: DefaultFirebaseOptions.currentPlatform,
        );
        firebaseReady = true;
        await PushNotificationService.initialize(
          onNotificationReceived: notificationsStore.addFromPush,
        );
      } catch (e) {
        assert(() {
          // ignore: avoid_print
          print('Firebase init skipped: $e');
          return true;
        }());
      }

      if (firebaseReady) {
        await AnalyticsService.instance.load();
        FlutterError.onError = (details) {
          FirebaseCrashlytics.instance.recordFlutterFatalError(details);
        };
        PlatformDispatcher.instance.onError = (error, stack) {
          FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
          return true;
        };
        await AnalyticsService.instance.logEvent('app_opened');
      }

      await Supabase.initialize(
        url: AppConfig.supabaseUrl,
        anonKey: AppConfig.supabaseAnonKey,
      );
      await RevenueCatService.configure();
      runApp(
        MyApp(
          notificationsStore: notificationsStore,
          clientLocationStore: clientLocationStore,
        ),
      );
    },
    (error, stack) {
      if (Firebase.apps.isNotEmpty) {
        FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
      }
    },
  );
}

/// Корневой [Navigator] для deep links (например `henzo://class`).
final GlobalKey<NavigatorState> henzoRootNavigatorKey =
    GlobalKey<NavigatorState>();

class MyApp extends StatefulWidget {
  const MyApp({
    super.key,
    this.notificationsStore,
    this.clientLocationStore,
  });

  final NotificationsStore? notificationsStore;
  final ClientLocationStore? clientLocationStore;

  @override
  State<MyApp> createState() => _MyAppState();
}

/// Reloads [LocaleProvider] after hot restart (assets are not updated on hot reload).
class _L10nHotReload extends StatefulWidget {
  const _L10nHotReload({required this.child});

  final Widget child;

  @override
  State<_L10nHotReload> createState() => _L10nHotReloadState();
}

class _L10nHotReloadState extends State<_L10nHotReload> {
  @override
  void reassemble() {
    super.reassemble();
    if (kDebugMode) {
      context.read<LocaleProvider>().loadStrings();
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

class _MyAppState extends State<MyApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      AnalyticsService.instance.logEvent('app_opened');
    }
  }

  Widget _withKeyboardDismiss(BuildContext context, Widget? child) {
    if (child == null) return const SizedBox.shrink();
    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onTap: () {
        final currentFocus = FocusScope.of(context);
        if (!currentFocus.hasPrimaryFocus &&
            currentFocus.focusedChild != null) {
          currentFocus.unfocus();
        }
      },
      child: child,
    );
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthService()),
        ChangeNotifierProvider(create: (_) => ClientFavoritesStore()),
        ChangeNotifierProvider(create: (_) => LocaleProvider()),
        ChangeNotifierProvider(create: (_) => StudioCache()),
        ChangeNotifierProvider(create: (_) => OwnerSessionsCache()),
        ChangeNotifierProvider(create: (_) => BookingsCache()),
        ChangeNotifierProvider(create: (_) => ServicesStaffCache()),
        ChangeNotifierProvider(create: (_) => TrainingCategoriesCache()),
        ChangeNotifierProvider(create: (_) => SubscriptionRefreshNotifier()),
        if (widget.notificationsStore != null)
          ChangeNotifierProvider.value(value: widget.notificationsStore!),
        if (widget.clientLocationStore != null)
          ChangeNotifierProvider.value(
            value: widget.clientLocationStore!,
          ),
      ],
      child: _L10nHotReload(
        child: henzScreenUtilInit(
          builder: (context, _) => Consumer<LocaleProvider>(
            builder: (context, locale, _) {
              final appLocale = locale.isLoaded
                  ? Locale(locale.languageTag)
                  : const Locale('en');
              return MaterialApp(
                title: 'Henzo',
                navigatorKey: henzoRootNavigatorKey,
                theme: AppTheme.light,
                themeMode: ThemeMode.light,
                builder: (context, child) {
                  final media = MediaQuery.of(context);
                  final scaled = MediaQuery(
                    data: media.copyWith(
                      textScaler: TextScaler.linear(
                        media.textScaler.scale(1.0).clamp(0.85, 1.2),
                      ),
                    ),
                    child: _withKeyboardDismiss(context, child),
                  );
                  return StudioDeepLinkScope(
                    navigatorKey: henzoRootNavigatorKey,
                    child: TrainerInviteDeepLinkScope(
                      navigatorKey: henzoRootNavigatorKey,
                      child: ClassSessionDeepLinkScope(
                        navigatorKey: henzoRootNavigatorKey,
                        child: scaled,
                      ),
                    ),
                  );
                },
                locale: appLocale,
                localizationsDelegates: const [
                  GlobalMaterialLocalizations.delegate,
                  GlobalWidgetsLocalizations.delegate,
                  GlobalCupertinoLocalizations.delegate,
                ],
                supportedLocales: const [
                  Locale('en'),
                  Locale('ru'),
                  Locale('vi'),
                ],
                home: locale.isLoaded
                    ? const AuthWrapper()
                    : const Scaffold(
                        body: Center(child: CircularProgressIndicator()),
                      ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  bool _lastOwnerAllowed = false;
  bool _wasClient = false;
  String? _lastUserId;

  void _clearAllCaches(BuildContext ctx) {
    if (!ctx.mounted) return;
    ctx.read<StudioCache>().invalidate();
    ctx.read<BookingsCache>().invalidate();
    ctx.read<ServicesStaffCache>().invalidateAll();
    ctx.read<OwnerSessionsCache>().invalidate();
    ctx.read<ClientFavoritesStore>().clear();
    ClientNearbyCache.clear();
    StudioPublicDetailCache.clear();
    ClientScheduleStore.invalidate();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthService>(
      builder: (context, auth, _) {
        if (!auth.isInitialSessionReady) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final ownerAllowed = auth.isAuthenticated && auth.isStudioOperator;
        final isClient = auth.isAuthenticated && auth.isClient;
        final currentUserId = auth.user?.id;

        if (auth.isInitialSessionReady) {
          // User switched accounts — clear everything
          final userChanged = currentUserId != null &&
              _lastUserId != null &&
              currentUserId != _lastUserId;

          if (userChanged || (_lastOwnerAllowed && !ownerAllowed)) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              _clearAllCaches(context);
            });
          } else if (_wasClient && !isClient) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (!context.mounted) return;
              context.read<ClientFavoritesStore>().clear();
              ClientNearbyCache.clear();
              StudioPublicDetailCache.clear();
              ClientScheduleStore.invalidate();
            });
          }

          _lastOwnerAllowed = ownerAllowed;
          _wasClient = isClient;
          _lastUserId = currentUserId ?? _lastUserId;
        }

        if (ownerAllowed) {
          return const MainShell();
        }

        if (auth.isAuthenticated && auth.isTrainer) {
          return const TrainerShell();
        }

        if (auth.isAuthenticated && auth.isClient) {
          return const ClientShell();
        }

        if (auth.isAuthenticated) {
          return const NonOwnerGateScreen();
        }

        return const LoginScreen();
      },
    );
  }
}
