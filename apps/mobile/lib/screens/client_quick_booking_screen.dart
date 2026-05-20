import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../utils/show_api_error.dart';
import '../widgets/common/henzo_header_back_button.dart';

class ClientQuickBookingScreen extends StatefulWidget {
  const ClientQuickBookingScreen({super.key});

  @override
  State<ClientQuickBookingScreen> createState() => _ClientQuickBookingScreenState();
}

class _ClientQuickBookingScreenState extends State<ClientQuickBookingScreen> {
  static const List<String> _sports = [
    'Yoga',
    'Pilates',
    'Crossfit',
    'Boxing',
    'Strength',
    'Dance',
  ];

  String _selectedSport = _sports.first;
  bool _isLoading = true;
  List<Map<String, dynamic>> _popularTrainings = const [];

  @override
  void initState() {
    super.initState();
    _loadPopularTrainings();
  }

  Future<void> _loadPopularTrainings() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    try {
      final token = context.read<AuthService>().accessToken;
      final raw = await ApiClient.get('/trainings/popular?limit=12', token);
      final list = raw is List
          ? raw
          : (raw is Map<String, dynamic> && raw['data'] is List
              ? raw['data'] as List<dynamic>
              : <dynamic>[]);
      final parsed = <Map<String, dynamic>>[];
      for (final item in list) {
        if (item is Map<String, dynamic>) {
          parsed.add(item);
        }
      }
      if (!mounted) return;
      setState(() {
        _popularTrainings = parsed;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      showApiError(context, e);
    }
  }

  void _bookNow(Map<String, dynamic> training) {
    final name = (training['name'] ?? 'Training').toString();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Quick booking started: $name')),
    );
  }

  bool _matchesSport(Map<String, dynamic> training) {
    final name = (training['name'] ?? '').toString().toLowerCase();
    final category = training['trainingCategory'];
    final categoryName = category is Map<String, dynamic>
        ? (category['name_en'] ?? category['name_vn'] ?? category['name_ru'] ?? '')
            .toString()
            .toLowerCase()
        : '';
    final query = _selectedSport.toLowerCase();
    return name.contains(query) || categoryName.contains(query);
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _popularTrainings.where(_matchesSport).toList();
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        leading: henzoAppBarLeading(context),
        leadingWidth: 56,
        automaticallyImplyLeading: false,
        title: const Text('Quick booking'),
        backgroundColor: AppColors.backgroundPrimary,
      ),
      body: RefreshIndicator(
        onRefresh: _loadPopularTrainings,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            const Text(
              'Book your next workout in seconds',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _sports
                  .map(
                    (sport) => ChoiceChip(
                      label: Text(sport),
                      selected: _selectedSport == sport,
                      onSelected: (_) => setState(() => _selectedSport = sport),
                    ),
                  )
                  .toList(),
            ),
            const SizedBox(height: 16),
            if (_isLoading)
              const Padding(
                padding: EdgeInsets.only(top: 40),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (filtered.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 40),
                child: Center(
                  child: Text(
                    'No trainings for this sport yet.',
                    style: TextStyle(color: AppColors.textSecondary),
                  ),
                ),
              )
            else
              ...filtered.map((training) {
                final studio = training['Studio'];
                final studioName = studio is Map<String, dynamic>
                    ? (studio['name'] ?? 'Studio').toString()
                    : 'Studio';
                final price = (training['price'] as num?)?.toDouble();
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  decoration: BoxDecoration(
                    color: AppColors.backgroundPrimary,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.borderPrimary),
                  ),
                  child: ListTile(
                    title: Text(
                      (training['name'] ?? 'Training').toString(),
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    subtitle: Text(
                      '$studioName${price != null ? ' • \$${price.toStringAsFixed(0)}' : ''}',
                    ),
                    trailing: FilledButton(
                      onPressed: () => _bookNow(training),
                      child: const Text('Book'),
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}
