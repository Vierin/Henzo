import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/cache/studio_public_detail_cache.dart';
import '../services/client_favorites_store.dart';
import '../widgets/public/public_studio_detail_body.dart';

class PublicStudioDetailScreen extends StatefulWidget {
  const PublicStudioDetailScreen({super.key, required this.studioId});

  final String studioId;

  @override
  State<PublicStudioDetailScreen> createState() =>
      _PublicStudioDetailScreenState();
}

class _PublicStudioDetailScreenState extends State<PublicStudioDetailScreen> {
  bool _isLoading = true;
  bool _isFavoriteLoading = false;
  String? _error;
  Map<String, dynamic>? _studio;

  @override
  void initState() {
    super.initState();
    _loadStudio();
  }

  Future<void> _loadStudio() async {
    if (!mounted) return;
    final cached = StudioPublicDetailCache.get(widget.studioId);
    if (cached != null) {
      setState(() {
        _studio = cached;
        _isLoading = false;
        _error = null;
      });
      final token = context.read<AuthService>().accessToken;
      unawaited(context.read<ClientFavoritesStore>().sync(token, force: false));
    } else {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }
    try {
      final raw = await ApiClient.get('/studios/${widget.studioId}', null);
      if (!mounted) return;
      if (raw is Map<String, dynamic>) {
        StudioPublicDetailCache.put(widget.studioId, raw);
        setState(() {
          _studio = raw;
          _isLoading = false;
          _error = null;
        });
      } else {
        setState(() {
          if (_studio == null) _error = 'Invalid response';
          _isLoading = false;
        });
      }
      final token = context.read<AuthService>().accessToken;
      unawaited(context.read<ClientFavoritesStore>().sync(token, force: false));
    } catch (e) {
      if (!mounted) return;
      setState(() {
        if (_studio == null) _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _toggleFavorite() async {
    final studio = _studio;
    final studioId = (studio?['id'] ?? '').toString();
    if (studioId.isEmpty || studio == null || _isFavoriteLoading) return;
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;
    final favStore = context.read<ClientFavoritesStore>();
    final wasFavorite = favStore.isFavorite(studioId);
    setState(() => _isFavoriteLoading = true);
    if (wasFavorite) {
      favStore.removeLocal(studioId);
    } else {
      favStore.upsertStudioMap(Map<String, dynamic>.from(studio));
    }
    try {
      if (wasFavorite) {
        await ApiClient.delete('/auth/favorites/$studioId', token);
      } else {
        await ApiClient.post('/auth/favorites/$studioId', token, body: {
          'salonId': studioId,
        });
      }
    } catch (_) {
      if (!mounted) return;
      await favStore.sync(token, force: true);
    } finally {
      if (mounted) {
        setState(() => _isFavoriteLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading && _studio == null) {
      return const Scaffold(
        backgroundColor: AppColors.backgroundSecondary,
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (_error != null && _studio == null) {
      return Scaffold(
        backgroundColor: AppColors.backgroundSecondary,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Failed to load studio',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _error ?? 'Unknown error',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.textSecondary),
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: _loadStudio,
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      );
    }
    final studio = _studio;
    if (studio == null) {
      return const Scaffold(
        backgroundColor: AppColors.backgroundSecondary,
        body: SizedBox.shrink(),
      );
    }
    return PublicStudioDetailBody(
      studio: studio,
      isFavoriteLoading: _isFavoriteLoading,
      onToggleFavorite: _toggleFavorite,
    );
  }
}
