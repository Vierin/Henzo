import 'dart:async';
import 'dart:ui';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config/app_config.dart';
import 'config/load_app_env.dart';
import 'config/release_env.dart';
import 'config/screen_util_config.dart';
import 'deep_links/class_session_deep_link.dart';
import 'deep_links/studio_claim_deep_link.dart';
import 'deep_links/studio_deep_link.dart';
import 'deep_links/trainer_invite_deep_link.dart';
import 'firebase_options.dart';
import 'l10n/locale_provider.dart';
import 'screens/main_shell.dart';
import 'screens/public_class_detail_screen.dart';
import 'utils/auth_entry_prefs.dart';
import 'utils/operator_shell_prefs.dart';
import 'utils/root_navigator_key.dart';
import 'utils/session_cache_clear.dart';
import 'utils/share_intent_pending.dart';
import 'utils/share_intent_router.dart';
import 'widgets/common/workspace_loading_view.dart';
import 'screens/client_shell.dart';
import 'screens/login_screen.dart';
import 'screens/registration_role_screen.dart';
import 'screens/trainer/trainer_shell.dart';
import 'services/analytics_service.dart';
import 'services/auth_service.dart';
import 'services/client_favorites_store.dart';
import 'services/cache/bookings_cache.dart';
import 'services/cache/training_categories_cache.dart';
import 'services/cache/owner_sessions_cache.dart';
import 'services/cache/studio_cache.dart';
import 'services/cache/services_staff_cache.dart';
import 'services/client_location_store.dart';
import 'services/notifications_store.dart';
import 'services/push_notification_service.dart';
import 'services/revenuecat_service.dart';
import 'services/subscription_refresh_notifier.dart';
import 'theme/app_theme.dart';
import 'utils/owner_image_picker.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
}

Future<void> main() async {
  runZonedGuarded<Future<void>>(
    () async {
      WidgetsFlutterBinding.ensureInitialized();
      SystemChrome.setSystemUIOverlayStyle(
        const SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarBrightness: Brightness.light,
          statusBarIconBrightness: Brightness.dark,
        ),
      );
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
        FirebaseMessaging.onBackgroundMessage(
          _firebaseMessagingBackgroundHandler,
        );
        firebaseReady = true;
        await PushNotificationService.initialize(
          onNotificationReceived: notificationsStore.addFromPush,
          onNotificationTapped: _handlePushTap,
        );
        await PushNotificationService.syncAppBadge(
          notificationsStore.unreadCount,
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
      await AuthEntryPrefs.load();
      await OperatorShellPrefs.load();
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
// Key lives in [root_navigator_key.dart] — re-exported usage via import.

/// Routes a tapped push notification based on its payload `type`. Runs when the
/// user opens the app from a push (background or terminated).
void _handlePushTap(Map<String, String> data) {
  final type = (data['type'] ?? data['eventType'] ?? '').toUpperCase();
  if (type == 'TRAINER_ASSIGNED') {
    _openTrainerScheduleFromPush();
    return;
  }
  if (type == 'WAITLIST_SPOT_OPENED' ||
      type == 'WAITLIST_PROMOTED' ||
      type == 'PRE_CLASS_REMINDER' ||
      type == 'SESSION_RESCHEDULED' ||
      type == 'OWNER_BOOKED') {
    _openClassFromPush(data);
  }
}

void _openClassFromPush(Map<String, String> data, [int attempt = 0]) {
  final studioId = (data['studioId'] ?? '').trim();
  final sessionId = (data['sessionId'] ?? '').trim();
  if (studioId.isEmpty || sessionId.isEmpty) return;

  final nav = henzoRootNavigatorKey.currentState;
  if (nav == null) {
    if (attempt >= 20) return;
    Future.delayed(
      const Duration(milliseconds: 500),
      () => _openClassFromPush(data, attempt + 1),
    );
    return;
  }

  final startsAt =
      DateTime.tryParse(
        data['startsAt'] ?? data['dateTime'] ?? '',
      )?.toLocal() ??
      DateTime.now();
  nav.push(
    MaterialPageRoute<void>(
      builder: (_) => PublicClassDetailScreen(
        studioId: studioId,
        sessionId: sessionId,
        sessionStartsAtHint: startsAt,
      ),
    ),
  );
}

/// Switches the trainer to their Schedule tab and reloads it, so a just-assigned
/// session shows immediately. On a cold start the trainer shell may not be
/// mounted yet, so retry briefly until it is (only trainers mount it, which also
/// naturally scopes this to trainer accounts).
void _openTrainerScheduleFromPush([int attempt = 0]) {
  final state = TrainerShell.currentState;
  if (state != null) {
    state.openScheduleAndRefresh();
    return;
  }
  if (attempt >= 20) return; // give up after ~10s
  Future.delayed(
    const Duration(milliseconds: 500),
    () => _openTrainerScheduleFromPush(attempt + 1),
  );
}

class MyApp extends StatefulWidget {
  const MyApp({super.key, this.notificationsStore, this.clientLocationStore});

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
    if (state == AppLifecycleState.paused) {
      final store = widget.notificationsStore;
      if (store != null) {
        unawaited(PushNotificationService.syncAppBadge(store.unreadCount));
      }
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
          ChangeNotifierProvider.value(value: widget.clientLocationStore!),
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
                      child: StudioClaimDeepLinkScope(
                        navigatorKey: henzoRootNavigatorKey,
                        child: ClassSessionDeepLinkScope(
                          navigatorKey: henzoRootNavigatorKey,
                          child: scaled,
                        ),
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
  AuthService? _authService;
  bool _wasAuthenticated = false;
  bool _recoveringUnknownRole = false;
  String? _lastUserId;
  bool _shareBootstrapStarted = false;
  bool _shareBootstrapDone = false;
  bool _hasSharePending = false;
  bool _openedSharePending = false;

  @override
  void initState() {
    super.initState();
    _bootstrapShareIntent();
  }

  Future<void> _bootstrapShareIntent() async {
    if (_shareBootstrapStarted) return;
    _shareBootstrapStarted = true;
    try {
      await ShareIntentPending.tryRestoreFromClipboard();
      await ShareIntentPending.tryRestoreFromInstallReferrer();
      final pending = await ShareIntentPending.read();
      if (pending != null) {
        // Share arrival: browse studio/class first, skip role-picker intro.
        await AuthEntryPrefs.markCompleted();
      }
      if (!mounted) return;
      setState(() {
        _hasSharePending = pending != null;
        _shareBootstrapDone = true;
      });
      if (pending != null) {
        _scheduleOpenSharePending();
      }
    } catch (_) {
      if (mounted) {
        setState(() => _shareBootstrapDone = true);
      }
    }
  }

  void _scheduleOpenSharePending() {
    if (_openedSharePending) return;
    _openedSharePending = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(ShareIntentRouter.openPendingWithRetry());
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final auth = context.read<AuthService>();
    if (!identical(_authService, auth)) {
      _authService?.removeListener(_onAuthChanged);
      _authService = auth;
      auth.addListener(_onAuthChanged);
    }
  }

  @override
  void dispose() {
    _authService?.removeListener(_onAuthChanged);
    super.dispose();
  }

  void _onAuthChanged() {
    if (!mounted) return;
    final auth = _authService!;
    final isAuthenticated = auth.isAuthenticated;
    final userId = auth.user?.id;

    if (_wasAuthenticated && !isAuthenticated) {
      _lastUserId = null;
      clearAllSessionCaches(context);
    } else if (isAuthenticated &&
        userId != null &&
        _lastUserId != null &&
        userId != _lastUserId) {
      clearAllSessionCaches(context);
    }

    if (isAuthenticated) {
      _lastUserId = userId;
      // After login from soft-gate, reopen pending studio/class.
      unawaited(() async {
        final pending = await ShareIntentPending.read();
        if (pending != null) {
          await ShareIntentRouter.openPendingWithRetry();
        }
      }());
    }
    _wasAuthenticated = isAuthenticated;
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool?>(
      valueListenable: AuthEntryPrefs.completed,
      builder: (context, introCompleted, _) {
        return Consumer<AuthService>(
          builder: (context, auth, _) {
            if (!auth.isInitialSessionReady ||
                introCompleted == null ||
                !_shareBootstrapDone) {
              final hasStoredSession =
                  Supabase.instance.client.auth.currentSession != null;
              return Scaffold(
                body: hasStoredSession
                    ? const WorkspaceLoadingView()
                    : const Center(child: CircularProgressIndicator()),
              );
            }

            final ownerAllowed = auth.isAuthenticated && auth.isStudioOperator;
            final trainerAllowed = auth.isAuthenticated && auth.isTrainer;
            final currentUserId = auth.user?.id;
            final sessionKey = ValueKey<String?>(currentUserId);

            if (ownerAllowed && trainerAllowed) {
              return ValueListenableBuilder<OperatorShell>(
                valueListenable: OperatorShellPrefs.preferred,
                builder: (context, shell, _) {
                  if (shell == OperatorShell.trainer) {
                    return TrainerShell(key: sessionKey);
                  }
                  return MainShell(key: sessionKey);
                },
              );
            }

            if (ownerAllowed) {
              return MainShell(key: sessionKey);
            }

            if (trainerAllowed) {
              return TrainerShell(key: sessionKey);
            }

            if (auth.isAuthenticated && auth.isClient) {
              return ClientShell(key: sessionKey);
            }

            // Authenticated but not owner/client/trainer — recover to login.
            if (auth.isAuthenticated) {
              if (!_recoveringUnknownRole) {
                _recoveringUnknownRole = true;
                unawaited(
                  auth.logout().whenComplete(() {
                    if (mounted) _recoveringUnknownRole = false;
                  }),
                );
              }
              return const Scaffold(
                body: Center(child: CircularProgressIndicator()),
              );
            }

            // Share-first: never dump into role picker when a studio/class
            // intent is waiting — show login under the pushed studio screen.
            if (!introCompleted && !_hasSharePending) {
              return const RegistrationRoleScreen(isRootEntry: true);
            }

            if (_hasSharePending) {
              _scheduleOpenSharePending();
            }

            return const LoginScreen();
          },
        );
      },
    );
  }
}
