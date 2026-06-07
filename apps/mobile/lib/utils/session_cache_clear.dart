import 'package:flutter/widgets.dart';
import 'package:provider/provider.dart';

import '../services/cache/bookings_cache.dart';
import '../services/cache/client_nearby_cache.dart';
import '../services/cache/owner_sessions_cache.dart';
import '../services/cache/services_staff_cache.dart';
import '../services/cache/studio_cache.dart';
import '../services/cache/studio_public_detail_cache.dart';
import '../services/cache/training_categories_cache.dart';
import '../services/client_favorites_store.dart';
import '../services/client_schedule_store.dart';
import '../services/notifications_store.dart';

/// Drops all in-memory user/session data. Call on logout and account switch.
void clearAllSessionCaches(BuildContext context) {
  context.read<StudioCache>().invalidate();
  context.read<BookingsCache>().invalidate();
  context.read<ServicesStaffCache>().invalidateAll();
  context.read<OwnerSessionsCache>().invalidate();
  context.read<TrainingCategoriesCache>().invalidate();
  context.read<ClientFavoritesStore>().clear();
  ClientNearbyCache.clear();
  StudioPublicDetailCache.clear();
  ClientScheduleStore.invalidate();

  context.read<NotificationsStore>().clearAll();
}
