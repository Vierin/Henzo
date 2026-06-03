import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../constants/layout.dart';
import '../l10n/locale_provider.dart';
import '../models/studio.dart';
import '../models/training_location_item.dart';
import '../services/auth_service.dart';
import '../services/cache/studio_cache.dart';
import '../services/dashboard_api_service.dart';
import '../utils/show_api_error.dart';
import '../widgets/address_picker_modal.dart';
import '../widgets/common/henzo_header_back_button.dart';
import '../widgets/common/henzo_modal.dart';
import '../widgets/settings/settings_typography.dart';
import '../widgets/settings/studio_name_address_fields.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Onboarding / owner: studio name + address (matches settings main info fields).
class StudioDetailsScreen extends StatefulWidget {
  const StudioDetailsScreen({super.key});

  @override
  State<StudioDetailsScreen> createState() => _StudioDetailsScreenState();
}

class _StudioDetailsScreenState extends State<StudioDetailsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();

  Studio? _studio;
  bool _loading = true;
  bool _saving = false;
  String _locationName = '';
  String _addressText = '';
  double? _lat;
  double? _lon;
  String _initialSnapshot = '';

  @override
  void initState() {
    super.initState();
    _nameController.addListener(_onFieldsChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadStudio());
  }

  @override
  void dispose() {
    _nameController.removeListener(_onFieldsChanged);
    _nameController.dispose();
    super.dispose();
  }

  void _onFieldsChanged() {
    if (mounted) setState(() {});
  }

  String _snapshot() =>
      '${_nameController.text.trim()}::$_locationName::$_addressText::$_lat::$_lon';

  bool get _hasChanges => _snapshot() != _initialSnapshot;

  bool get _canSave =>
      !_saving &&
      _hasChanges &&
      _nameController.text.trim().isNotEmpty &&
      _addressText.trim().isNotEmpty;

  Future<void> _loadStudio() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    try {
      final studio = await context.read<StudioCache>().getStudio(token);
      if (!mounted) return;
      _studio = studio;
      if (studio != null) {
        final locale = context.read<LocaleProvider>();
        _nameController.text = studio.name ?? '';
        final primary = TrainingLocationItem.defaultFromSalon(
          studio,
          mainStudioName: locale.t('locations.mainStudio'),
        );
        _locationName = primary.name;
        _addressText = studio.address?.trim() ?? '';
        _lat = studio.latitude;
        _lon = studio.longitude;
      }
      _initialSnapshot = _snapshot();
      setState(() => _loading = false);
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openAddressPicker() async {
    final locale = context.read<LocaleProvider>();
    final selection = await AddressPickerModal.show(
      context,
      initialLocationName: _locationName.trim().isNotEmpty
          ? _locationName.trim()
          : _nameController.text.trim().isNotEmpty
          ? _nameController.text.trim()
          : locale.t('locations.mainStudio'),
      initialAddress: _addressText,
      initialLat: _lat,
      initialLon: _lon,
    );
    if (selection == null || !mounted) return;
    setState(() {
      _locationName = selection.locationName.trim();
      _addressText = selection.address;
      _lat = selection.lat;
      _lon = selection.lon;
      final salonName = _nameController.text.trim();
      if (salonName.isEmpty ||
          salonName.toLowerCase() == 'studio') {
        _nameController.text = _locationName;
      }
    });
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final name = _nameController.text.trim();
    final locationName = _locationName.trim();
    final address = _addressText.trim();
    if (address.isEmpty) {
      _showSnack(context.read<LocaleProvider>().t('profileForm.enterAddress'));
      return;
    }

    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;

    setState(() => _saving = true);
    try {
      final reminderSettings = <String, dynamic>{
        ...?_studio?.reminderSettings,
      };
      TrainingLocationItem.writeDefaultLocationName(
        reminderSettings,
        locationName.isNotEmpty ? locationName : name,
      );

      final payload = <String, dynamic>{
        'name': name,
        'address': address,
        if (_lat != null) 'latitude': _lat,
        if (_lon != null) 'longitude': _lon,
        'reminderSettings': reminderSettings,
      };

      if (_studio == null) {
        await DashboardApiService.createCurrentStudio(token, payload);
      } else {
        await DashboardApiService.updateCurrentStudio(token, payload);
      }

      if (!mounted) return;
      context.read<StudioCache>().invalidate();
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      showApiError(context, e);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showSnack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Future<void> _handleBack() async {
    if (!_hasChanges) {
      if (mounted) Navigator.of(context).pop();
      return;
    }
    final leave = await showHenzoDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Изменения не сохранены'),
          content: const Text('Вы уверены, что хотите выйти без сохранения?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Остаться'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: const Text('Выйти'),
            ),
          ],
        );
      },
    );
    if (leave == true && mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();

    return PopScope(
      canPop: !_hasChanges,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        await _handleBack();
      },
      child: Scaffold(
        backgroundColor: AppColors.backgroundSecondary,
        appBar: AppBar(
          leading: HenzoHeaderBackButton(onPressed: _handleBack),
          leadingWidth: 56,
          title: Text(
            locale.t('dashboard.onboardingStudioDetailsScreenTitle'),
            style: SettingsTypography.screenTitle(context),
          ),
          centerTitle: true,
          backgroundColor: AppColors.backgroundSecondary,
          foregroundColor: AppColors.textPrimary,
          elevation: 0,
          scrolledUnderElevation: 0,
        ),
        body: GestureDetector(
          behavior: HitTestBehavior.translucent,
          onTap: () => FocusManager.instance.primaryFocus?.unfocus(),
          child: _loading
              ? const Center(
                  child: CircularProgressIndicator(
                    color: AppColors.primary500,
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(
                    kScreenPaddingHorizontal,
                    8,
                    kScreenPaddingHorizontal,
                    24,
                  ),
                  children: [
                    Form(
                      key: _formKey,
                      child: StudioProfileFormSection(
                        title: locale.t('profileForm.mainInfo'),
                        child: StudioNameAddressFields(
                          nameController: _nameController,
                          locationDisplayName: _locationName,
                          addressText: _addressText,
                          onAddressTap: _openAddressPicker,
                          nameValidator: (v) =>
                              (v == null || v.trim().isEmpty)
                              ? locale.t('profileForm.requiredField')
                              : null,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: _canSave ? _save : null,
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.primary500,
                          disabledBackgroundColor: AppColors.neutral200,
                          disabledForegroundColor: AppColors.textTertiary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: _saving
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : Text(
                                locale.t('common.save'),
                                style: TextStyle(
                                  fontSize: 16.sp,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
