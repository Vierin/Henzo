import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../widgets/common/henzo_modal.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../models/salon.dart';
import '../../models/training_location_item.dart';
import '../../services/auth_service.dart';
import '../../services/cache/salon_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../services/owner_photo_storage_service.dart';
import '../../utils/default_training_location_swap.dart';
import '../../utils/show_api_error.dart';
import '../../utils/owner_image_picker.dart';
import '../../utils/training_locations_storage.dart';
import '../../widgets/address_picker_modal.dart';
import '../../widgets/common/henzo_header_back_button.dart';
import '../../widgets/training/training_location_picker_sheet.dart';
import '../../widgets/settings/settings_form_tokens.dart';
import '../../widgets/settings/settings_typography.dart';
import '../../widgets/settings/studio_social_link.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Scroll + optional focus when opening studio profile from onboarding.
enum StudioProfileFocusTarget {
  description,
  contacts,
}

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key, this.initialFocusTarget});

  final StudioProfileFocusTarget? initialFocusTarget;

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  static const int _maxStudioPhotos = 5;

  final _salonFormKey = GlobalKey<FormState>();
  final _scrollController = ScrollController();
  final _descriptionFieldKey = GlobalKey();
  final _contactsSectionKey = GlobalKey();
  final _descriptionFocusNode = FocusNode();
  final _phoneFocusNode = FocusNode();
  final _salonNameController = TextEditingController();
  final _salonDescriptionController = TextEditingController();
  final _salonAddressController = TextEditingController();
  final _salonPhoneController = TextEditingController();
  final _salonEmailController = TextEditingController();
  bool _initialFocusApplied = false;

  Salon? _salon;
  bool _salonLoading = true;
  bool _salonSaving = false;
  bool _photosProcessing = false;
  bool _logoUploading = false;
  String? _photoProgressText;
  String? _logoUrl;
  double? _salonLat;
  double? _salonLon;
  List<String> _studioPhotos = <String>[];
  List<StudioSocialLink> _socialLinks = <StudioSocialLink>[];
  List<TrainingLocationItem> _locations = [];
  String _initialSnapshot = '';

  @override
  void initState() {
    super.initState();
    for (final controller in [
      _salonNameController,
      _salonDescriptionController,
      _salonAddressController,
      _salonPhoneController,
      _salonEmailController,
    ]) {
      controller.addListener(_onFormChanged);
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadSalon();
    });
  }

  void _onFormChanged() {
    if (!mounted) return;
    setState(() {});
  }

  Future<void> _loadSalon() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null) {
      setState(() => _salonLoading = false);
      return;
    }
    try {
      final salon = await context.read<SalonCache>().getSalon(token);
      if (!mounted) return;
      setState(() {
        _salon = salon;
        _salonLoading = false;
      });
      _fillSalonFromData();
      _scheduleInitialFocus();
    } catch (_) {
      if (!mounted) return;
      setState(() => _salonLoading = false);
      _scheduleInitialFocus();
    }
  }

  void _scheduleInitialFocus() {
    if (_initialFocusApplied || widget.initialFocusTarget == null) return;
    WidgetsBinding.instance.addPostFrameCallback((_) => _applyInitialFocus());
  }

  Future<void> _applyInitialFocus() async {
    if (!mounted || _initialFocusApplied || widget.initialFocusTarget == null) {
      return;
    }
    if (_salonLoading) return;
    _initialFocusApplied = true;

    final GlobalKey targetKey;
    final FocusNode focusNode;
    switch (widget.initialFocusTarget!) {
      case StudioProfileFocusTarget.description:
        targetKey = _descriptionFieldKey;
        focusNode = _descriptionFocusNode;
      case StudioProfileFocusTarget.contacts:
        targetKey = _contactsSectionKey;
        focusNode = _phoneFocusNode;
    }

    final targetContext = targetKey.currentContext;
    if (targetContext != null) {
      await Scrollable.ensureVisible(
        targetContext,
        duration: const Duration(milliseconds: 320),
        curve: Curves.easeInOut,
        alignment: 0.28,
      );
    }
    if (!mounted) return;
    focusNode.requestFocus();
  }

  void _fillSalonFromData() {
    final s = _salon;
    if (s == null) return;
    _salonNameController.text = s.name ?? '';
    _salonDescriptionController.text = s.description ?? '';
    _salonAddressController.text = s.address ?? '';
    _salonPhoneController.text = s.phone ?? '';
    _salonEmailController.text = s.email ?? '';
    _salonLat = s.latitude;
    _salonLon = s.longitude;
    _studioPhotos = List<String>.from(s.photos ?? <String>[]);
    _logoUrl = s.logoUrl?.trim().isNotEmpty == true ? s.logoUrl!.trim() : null;
    _socialLinks = studioSocialLinksFromSalon(s);
    final locale = context.read<LocaleProvider>();
    _locations = TrainingLocationItem.listFromSalon(
      s,
      mainStudioName: locale.t('locations.mainStudio'),
    );
    _initialSnapshot = _buildSnapshot();
    if (mounted) setState(() {});
  }

  TrainingLocationItem? get _primaryLocation {
    for (final loc in _locations) {
      if (loc.isDefault) return loc;
    }
    return _locations.isNotEmpty ? _locations.first : null;
  }

  void _applyLocationsFromSalon(Salon? salon, LocaleProvider locale) {
    _locations = TrainingLocationItem.listFromSalon(
      salon,
      mainStudioName: locale.t('locations.mainStudio'),
    );
  }

  @override
  void dispose() {
    for (final controller in [
      _salonNameController,
      _salonDescriptionController,
      _salonAddressController,
      _salonPhoneController,
      _salonEmailController,
    ]) {
      controller.removeListener(_onFormChanged);
    }
    _scrollController.dispose();
    _descriptionFocusNode.dispose();
    _phoneFocusNode.dispose();
    _salonNameController.dispose();
    _salonDescriptionController.dispose();
    _salonAddressController.dispose();
    _salonPhoneController.dispose();
    _salonEmailController.dispose();
    super.dispose();
  }

  String _buildSnapshot() {
    final photos = List<String>.from(_studioPhotos)..sort();
    return [
      _salonNameController.text.trim(),
      _salonDescriptionController.text.trim(),
      _salonAddressController.text.trim(),
      _salonPhoneController.text.trim(),
      _salonEmailController.text.trim(),
      _salonLat?.toStringAsFixed(6) ?? '',
      _salonLon?.toStringAsFixed(6) ?? '',
      _logoUrl ?? '',
      photos.join('|'),
      studioSocialLinksSnapshot(_socialLinks),
      _primaryLocation?.name.trim() ?? '',
      TrainingLocationItem.extraLocationsToJson(_locations).toString(),
    ].join('::');
  }

  bool get _hasUnsavedChanges {
    if (_salonLoading) return false;
    return _buildSnapshot() != _initialSnapshot;
  }

  bool get _canSaveFromAppBar {
    return !_salonSaving &&
        !_salonLoading &&
        !_photosProcessing &&
        !_logoUploading &&
        _hasUnsavedChanges;
  }

  Future<bool> _confirmDiscardChanges() async {
    if (!_hasUnsavedChanges) return true;
    final shouldLeave = await showHenzoDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: Text(context.read<LocaleProvider>().t('profileForm.unsavedChanges')),
          content: Text(context.read<LocaleProvider>().t('profileForm.confirmDiscardChanges')),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: Text(context.read<LocaleProvider>().t('common.stay')),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: Text(context.read<LocaleProvider>().t('common.exit')),
            ),
          ],
        );
      },
    );
    return shouldLeave ?? false;
  }

  void _markLocationSnapshotSaved() {
    const locationPartIndexes = [2, 5, 6, 9, 10];
    final initial = _initialSnapshot.split('::');
    final current = _buildSnapshot().split('::');
    if (initial.length != current.length) {
      _initialSnapshot = _buildSnapshot();
      return;
    }
    for (final i in locationPartIndexes) {
      if (i < initial.length) initial[i] = current[i];
    }
    _initialSnapshot = initial.join('::');
  }

  Future<void> _handleBackPressed() async {
    final shouldLeave = await _confirmDiscardChanges();
    if (!mounted || !shouldLeave) return;
    Navigator.of(context).pop();
  }

  Future<void> _openDefaultLocationPicker() async {
    final locale = context.read<LocaleProvider>();
    final salon = _salon;
    if (salon == null) {
      final selection = await AddressPickerModal.show(
        context,
        initialLocationName: locale.t('locations.mainStudio'),
        initialAddress: _salonAddressController.text.trim(),
        initialLat: _salonLat,
        initialLon: _salonLon,
      );
      if (selection == null || !mounted) return;
      setState(() {
        _salonAddressController.text = selection.address;
        _salonLat = selection.lat;
        _salonLon = selection.lon;
      });
      return;
    }

    if (_locations.isEmpty) {
      _applyLocationsFromSalon(salon, locale);
    }

    const defaultId = 'default';
    final result = await showTrainingLocationPickerSheet(
      context,
      locations: _locations,
      selectedId: defaultId,
      mode: TrainingLocationPickerMode.setDefault,
      titleL10nKey: 'profileForm.chooseDefaultLocationSheetTitle',
      onDeleteLocation: _deleteTrainingLocationFromSettings,
    );
    if (!mounted || result == null) return;

    switch (result) {
      case TrainingLocationPicked(:final location):
        if (location.id == defaultId) return;
        final swap = swapSalonDefaultTrainingLocation(
          salon: salon,
          locations: _locations,
          newDefaultId: location.id,
          mainStudioName: locale.t('locations.mainStudio'),
        );
        if (swap == null) return;
        final updatedLocations = [
          TrainingLocationItem(
            id: defaultId,
            name: swap.primaryName,
            address: swap.address,
            isDefault: true,
            latitude: swap.latitude,
            longitude: swap.longitude,
          ),
          ...swap.extraLocations,
        ];
        try {
          final updatedSalon = await persistTrainingLocationDefaultSwap(
            context,
            salon,
            address: swap.address,
            latitude: swap.latitude,
            longitude: swap.longitude,
            defaultLocationName: swap.primaryName,
            locations: updatedLocations,
          );
          if (!mounted) return;
          setState(() {
            _salon = updatedSalon ?? salon;
            _salonAddressController.text = swap.address;
            _salonLat = swap.latitude;
            _salonLon = swap.longitude;
            _locations = TrainingLocationItem.listFromSalon(
              _salon,
              mainStudioName: locale.t('locations.mainStudio'),
            );
          });
          _markLocationSnapshotSaved();
        } catch (e) {
          if (mounted) showApiError(context, e);
        }
      case TrainingLocationAddRequested():
        await _addNewTrainingLocationFromSettings();
    }
  }

  Future<bool> _deleteTrainingLocationFromSettings(
    TrainingLocationItem loc,
  ) async {
    final salon = _salon;
    if (salon == null || loc.id == 'default') return false;

    final updated = _locations.where((l) => l.id != loc.id).toList();
    try {
      final updatedSalon = await persistExtraTrainingLocations(
        context,
        salon,
        updated,
      );
      if (!mounted) return false;
      final locale = context.read<LocaleProvider>();
      setState(() {
        _salon = updatedSalon ?? salon;
        _applyLocationsFromSalon(_salon, locale);
      });
      return true;
    } catch (e) {
      if (mounted) showApiError(context, e);
      return false;
    }
  }

  Future<void> _addNewTrainingLocationFromSettings() async {
    final locale = context.read<LocaleProvider>();
    final salon = _salon;
    if (salon == null) return;

    if (_locations.isEmpty) {
      _applyLocationsFromSalon(salon, locale);
    }

    final selection = await AddressPickerModal.show(
      context,
      initialAddress: '',
    );
    if (!mounted || selection == null) return;

    final newLoc = TrainingLocationItem(
      id: 'loc_${DateTime.now().millisecondsSinceEpoch}',
      name: selection.locationName,
      address: selection.address.trim(),
      latitude: selection.lat,
      longitude: selection.lon,
    );
    final updatedList = [..._locations, newLoc];

    try {
      final updatedSalon = await persistExtraTrainingLocations(
        context,
        salon,
        updatedList,
      );
      if (!mounted) return;
      setState(() {
        _salon = updatedSalon ?? salon;
        _applyLocationsFromSalon(_salon, locale);
      });
    } catch (e) {
      if (mounted) showApiError(context, e);
    }
  }

  Future<void> _saveSalon() async {
    if (!_hasUnsavedChanges) return;
    if (!(_salonFormKey.currentState?.validate() ?? false)) return;
    final name = _salonNameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(context.read<LocaleProvider>().t('profileForm.enterSalonName'))));
      return;
    }
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;
    final hadSalon = _salon != null;
    setState(() => _salonSaving = true);
    try {
      final socialPayload = studioSocialLinksToPayload(_socialLinks);
      final phone = _salonPhoneController.text.trim();
      final email = _salonEmailController.text.trim();
      final payload = <String, dynamic>{
        'name': name,
        'description': _salonDescriptionController.text.trim(),
        'address': _salonAddressController.text.trim(),
        if (phone.isNotEmpty) 'phone': phone,
        if (email.isNotEmpty) 'email': email,
        'website': socialPayload.website ?? '',
        'instagram': socialPayload.instagram ?? '',
        'photos': _studioPhotos,
        'logoUrl': _logoUrl ?? '',
      };
      if (_salonLat != null && _salonLon != null) {
        payload['latitude'] = _salonLat;
        payload['longitude'] = _salonLon;
      }
      final reminderSettings = <String, dynamic>{...?_salon?.reminderSettings};
      if (_locations.isNotEmpty) {
        reminderSettings['trainingLocations'] =
            TrainingLocationItem.extraLocationsToJson(_locations);
        TrainingLocationItem.writeDefaultLocationName(
          reminderSettings,
          _primaryLocation?.name,
        );
      }
      if (socialPayload.extras.isNotEmpty) {
        reminderSettings['socialLinks'] = socialPayload.extras;
      } else {
        reminderSettings.remove('socialLinks');
      }
      if (reminderSettings.isNotEmpty) {
        payload['reminderSettings'] = reminderSettings;
      }
      Salon result;
      if (hadSalon) {
        if (_salon!.workingHours != null)
          payload['workingHours'] = _salon!.workingHours;
        result = await DashboardApiService.updateCurrentSalon(token, payload);
      } else {
        result = await DashboardApiService.createCurrentSalon(token, payload);
      }
      if (!mounted) return;
      context.read<SalonCache>().invalidate();
      setState(() {
        _salon = result;
        _salonSaving = false;
      });
      _fillSalonFromData();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            hadSalon
                ? context.read<LocaleProvider>().t('profileForm.salonUpdated')
                : context.read<LocaleProvider>().t('profileForm.salonCreated'),
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _salonSaving = false);
      showApiError(context, e);
    }
  }

  Future<void> _pickStudioLogo() async {
    if (_logoUploading || _photosProcessing) return;

    final picked = await OwnerImagePicker.pickSingleFromGallery();
    if (picked == null) return;

    if (Supabase.instance.client.auth.currentUser?.id == null) {
      _showSnack(context.read<LocaleProvider>().t('profileForm.loginToUploadLogo'));
      return;
    }

    setState(() => _logoUploading = true);
    try {
      final upload = await OwnerPhotoStorageService.uploadStudioLogo(
        file: picked,
      );
      if (!mounted) return;
      if (upload.url == null) {
        _showSnack(upload.error ?? context.read<LocaleProvider>().t('profileForm.uploadLogoFailed'));
        return;
      }
      setState(() => _logoUrl = upload.url);
    } finally {
      if (mounted) setState(() => _logoUploading = false);
    }
  }

  void _removeStudioLogo() {
    setState(() => _logoUrl = null);
  }

  Future<void> _pickStudioPhotos() async {
    if (_photosProcessing) return;
    final availableSlots = _maxStudioPhotos - _studioPhotos.length;
    if (availableSlots <= 0) {
      _showSnack(context.read<LocaleProvider>().t('profileForm.photoLimitExceeded').replaceAll('{max}', '$_maxStudioPhotos'));
      return;
    }

    final picked = await OwnerImagePicker.pickMultipleFromGallery(
      limit: availableSlots,
    );
    if (picked.isEmpty) return;

    var filesToProcess = picked;
    if (picked.length > availableSlots) {
      filesToProcess = picked.take(availableSlots).toList();
      _showSnack(context.read<LocaleProvider>().t('profileForm.extraPhotosSkipped').replaceAll('{max}', '$_maxStudioPhotos'));
    }

    if (Supabase.instance.client.auth.currentUser?.id == null) {
      _showSnack(context.read<LocaleProvider>().t('profileForm.loginToUploadPhotos'));
      return;
    }

    final locale = context.read<LocaleProvider>();
    setState(() => _photosProcessing = true);
    setState(() => _photoProgressText = locale.t('profileForm.optimizing'));
    final uploadedUrls = <String>[];
    var oversizedCount = 0;
    var failedUploadsCount = 0;
    final uploadErrors = <String>{};
    for (final file in filesToProcess) {
      if (mounted) {
        setState(() => _photoProgressText = locale.t('profileForm.uploading'));
      }
      final upload = await OwnerPhotoStorageService.uploadStudioGalleryPhoto(
        file: file,
      );
      if (upload.url == null) {
        if (upload.error == locale.t('profileForm.photoTooLarge') || upload.error == 'Фото больше 3 MB') {
          oversizedCount++;
        } else {
          failedUploadsCount++;
          if (upload.error != null && upload.error!.isNotEmpty) {
            uploadErrors.add(upload.error!);
          }
        }
        continue;
      }
      uploadedUrls.add(upload.url!);
    }

    if (!mounted) return;
    setState(() {
      _studioPhotos = <String>[..._studioPhotos, ...uploadedUrls];
      _photosProcessing = false;
      _photoProgressText = null;
    });
    if (oversizedCount > 0) {
      _showSnack(locale.t('profileForm.oversizedPhotosSkipped').replaceAll('{count}', '$oversizedCount'));
    }
    if (failedUploadsCount > 0) {
      _showSnack(locale.t('profileForm.uploadsFailed').replaceAll('{count}', '$failedUploadsCount'));
      if (uploadErrors.isNotEmpty) {
        _showSnack(uploadErrors.first);
      }
    }
  }

  void _removePhotoAt(int index) {
    setState(() => _studioPhotos.removeAt(index));
  }

  Future<void> _addSocialLink() async {
    final excluded = _socialLinks.map((l) => l.platform).toSet();
    final platform = await showStudioSocialPlatformPickerSheet(
      context,
      excluded: excluded,
    );
    if (!mounted || platform == null) return;

    final value = await showStudioSocialLinkEditSheet(
      context,
      platform: platform,
    );
    if (!mounted || value == null || value.isEmpty) return;

    setState(() {
      _socialLinks = [
        ..._socialLinks,
        StudioSocialLink(platform: platform, value: value),
      ];
    });
  }

  Future<void> _editSocialLink(int index) async {
    final link = _socialLinks[index];
    final value = await showStudioSocialLinkEditSheet(
      context,
      platform: link.platform,
      initialValue: link.value,
    );
    if (!mounted || value == null) return;
    if (value.isEmpty) {
      setState(() => _socialLinks.removeAt(index));
      return;
    }
    setState(() => _socialLinks[index].value = value);
  }

  void _removeSocialLink(int index) {
    setState(() => _socialLinks.removeAt(index));
  }

  void _showSnack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  InputDecoration _inputDecoration({
    required String hint,
    bool alignLabelWithHint = false,
    int maxLines = 1,
  }) => settingsBorderlessInputDecoration(
    hintText: hint,
    alignLabelWithHint: alignLabelWithHint,
    maxLines: maxLines,
  );

  @override
  Widget build(BuildContext context) {
    return Consumer<LocaleProvider>(
      builder: (context, locale, _) {
        return PopScope(
          canPop: !_hasUnsavedChanges,
          onPopInvokedWithResult: (didPop, _) async {
            if (didPop) return;
            await _handleBackPressed();
          },
          child: Scaffold(
            backgroundColor: AppColors.backgroundSecondary,
            appBar: AppBar(
              leading: HenzoHeaderBackButton(
                onPressed: () => _handleBackPressed(),
              ),
              leadingWidth: 56,
              title: Text(
                locale.t('settings.owner.studioProfile'),
                style: SettingsTypography.screenTitle(context),
              ),
              centerTitle: true,
              backgroundColor: AppColors.backgroundSecondary,
              foregroundColor: AppColors.textPrimary,
              elevation: 0,
              scrolledUnderElevation: 0,
              actions: [
                Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: Center(
                    child: FilledButton(
                      onPressed: _canSaveFromAppBar ? _saveSalon : null,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primary500,
                        disabledBackgroundColor: AppColors.neutral200,
                        disabledForegroundColor: AppColors.textTertiary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 18),
                        minimumSize: const Size(0, 36),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                        ),
                      ),
                      child: _salonSaving
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : Text(
                              locale.t('common.save'),
                              style: TextStyle(
                                fontSize: 15.sp,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                    ),
                  ),
                ),
              ],
            ),
            body: GestureDetector(
              behavior: HitTestBehavior.translucent,
              onTap: () => FocusManager.instance.primaryFocus?.unfocus(),
              child: ListView(
                controller: _scrollController,
                padding: const EdgeInsets.fromLTRB(
                  kScreenPaddingHorizontal,
                  8,
                  kScreenPaddingHorizontal,
                  24,
                ),
                children: [
                  // Секции салона в одной форме
                  _salonLoading
                      ? _ProfileSection(
                          title: locale.t('profileForm.studioLogo'),
                          child: const Padding(
                            padding: EdgeInsets.symmetric(vertical: 24),
                            child: Center(child: CircularProgressIndicator()),
                          ),
                        )
                      : Form(
                          key: _salonFormKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              _ProfileSection(
                                title: locale.t('profileForm.studioLogo'),
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    Text(
                                      locale.t('profileForm.studioLogoHint'),
                                      style: TextStyle(
                                        color: AppColors.textSecondary,
                                        fontSize: 13.sp,
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    Center(
                                      child: _StudioLogoTile(
                                        logoUrl: _logoUrl,
                                        loading: _logoUploading,
                                        addLabel: locale.t(
                                          'profileForm.addStudioLogo',
                                        ),
                                        changeLabel: locale.t(
                                          'profileForm.changeStudioLogo',
                                        ),
                                        onTap: _pickStudioLogo,
                                        onRemove: _logoUrl != null
                                            ? _removeStudioLogo
                                            : null,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 24),
                              _ProfileSection(
                                title: locale.t('profileForm.studioPhotos'),
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    Text(
                                      locale.t('profileForm.studioPhotosHint'),
                                      style: TextStyle(
                                        color: AppColors.textSecondary,
                                        fontSize: 13.sp,
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    SizedBox(
                                      height: _StudioPhotoGallery.tileSize,
                                      child: ListView.separated(
                                        scrollDirection: Axis.horizontal,
                                        itemCount:
                                            _studioPhotos.length +
                                            (_studioPhotos.length <
                                                    _maxStudioPhotos
                                                ? 1
                                                : 0),
                                        separatorBuilder: (_, __) =>
                                            const SizedBox(width: 10),
                                        itemBuilder: (context, index) {
                                          final hasAddSlot =
                                              _studioPhotos.length <
                                              _maxStudioPhotos;
                                          if (hasAddSlot && index == 0) {
                                            return _AddStudioPhotoTile(
                                              loading: _photosProcessing,
                                              onTap: _pickStudioPhotos,
                                            );
                                          }
                                          final photoIndex =
                                              index - (hasAddSlot ? 1 : 0);
                                          return _StudioPhotoTile(
                                            photo: _studioPhotos[photoIndex],
                                            isMain: photoIndex == 0,
                                            mainLabel: locale.t(
                                              'profileForm.mainPhoto',
                                            ),
                                            onRemove: () =>
                                                _removePhotoAt(photoIndex),
                                          );
                                        },
                                      ),
                                    ),
                                    if (_photosProcessing &&
                                        _photoProgressText != null) ...[
                                      const SizedBox(height: 10),
                                      Row(
                                        children: [
                                          const SizedBox(
                                            width: 16,
                                            height: 16,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            _photoProgressText!,
                                            style: TextStyle(
                                              color: AppColors.textSecondary,
                                              fontSize: 13.sp,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              const SizedBox(height: 24),
                              _ProfileSection(
                                title: locale.t('profileForm.mainInfo'),
                                carded: false,
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    TextFormField(
                                      controller: _salonNameController,
                                      decoration: _inputDecoration(
                                        hint: locale.t(
                                          'profileForm.enterSalonName',
                                        ),
                                      ),
                                      textCapitalization:
                                          TextCapitalization.words,
                                      validator: (v) =>
                                          (v == null || v.trim().isEmpty)
                                          ? locale.t(
                                              'profileForm.requiredField',
                                            )
                                          : null,
                                    ),
                                    const SizedBox(height: 16),
                                    TextFormField(
                                      key: _descriptionFieldKey,
                                      focusNode: _descriptionFocusNode,
                                      controller: _salonDescriptionController,
                                      decoration: _inputDecoration(
                                        hint: locale.t(
                                          'profileForm.enterDescription',
                                        ),
                                        alignLabelWithHint: true,
                                        maxLines: 4,
                                      ),
                                      maxLines: 4,
                                    ),
                                    const SizedBox(height: 16),
                                    Material(
                                      color: AppColors.backgroundPrimary,
                                      borderRadius: settingsInputBorderRadius(
                                        maxLines: 2,
                                      ),
                                      clipBehavior: Clip.antiAlias,
                                      child: InkWell(
                                        onTap: _openDefaultLocationPicker,
                                        borderRadius: settingsInputBorderRadius(
                                          maxLines: 2,
                                        ),
                                        child: Padding(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 12,
                                            vertical: 14,
                                          ),
                                          child: Row(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Padding(
                                                padding: const EdgeInsets.only(
                                                  top: 2,
                                                ),
                                                child: SvgPicture.asset(
                                                  'assets/icons/icon-pin.svg',
                                                  width: 15,
                                                  height: 21,
                                                ),
                                              ),
                                              const SizedBox(width: 12),
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment:
                                                      CrossAxisAlignment.start,
                                                  children: [
                                                    Builder(
                                                      builder: (context) {
                                                        final primary =
                                                            _primaryLocation;
                                                        final displayName =
                                                            primary?.name
                                                                    .trim()
                                                                    .isNotEmpty ==
                                                                true
                                                            ? primary!.name
                                                                  .trim()
                                                            : locale.t(
                                                                'addTraining.studioNameFallback',
                                                              );
                                                        final address =
                                                            primary?.address
                                                                .trim() ??
                                                            _salonAddressController
                                                                .text
                                                                .trim();
                                                        return Column(
                                                          crossAxisAlignment:
                                                              CrossAxisAlignment
                                                                  .start,
                                                          children: [
                                                            Text(
                                                              displayName,
                                                              style: TextStyle(
                                                                fontSize: 16.sp,
                                                                fontWeight:
                                                                    FontWeight
                                                                        .w700,
                                                                color: AppColors
                                                                    .textPrimary,
                                                              ),
                                                            ),
                                                            if (address
                                                                .isNotEmpty) ...[
                                                              const SizedBox(
                                                                height: 4,
                                                              ),
                                                              Text(
                                                                address,
                                                                style: TextStyle(
                                                                  fontSize: 14.sp,
                                                                  height: 1.25,
                                                                  fontWeight:
                                                                      FontWeight
                                                                          .w400,
                                                                  color: AppColors
                                                                      .textSecondary,
                                                                ),
                                                              ),
                                                            ] else
                                                              Padding(
                                                                padding:
                                                                    const EdgeInsets.only(
                                                                      top: 4,
                                                                    ),
                                                                child: Text(
                                                                  locale.t(
                                                                    'addTraining.noAddress',
                                                                  ),
                                                                  style: TextStyle(
                                                                    fontSize: 14.sp,
                                                                    color: AppColors
                                                                        .textTertiary,
                                                                  ),
                                                                ),
                                                              ),
                                                          ],
                                                        );
                                                      },
                                                    ),
                                                  ],
                                                ),
                                              ),
                                              const Padding(
                                                padding: EdgeInsets.only(
                                                  top: 4,
                                                ),
                                                child: Icon(
                                                  CupertinoIcons
                                                      .chevron_forward,
                                                  size: 18,
                                                  color: AppColors.textTertiary,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 24),
                              _ProfileSection(
                                key: _contactsSectionKey,
                                title: locale.t('profileForm.contactInfo'),
                                carded: false,
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    TextFormField(
                                      focusNode: _phoneFocusNode,
                                      controller: _salonPhoneController,
                                      decoration: _inputDecoration(
                                        hint: locale.t(
                                          'profileForm.enterPhone',
                                        ),
                                      ),
                                      keyboardType: TextInputType.phone,
                                    ),
                                    const SizedBox(height: 16),
                                    TextFormField(
                                      controller: _salonEmailController,
                                      decoration: _inputDecoration(
                                        hint: locale.t(
                                          'profileForm.enterEmail',
                                        ),
                                      ),
                                      keyboardType: TextInputType.emailAddress,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 24),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  _ProfileSectionTitle(
                                    title: locale.t('profileForm.socialLinks'),
                                  ),
                                  ...List.generate(_socialLinks.length, (
                                    index,
                                  ) {
                                    final link = _socialLinks[index];
                                    return Padding(
                                      padding: const EdgeInsets.only(
                                        bottom: 10,
                                      ),
                                      child: _SocialLinkRow(
                                        link: link,
                                        onEdit: () => _editSocialLink(index),
                                        onDelete: () =>
                                            _removeSocialLink(index),
                                      ),
                                    );
                                  }),
                                  if (_socialLinks.length <
                                      StudioSocialPlatform.values.length)
                                    OutlinedButton.icon(
                                      onPressed: _addSocialLink,
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: AppColors.primary500,
                                        backgroundColor: Colors.transparent,
                                        side: const BorderSide(
                                          color: AppColors.primary500,
                                        ),
                                        minimumSize: const Size(0, 48),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(
                                            kSettingsInputBorderRadius,
                                          ),
                                        ),
                                      ),
                                      icon: const Icon(Icons.add, size: 20),
                                      label: Text(
                                        locale.t('profileForm.addSocialLink'),
                                        style: TextStyle(
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _StudioLogoTile extends StatelessWidget {
  const _StudioLogoTile({
    required this.logoUrl,
    required this.loading,
    required this.addLabel,
    required this.changeLabel,
    required this.onTap,
    this.onRemove,
  });

  static const double tileSize = 120;

  final String? logoUrl;
  final bool loading;
  final String addLabel;
  final String changeLabel;
  final VoidCallback onTap;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    final hasLogo = logoUrl != null && logoUrl!.isNotEmpty;
    final actionLabel = hasLogo ? changeLabel : addLabel;

    return Column(
      children: [
        SizedBox(
          width: tileSize,
          height: tileSize,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Material(
                color: AppColors.backgroundSecondary,
                borderRadius: BorderRadius.circular(kSettingsInputBorderRadius),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: loading ? null : onTap,
                  borderRadius: BorderRadius.circular(
                    kSettingsInputBorderRadius,
                  ),
                  child: SizedBox(
                    width: tileSize,
                    height: tileSize,
                    child: hasLogo
                        ? Image.network(
                            logoUrl!,
                            fit: BoxFit.cover,
                            width: tileSize,
                            height: tileSize,
                            errorBuilder: (_, __, ___) => Center(
                              child: SvgPicture.asset(
                                'assets/icons/icon-add-photo.svg',
                                width: 35,
                                height: 35,
                              ),
                            ),
                          )
                        : Center(
                            child: loading
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : SvgPicture.asset(
                                    'assets/icons/icon-add-photo.svg',
                                    width: 35,
                                    height: 35,
                                  ),
                          ),
                  ),
                ),
              ),
              if (hasLogo && onRemove != null)
                Positioned(
                  top: 6,
                  right: 6,
                  child: Material(
                    color: Colors.white,
                    shape: const CircleBorder(),
                    elevation: 1,
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: loading ? null : onRemove,
                      child: const Padding(
                        padding: EdgeInsets.all(4),
                        child: Icon(
                          Icons.close,
                          size: 14,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ),
                ),
              if (loading && hasLogo)
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.65),
                      borderRadius: BorderRadius.circular(
                        kSettingsInputBorderRadius,
                      ),
                    ),
                    child: const Center(
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Text(
          actionLabel,
          style: TextStyle(
            fontSize: 14.sp,
            fontWeight: FontWeight.w600,
            color: AppColors.primary500,
          ),
        ),
      ],
    );
  }
}

class _StudioPhotoGallery {
  static const double tileSize = 120;
}

class _StudioPhotoTile extends StatelessWidget {
  const _StudioPhotoTile({
    required this.photo,
    required this.onRemove,
    this.isMain = false,
    this.mainLabel = 'Main',
  });

  final String photo;
  final VoidCallback onRemove;
  final bool isMain;
  final String mainLabel;

  @override
  Widget build(BuildContext context) {
    const tileSize = _StudioPhotoGallery.tileSize;
    return SizedBox(
      width: tileSize,
      height: tileSize,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(kSettingsInputBorderRadius),
            child: SizedBox(
              width: tileSize,
              height: tileSize,
              child: Image.network(
                photo,
                fit: BoxFit.cover,
                width: tileSize,
                height: tileSize,
                errorBuilder: (_, __, ___) => ColoredBox(
                  color: AppColors.backgroundSecondary,
                  child: Center(
                    child: SvgPicture.asset(
                      'assets/icons/icon-add-photo.svg',
                      width: 28,
                      height: 28,
                    ),
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            top: 6,
            right: 6,
            child: Material(
              color: Colors.white,
              shape: const CircleBorder(),
              elevation: 1,
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: onRemove,
                child: const Padding(
                  padding: EdgeInsets.all(4),
                  child: Icon(
                    Icons.close,
                    size: 14,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ),
          ),
          if (isMain)
            Positioned(
              left: 8,
              bottom: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 3,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.92),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  mainLabel,
                  style: TextStyle(
                    fontSize: 11.sp,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _AddStudioPhotoTile extends StatelessWidget {
  const _AddStudioPhotoTile({required this.loading, required this.onTap});

  final bool loading;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    const tileSize = _StudioPhotoGallery.tileSize;
    return Material(
      color: AppColors.backgroundSecondary,
      borderRadius: BorderRadius.circular(kSettingsInputBorderRadius),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: loading ? null : onTap,
        borderRadius: BorderRadius.circular(kSettingsInputBorderRadius),
        child: SizedBox(
          width: tileSize,
          height: tileSize,
          child: Center(
            child: loading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : SvgPicture.asset(
                    'assets/icons/icon-add-photo.svg',
                    width: 35,
                    height: 35,
                  ),
          ),
        ),
      ),
    );
  }
}

class _SocialLinkRow extends StatelessWidget {
  const _SocialLinkRow({
    required this.link,
    required this.onEdit,
    required this.onDelete,
  });

  final StudioSocialLink link;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final locale = context.read<LocaleProvider>();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: settingsSectionDecoration(),
      child: Row(
        children: [
          SocialPlatformIcon(platform: link.platform),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  link.platform.label(locale),
                  style: TextStyle(
                    fontSize: 15.sp,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  link.displayValue(),
                  style: TextStyle(
                    fontSize: 13.sp,
                    color: AppColors.textSecondary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          _SocialLinkActionButton(
            asset: 'assets/icons/icon-pencil.svg',
            borderColor: const Color(0xFF4D39A8),
            onTap: onEdit,
          ),
          const SizedBox(width: 8),
          _SocialLinkActionButton(
            asset: 'assets/icons/icon-trash.svg',
            borderColor: AppColors.primary500,
            onTap: onDelete,
          ),
        ],
      ),
    );
  }
}

class _SocialLinkActionButton extends StatelessWidget {
  const _SocialLinkActionButton({
    required this.asset,
    required this.onTap,
    required this.borderColor,
  });

  final String asset;
  final VoidCallback onTap;
  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.backgroundPrimary,
      shape: const CircleBorder(),
      clipBehavior: Clip.antiAlias,
      child: Container(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: borderColor),
        ),
        child: InkWell(
          onTap: onTap,
          customBorder: const CircleBorder(),
          child: SizedBox(
            width: 40,
            height: 40,
            child: Center(
              child: SvgPicture.asset(asset, width: 15, height: 15),
            ),
          ),
        ),
      ),
    );
  }
}

class _ProfileSectionTitle extends StatelessWidget {
  const _ProfileSectionTitle({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 12, bottom: 8),
      child: Text(
        title.toUpperCase(),
        style: SettingsTypography.sectionTitle(context),
      ),
    );
  }
}

class _ProfileSection extends StatelessWidget {
  const _ProfileSection({
    super.key,
    required this.title,
    required this.child,
    this.carded = true,
  });

  final String title;
  final Widget child;
  final bool carded;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _ProfileSectionTitle(title: title),
        if (carded)
          Container(
            decoration: settingsSectionDecoration(),
            padding: const EdgeInsets.all(16),
            child: child,
          )
        else
          child,
      ],
    );
  }
}
