import 'api_client.dart';
import 'client_favorites_store.dart';

/// Centralized optimistic favorite API calls + rollback via [ClientFavoritesStore.sync].
class ClientFavoritesMutations {
  ClientFavoritesMutations._();

  static Future<bool> removeStudio({
    required ClientFavoritesStore favStore,
    required String token,
    required String studioId,
  }) async {
    favStore.removeLocal(studioId);
    try {
      await ApiClient.delete('/auth/favorites/$studioId', token);
      return true;
    } catch (_) {
      await favStore.sync(token, force: true);
      return false;
    }
  }

  static Future<bool> addStudio({
    required ClientFavoritesStore favStore,
    required String token,
    required String studioId,
    required Map<String, dynamic> optimisticStudioPayload,
  }) async {
    favStore.upsertStudioMap(optimisticStudioPayload);
    try {
      await ApiClient.post(
        '/auth/favorites/$studioId',
        token,
        body: {'studioId': studioId},
      );
      return true;
    } catch (_) {
      await favStore.sync(token, force: true);
      return false;
    }
  }
}
