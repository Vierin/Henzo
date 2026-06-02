import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

import '../config/app_config.dart';
import 'subscription_api_service.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// StoreKit / Play Billing via RevenueCat (App Store / Play compliant).
class RevenueCatService {
  RevenueCatService._();

  static bool _configured = false;
  static String? _loggedInUserId;

  static bool get isConfigured => _configured;

  static Future<void> configure() async {
    if (_configured) return;
    final apiKey = AppConfig.revenueCatApiKey;
    if (apiKey.isEmpty) {
      if (kDebugMode) {
        debugPrint('[RevenueCat] Skipped configure: API key missing');
      }
      return;
    }
    if (kDebugMode) {
      await Purchases.setLogLevel(LogLevel.debug);
    }
    final configuration = PurchasesConfiguration(apiKey);
    await Purchases.configure(configuration);
    _configured = true;
  }

  static Future<void> onAuthUserChanged({
    required String? userId,
    required bool isOwner,
  }) async {
    if (!_configured) return;
    if (userId == null || !isOwner) {
      if (_loggedInUserId != null) {
        try {
          await Purchases.logOut();
        } catch (e) {
          if (kDebugMode) debugPrint('[RevenueCat] logOut: $e');
        }
        _loggedInUserId = null;
      }
      return;
    }
    if (_loggedInUserId == userId) return;
    try {
      await Purchases.logIn(userId);
      _loggedInUserId = userId;
    } catch (e) {
      if (kDebugMode) debugPrint('[RevenueCat] logIn: $e');
    }
  }

  static Future<Offerings?> fetchOfferings() async {
    if (!_configured) return null;
    try {
      return await Purchases.getOfferings();
    } catch (e) {
      if (kDebugMode) debugPrint('[RevenueCat] getOfferings: $e');
      return null;
    }
  }

  static Package? packageForInterval(Offering? offering, String interval) {
    if (offering == null) return null;
    if (interval == 'annual') {
      return offering.annual ??
          _findPackage(offering, const ['annual', 'year', 'yearly']);
    }
    return offering.monthly ??
        _findPackage(offering, const ['monthly', 'month']);
  }

  static Package? _findPackage(Offering offering, List<String> hints) {
    for (final pkg in offering.availablePackages) {
      final id = pkg.identifier.toLowerCase();
      final productId = pkg.storeProduct.identifier.toLowerCase();
      for (final hint in hints) {
        if (id.contains(hint) || productId.contains(hint)) {
          return pkg;
        }
      }
    }
    return offering.availablePackages.isNotEmpty
        ? offering.availablePackages.first
        : null;
  }

  static int? annualSavePercent({
    required Package? monthly,
    required Package? annual,
  }) {
    if (monthly == null || annual == null) return null;
    final m = monthly.storeProduct.price;
    final y = annual.storeProduct.price;
    if (m <= 0 || y <= 0) return null;
    final fullYear = m * 12;
    if (y >= fullYear) return null;
    return (((fullYear - y) / fullYear) * 100).round().clamp(1, 99);
  }

  static bool hasActiveProEntitlement(CustomerInfo info) {
    final target = AppConfig.revenueCatEntitlementId.toLowerCase();
    for (final key in info.entitlements.active.keys) {
      if (key.toLowerCase() == target) return true;
    }
    for (final entry in info.entitlements.all.entries) {
      if (entry.key.toLowerCase() == target && entry.value.isActive) {
        return true;
      }
    }
    // Test Store only: product bought but not linked to entitlement in RC dashboard.
    if (kDebugMode) {
      if (info.entitlements.active.isNotEmpty) return true;
      if (info.activeSubscriptions.isNotEmpty) return true;
    }
    return false;
  }

  static void debugLogEntitlements(CustomerInfo info) {
    if (!kDebugMode) return;
    debugPrint(
      '[RevenueCat] active entitlements: ${info.entitlements.active.keys.join(', ')}',
    );
    debugPrint(
      '[RevenueCat] active subscriptions: ${info.activeSubscriptions.join(', ')}',
    );
  }

  static Future<CustomerInfo?> purchasePackage(Package package) async {
    if (!_configured) return null;
    try {
      final result = await Purchases.purchase(
        PurchaseParams.package(package),
      );
      return result.customerInfo;
    } on PlatformException catch (e) {
      final code = PurchasesErrorHelper.getErrorCode(e);
      if (code == PurchasesErrorCode.purchaseCancelledError) {
        return null;
      }
      rethrow;
    }
  }

  static Future<CustomerInfo?> restorePurchases() async {
    if (!_configured) return null;
    return Purchases.restorePurchases();
  }

  static Future<String?> managementUrl() async {
    if (!_configured) return null;
    try {
      final info = await Purchases.getCustomerInfo();
      final url = info.managementURL;
      if (url != null && url.isNotEmpty) return url;
    } catch (_) {}
    if (Platform.isIOS) {
      return 'https://apps.apple.com/account/subscriptions';
    }
    if (Platform.isAndroid) {
      return 'https://play.google.com/store/account/subscriptions';
    }
    return null;
  }

  /// Push RevenueCat entitlements to Henzo backend (`Subscription` row).
  static Future<bool> syncWithBackend(String accessToken) async {
    final sub = await SubscriptionApiService.syncRevenueCat(accessToken);
    return sub != null;
  }
}
