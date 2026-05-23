import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../constants/layout.dart';
import '../l10n/locale_provider.dart';
import '../widgets/app_search_prefix_icon.dart';
import '../widgets/common/henzo_header_back_button.dart';
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
  static const _locationBlue = Color(0xFF4D39A8);

  final TextEditingController _controller = TextEditingController();
  Timer? _debounce;
  bool _isLoading = false;
  List<AddressSuggestion> _suggestions = const [];

  bool get _hasSearchText => _controller.text.trim().isNotEmpty;

  @override
  void initState() {
    super.initState();
    _controller.text = widget.initialCity;
    _controller.addListener(_onControllerChanged);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.removeListener(_onControllerChanged);
    _controller.dispose();
    super.dispose();
  }

  void _onControllerChanged() {
    if (mounted) setState(() {});
  }

  void _clearSearch() {
    _debounce?.cancel();
    _controller.clear();
    setState(() => _suggestions = const []);
  }

  List<AddressSuggestion> _dedupeCities(List<AddressSuggestion> raw) {
    final seen = <String>{};
    final out = <AddressSuggestion>[];
    for (final s in raw) {
      final key = s.displayCity.toLowerCase();
      if (key.isEmpty || seen.contains(key)) continue;
      seen.add(key);
      out.add(s);
    }
    return out;
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    if (value.trim().length < 2) {
      setState(() => _suggestions = const []);
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 300), () async {
      setState(() => _isLoading = true);
      final result = await MapboxApiService.getCityAutocomplete(
        value.trim(),
        limit: 10,
      );
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _suggestions = _dedupeCities(result);
      });
    });
  }

  void _pickCity(String city, {double? lat, double? lon}) {
    final trimmed = city.trim();
    if (trimmed.isEmpty) return;
    Navigator.of(context).pop(
      LocationPickerResult(city: trimmed, lat: lat, lon: lon),
    );
  }

  void _submitManual() => _pickCity(_controller.text);

  InputDecoration _searchDecoration(LocaleProvider locale) {
    Widget? suffix;
    if (_isLoading) {
      suffix = const Padding(
        padding: EdgeInsets.all(12),
        child: SizedBox(
          width: 18,
          height: 18,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: AppColors.primary500,
          ),
        ),
      );
    } else if (_hasSearchText) {
      suffix = IconButton(
        onPressed: _clearSearch,
        icon: const Icon(
          Icons.close,
          size: 20,
          color: AppColors.textSecondary,
        ),
      );
    }

    return InputDecoration(
      hintText: locale.t('clientHome.locationPickerHint'),
      hintStyle: const TextStyle(
        color: AppColors.textTertiary,
        fontSize: 14,
      ),
      isDense: true,
      prefixIcon: const AppSearchPrefixIcon(leftMargin: 12),
      prefixIconConstraints: AppSearchPrefixIcon.prefixConstraints(
        leftMargin: 12,
        trailingGap: 4,
      ),
      suffixIcon: suffix,
      filled: true,
      fillColor: AppColors.backgroundPrimary,
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: AppColors.primary500.withValues(alpha: 0.45),
        ),
      ),
      focusedBorder: const OutlineInputBorder(
        borderRadius: BorderRadius.all(Radius.circular(12)),
        borderSide: BorderSide(color: AppColors.primary500, width: 1.5),
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: AppColors.primary500.withValues(alpha: 0.45),
        ),
      ),
      contentPadding: const EdgeInsets.symmetric(
        vertical: 12,
        horizontal: 12,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: HenzoHeaderBackButton(
          onPressed: () => Navigator.pop(context),
        ),
        leadingWidth: 56,
        title: Text(
          locale.t('clientHome.locationPickerTitle'),
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.3,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: Padding(
        padding: screenPaddingH(top: 8, bottom: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _controller,
              onChanged: _onChanged,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 14,
              ),
              textCapitalization: TextCapitalization.words,
              decoration: _searchDecoration(locale),
            ),
            const SizedBox(height: 12),
            Material(
              color: AppColors.backgroundPrimary,
              borderRadius: BorderRadius.circular(12),
              child: InkWell(
                onTap: _hasSearchText ? _submitManual : null,
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                  child: Row(
                    children: [
                      SvgPicture.asset(
                        'assets/icons/icon-pin.svg',
                        width: 14,
                        height: 18,
                        colorFilter: ColorFilter.mode(
                          _hasSearchText
                              ? AppColors.primary500
                              : AppColors.textTertiary,
                          BlendMode.srcIn,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          locale.t('clientHome.locationPickerUseCity'),
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: _hasSearchText
                                ? AppColors.primary500
                                : AppColors.textTertiary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: _suggestions.isEmpty
                  ? Center(
                      child: Text(
                        locale.t('clientHome.locationPickerEmpty'),
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 14,
                          height: 1.4,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    )
                  : ListView.separated(
                      itemCount: _suggestions.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (_, index) {
                        final suggestion = _suggestions[index];
                        final city = suggestion.displayCity;
                        return Material(
                          color: AppColors.backgroundPrimary,
                          borderRadius: BorderRadius.circular(12),
                          child: InkWell(
                            onTap: () => _pickCity(
                              city,
                              lat: suggestion.lat,
                              lon: suggestion.lon,
                            ),
                            borderRadius: BorderRadius.circular(12),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 14,
                              ),
                              child: Row(
                                children: [
                                  SvgPicture.asset(
                                    'assets/icons/icon-pin.svg',
                                    width: 12,
                                    height: 16,
                                    colorFilter: const ColorFilter.mode(
                                      _locationBlue,
                                      BlendMode.srcIn,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      city,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                        letterSpacing: -0.2,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                  ),
                                  const Icon(
                                    Icons.chevron_right_rounded,
                                    size: 22,
                                    color: AppColors.textTertiary,
                                  ),
                                ],
                              ),
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
