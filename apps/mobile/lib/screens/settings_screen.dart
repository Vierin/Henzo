import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../models/salon.dart';
import '../../services/auth_service.dart';
import '../../services/cache/salon_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../services/owner_photo_storage_service.dart';
import '../../utils/show_api_error.dart';
import '../../widgets/address_picker_modal.dart';
import '../../widgets/settings/settings_typography.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  static const int _maxStudioPhotos = 5;

  final _salonFormKey = GlobalKey<FormState>();
  final _salonNameController = TextEditingController();
  final _salonDescriptionController = TextEditingController();
  final _salonAddressController = TextEditingController();
  final _salonPhoneController = TextEditingController();
  final _salonEmailController = TextEditingController();
  final _salonFacebookController = TextEditingController();
  final _salonInstagramController = TextEditingController();

  Salon? _salon;
  bool _salonLoading = true;
  bool _salonSaving = false;
  bool _photosProcessing = false;
  String? _photoProgressText;
  double? _salonLat;
  double? _salonLon;
  List<String> _studioPhotos = <String>[];
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
      _salonFacebookController,
      _salonInstagramController,
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
    } catch (_) {
      if (!mounted) return;
      setState(() => _salonLoading = false);
    }
  }

  void _fillSalonFromData() {
    final s = _salon;
    if (s == null) return;
    _salonNameController.text = s.name ?? '';
    _salonDescriptionController.text = s.description ?? '';
    _salonAddressController.text = s.address ?? '';
    _salonPhoneController.text = s.phone ?? '';
    _salonEmailController.text = s.email ?? '';
    _salonFacebookController.text = s.website ?? '';
    _salonInstagramController.text = s.instagram ?? '';
    _salonLat = s.latitude;
    _salonLon = s.longitude;
    _studioPhotos = List<String>.from(s.photos ?? <String>[]);
    _initialSnapshot = _buildSnapshot();
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    for (final controller in [
      _salonNameController,
      _salonDescriptionController,
      _salonAddressController,
      _salonPhoneController,
      _salonEmailController,
      _salonFacebookController,
      _salonInstagramController,
    ]) {
      controller.removeListener(_onFormChanged);
    }
    _salonNameController.dispose();
    _salonDescriptionController.dispose();
    _salonAddressController.dispose();
    _salonPhoneController.dispose();
    _salonEmailController.dispose();
    _salonFacebookController.dispose();
    _salonInstagramController.dispose();
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
      _salonFacebookController.text.trim(),
      _salonInstagramController.text.trim(),
      _salonLat?.toStringAsFixed(6) ?? '',
      _salonLon?.toStringAsFixed(6) ?? '',
      photos.join('|'),
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
        _hasUnsavedChanges;
  }

  Future<bool> _confirmDiscardChanges() async {
    if (!_hasUnsavedChanges) return true;
    final shouldLeave = await showDialog<bool>(
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
    return shouldLeave ?? false;
  }

  Future<void> _handleBackPressed() async {
    final shouldLeave = await _confirmDiscardChanges();
    if (!mounted || !shouldLeave) return;
    Navigator.of(context).pop();
  }

  Future<void> _openSalonAddressPicker() async {
    final selection = await AddressPickerModal.show(
      context,
      initialLocationName: _salonNameController.text.trim(),
      initialAddress: _salonAddressController.text.trim(),
      initialLat: _salonLat,
      initialLon: _salonLon,
    );
    if (selection == null || !mounted) return;
    setState(() {
      _salonNameController.text = selection.locationName;
      _salonAddressController.text = selection.address;
      _salonLat = selection.lat;
      _salonLon = selection.lon;
    });
  }

  Future<void> _saveSalon() async {
    if (!_hasUnsavedChanges) return;
    if (!(_salonFormKey.currentState?.validate() ?? false)) return;
    final name = _salonNameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Введите название салона')));
      return;
    }
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;
    final hadSalon = _salon != null;
    setState(() => _salonSaving = true);
    try {
      final payload = <String, dynamic>{
        'name': name,
        'description': _salonDescriptionController.text.trim(),
        'address': _salonAddressController.text.trim(),
        'phone': _salonPhoneController.text.trim(),
        'email': _salonEmailController.text.trim(),
        'website': _salonFacebookController.text.trim(),
        'instagram': _salonInstagramController.text.trim(),
        'photos': _studioPhotos,
      };
      if (_salonLat != null && _salonLon != null) {
        payload['latitude'] = _salonLat;
        payload['longitude'] = _salonLon;
      }
      Salon result;
      if (hadSalon) {
        if (_salon!.workingHours != null)
          payload['workingHours'] = _salon!.workingHours;
        if (_salon!.reminderSettings != null)
          payload['reminderSettings'] = _salon!.reminderSettings;
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

  Future<void> _pickStudioPhotos() async {
    if (_photosProcessing) return;
    final availableSlots = _maxStudioPhotos - _studioPhotos.length;
    if (availableSlots <= 0) {
      _showSnack('Можно загрузить максимум $_maxStudioPhotos фото');
      return;
    }

    final picker = ImagePicker();
    final picked = await picker.pickMultiImage();
    if (picked.isEmpty) return;

    var filesToProcess = picked;
    if (picked.length > availableSlots) {
      filesToProcess = picked.take(availableSlots).toList();
      _showSnack('Лишние фото пропущены. Лимит: $_maxStudioPhotos');
    }

    final userId =
        Supabase.instance.client.auth.currentUser?.id ??
        context.read<AuthService>().user?.id;
    if (userId == null) {
      _showSnack('Войдите в аккаунт, чтобы загрузить фото');
      return;
    }

    setState(() => _photosProcessing = true);
    setState(() => _photoProgressText = 'Оптимизация...');
    final uploadedUrls = <String>[];
    var oversizedCount = 0;
    var failedUploadsCount = 0;
    final uploadErrors = <String>{};
    for (final file in filesToProcess) {
      if (mounted) {
        setState(() => _photoProgressText = 'Загрузка...');
      }
      final upload = await OwnerPhotoStorageService.uploadStudioGalleryPhoto(
        file: file,
        userId: userId,
      );
      if (upload.url == null) {
        if (upload.error == 'Фото больше 3 MB') {
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
      _showSnack('$oversizedCount фото больше 3MB и не были добавлены');
    }
    if (failedUploadsCount > 0) {
      _showSnack('$failedUploadsCount фото не загрузились в storage');
      if (uploadErrors.isNotEmpty) {
        _showSnack(uploadErrors.first);
      }
    }
  }

  void _removePhotoAt(int index) {
    setState(() => _studioPhotos.removeAt(index));
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
  }) {
    return InputDecoration(
      hintText: hint,
      filled: true,
      fillColor: AppColors.backgroundPrimary,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.borderPrimary),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.primary500, width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      alignLabelWithHint: alignLabelWithHint,
    );
  }

  Widget _labeledField({required String label, required Widget child}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 6),
        child,
      ],
    );
  }

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
              leading: IconButton(
                onPressed: _handleBackPressed,
                style: IconButton.styleFrom(
                  backgroundColor: AppColors.neutral200,
                  shape: const CircleBorder(),
                ),
                icon: const Icon(
                  Icons.arrow_back,
                  color: AppColors.textPrimary,
                  size: 20,
                ),
              ),
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
                TextButton(
                  onPressed: _canSaveFromAppBar ? _saveSalon : null,
                  child: _salonSaving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.primary500,
                          ),
                        )
                      : Text(
                          locale.t('common.save'),
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: _canSaveFromAppBar
                                ? AppColors.primary500
                                : AppColors.textTertiary,
                          ),
                        ),
                ),
                const SizedBox(width: 4),
              ],
            ),
            body: GestureDetector(
              behavior: HitTestBehavior.translucent,
              onTap: () => FocusManager.instance.primaryFocus?.unfocus(),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(
                  kScreenPaddingHorizontal,
                  8,
                  kScreenPaddingHorizontal,
                  24,
                ),
                children: [
                  // Секции салона в одной форме
                  _salonLoading
                      ? _SectionCard(
                          title: locale.t('profileForm.mainInfo'),
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
                              _SectionCard(
                                title: locale.t('profileForm.mainInfo'),
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    _labeledField(
                                      label: locale.t('profileForm.salonName'),
                                      child: TextFormField(
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
                                    ),
                                    const SizedBox(height: 16),
                                    _labeledField(
                                      label: locale.t(
                                        'profileForm.description',
                                      ),
                                      child: TextFormField(
                                        controller: _salonDescriptionController,
                                        decoration: _inputDecoration(
                                          hint: locale.t(
                                            'profileForm.enterDescription',
                                          ),
                                          alignLabelWithHint: true,
                                        ),
                                        maxLines: 4,
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    _labeledField(
                                      label: locale.t('profileForm.address'),
                                      child: Material(
                                        color: AppColors.backgroundPrimary,
                                        borderRadius: BorderRadius.circular(12),
                                        clipBehavior: Clip.antiAlias,
                                        child: InkWell(
                                          onTap: _openSalonAddressPicker,
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                          child: Container(
                                            decoration: BoxDecoration(
                                              borderRadius:
                                                  BorderRadius.circular(12),
                                              border: Border.all(
                                                color: AppColors.borderPrimary,
                                              ),
                                            ),
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 12,
                                              vertical: 14,
                                            ),
                                            child: Row(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Padding(
                                                  padding:
                                                      const EdgeInsets.only(
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
                                                        CrossAxisAlignment
                                                            .start,
                                                    children: [
                                                      Text(
                                                        _salonNameController
                                                                .text
                                                                .trim()
                                                                .isNotEmpty
                                                            ? _salonNameController
                                                                  .text
                                                                  .trim()
                                                            : locale.t(
                                                                'addTraining.studioNameFallback',
                                                              ),
                                                        style: const TextStyle(
                                                          fontSize: 16,
                                                          fontWeight:
                                                              FontWeight.w700,
                                                          color: AppColors
                                                              .textPrimary,
                                                        ),
                                                      ),
                                                      if (_salonAddressController
                                                          .text
                                                          .trim()
                                                          .isNotEmpty) ...[
                                                        const SizedBox(
                                                          height: 4,
                                                        ),
                                                        Text(
                                                          _salonAddressController
                                                              .text
                                                              .trim(),
                                                          style: const TextStyle(
                                                            fontSize: 14,
                                                            height: 1.25,
                                                            fontWeight:
                                                                FontWeight.w400,
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
                                                            style: const TextStyle(
                                                              fontSize: 14,
                                                              color: AppColors
                                                                  .textTertiary,
                                                            ),
                                                          ),
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
                                                    color:
                                                        AppColors.textTertiary,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 24),
                              _SectionCard(
                                title: 'Фотографии студии',
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    Text(
                                      'До $_maxStudioPhotos фото, максимум 3MB на фото.',
                                      style: const TextStyle(
                                        color: AppColors.textSecondary,
                                        fontSize: 13,
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    Wrap(
                                      spacing: 10,
                                      runSpacing: 10,
                                      children: [
                                        ...List.generate(
                                          _studioPhotos.length,
                                          (index) => _StudioPhotoTile(
                                            photo: _studioPhotos[index],
                                            onRemove: () =>
                                                _removePhotoAt(index),
                                          ),
                                        ),
                                        if (_studioPhotos.length <
                                            _maxStudioPhotos)
                                          _AddStudioPhotoTile(
                                            loading: _photosProcessing,
                                            onTap: _pickStudioPhotos,
                                          ),
                                      ],
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
                                            style: const TextStyle(
                                              color: AppColors.textSecondary,
                                              fontSize: 13,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              const SizedBox(height: 24),
                              _SectionCard(
                                title: locale.t('profileForm.contactInfo'),
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    _labeledField(
                                      label: locale.t('profileForm.salonPhone'),
                                      child: TextFormField(
                                        controller: _salonPhoneController,
                                        decoration: _inputDecoration(
                                          hint: locale.t(
                                            'profileForm.enterPhone',
                                          ),
                                        ),
                                        keyboardType: TextInputType.phone,
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    _labeledField(
                                      label: locale.t('profileForm.salonEmail'),
                                      child: TextFormField(
                                        controller: _salonEmailController,
                                        decoration: _inputDecoration(
                                          hint: locale.t(
                                            'profileForm.enterEmail',
                                          ),
                                        ),
                                        keyboardType:
                                            TextInputType.emailAddress,
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    _labeledField(
                                      label: 'Facebook',
                                      child: TextFormField(
                                        controller: _salonFacebookController,
                                        decoration: _inputDecoration(
                                          hint: 'https://facebook.com/...',
                                        ),
                                        keyboardType: TextInputType.url,
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    _labeledField(
                                      label: locale.t('profileForm.instagram'),
                                      child: TextFormField(
                                        controller: _salonInstagramController,
                                        decoration: _inputDecoration(
                                          hint: '@username',
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
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

class _StudioPhotoTile extends StatelessWidget {
  const _StudioPhotoTile({required this.photo, required this.onRemove});

  final String photo;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    const tileSize = 96.0;
    return Stack(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: Container(
            width: tileSize,
            height: tileSize,
            color: AppColors.backgroundSecondary,
            child: Image.network(
              photo,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => const Icon(
                Icons.broken_image_outlined,
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ),
        Positioned(
          top: 4,
          right: 4,
          child: Material(
            color: Colors.black54,
            shape: const CircleBorder(),
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: onRemove,
              child: const Padding(
                padding: EdgeInsets.all(4),
                child: Icon(Icons.close, size: 14, color: Colors.white),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _AddStudioPhotoTile extends StatelessWidget {
  const _AddStudioPhotoTile({required this.loading, required this.onTap});

  final bool loading;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    const tileSize = 96.0;
    return InkWell(
      onTap: loading ? null : onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: tileSize,
        height: tileSize,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: AppColors.borderPrimary,
            style: BorderStyle.solid,
          ),
          color: AppColors.backgroundPrimary,
        ),
        child: Center(
          child: loading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.add_a_photo_outlined),
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderPrimary),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title.toUpperCase(),
              style: SettingsTypography.sectionTitle(context),
            ),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}
