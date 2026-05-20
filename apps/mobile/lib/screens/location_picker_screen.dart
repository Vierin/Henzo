import 'dart:async';

import 'package:flutter/material.dart';

import '../constants/colors.dart';
import '../widgets/app_search_prefix_icon.dart';
import '../services/mapbox_api_service.dart';

class LocationPickerScreen extends StatefulWidget {
  const LocationPickerScreen({super.key, required this.initialCity});

  final String initialCity;

  @override
  State<LocationPickerScreen> createState() => _LocationPickerScreenState();
}

class LocationPickerResult {
  const LocationPickerResult({
    required this.city,
    this.lat,
    this.lon,
  });

  final String city;
  final double? lat;
  final double? lon;
}

class _LocationPickerScreenState extends State<LocationPickerScreen> {
  final TextEditingController _controller = TextEditingController();
  Timer? _debounce;
  bool _isLoading = false;
  List<AddressSuggestion> _suggestions = const [];

  @override
  void initState() {
    super.initState();
    _controller.text = widget.initialCity;
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    if (value.trim().length < 2) {
      setState(() => _suggestions = const []);
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 300), () async {
      setState(() => _isLoading = true);
      final result = await MapboxApiService.getAutocomplete(
        value.trim(),
        country: 'VN',
        limit: 7,
      );
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _suggestions = result;
      });
    });
  }

  String _cityFromAddress(String address) {
    final parts = address
        .split(',')
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();
    if (parts.length >= 2) return parts[parts.length - 2];
    return parts.isEmpty ? address : parts.first;
  }

  void _submitManual() {
    final city = _controller.text.trim();
    if (city.isEmpty) return;
    Navigator.of(context).pop(LocationPickerResult(city: city));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Choose location')),
      body: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
        child: Column(
          children: [
            TextField(
              controller: _controller,
              onChanged: _onChanged,
              decoration: InputDecoration(
                hintText: 'Enter city or address',
                prefixIcon: const AppSearchPrefixIcon(),
                prefixIconConstraints:
                    AppSearchPrefixIcon.prefixConstraints(),
                isDense: true,
                suffixIcon: _isLoading
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: _submitManual,
                icon: const Icon(Icons.check_circle_outline),
                label: const Text('Use this city'),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: _suggestions.isEmpty
                  ? const Center(
                      child: Text(
                        'Start typing to see location suggestions',
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                    )
                  : ListView.separated(
                      itemCount: _suggestions.length,
                      separatorBuilder: (_, __) =>
                          const Divider(height: 1, color: AppColors.borderPrimary),
                      itemBuilder: (_, index) {
                        final suggestion = _suggestions[index];
                        return ListTile(
                          leading: const Icon(
                            Icons.location_on_outlined,
                            color: AppColors.textSecondary,
                          ),
                          title: Text(
                            _cityFromAddress(suggestion.address),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Text(
                            suggestion.address,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          onTap: () =>
                              Navigator.of(context).pop(
                            LocationPickerResult(
                              city: _cityFromAddress(suggestion.address),
                              lat: suggestion.lat,
                              lon: suggestion.lon,
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
