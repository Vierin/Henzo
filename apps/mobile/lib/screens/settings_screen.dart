import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../models/salon.dart';
import '../../services/auth_service.dart';
import '../../services/cache/salon_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/show_api_error.dart';
import '../../widgets/address_picker_modal.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  static const int _maxStudioPhotos = 5;
  static const int _maxPhotoBytes = 3 * 1024 * 1024;
  static const String _studioPhotosBucket = 'studio-photos';

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
  double? _salonLat;
  double? _salonLon;
  List<String> _studioPhotos = <String>[];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadSalon();
    });
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
  }

  @override
  void dispose() {
    _salonNameController.dispose();
    _salonDescriptionController.dispose();
    _salonAddressController.dispose();
    _salonPhoneController.dispose();
    _salonEmailController.dispose();
    _salonFacebookController.dispose();
    _salonInstagramController.dispose();
    super.dispose();
  }

  Future<void> _saveSalon() async {
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

    setState(() => _photosProcessing = true);
    final uploadedUrls = <String>[];
    var oversizedCount = 0;
    var failedUploadsCount = 0;
    for (final file in filesToProcess) {
      final photoBytes = await _convertToWebpBytes(file);
      if (photoBytes == null) {
        oversizedCount++;
        continue;
      }
      final uploadedUrl = await _uploadPhotoToStorage(photoBytes);
      if (uploadedUrl == null) {
        failedUploadsCount++;
        continue;
      }
      uploadedUrls.add(uploadedUrl);
    }

    if (!mounted) return;
    setState(() {
      _studioPhotos = <String>[..._studioPhotos, ...uploadedUrls];
      _photosProcessing = false;
    });
    if (oversizedCount > 0) {
      _showSnack('$oversizedCount фото больше 3MB и не были добавлены');
    }
    if (failedUploadsCount > 0) {
      _showSnack('$failedUploadsCount фото не загрузились в storage');
    }
  }

  Future<Uint8List?> _convertToWebpBytes(XFile file) async {
    final bytesLength = await file.length();
    if (bytesLength > _maxPhotoBytes) {
      return null;
    }
    final original = await file.readAsBytes();
    final compressed = await FlutterImageCompress.compressWithList(
      original,
      minWidth: 1000,
      quality: 82,
      format: CompressFormat.webp,
      keepExif: false,
    );
    return Uint8List.fromList(compressed.isEmpty ? original : compressed);
  }

  Future<String?> _uploadPhotoToStorage(Uint8List bytes) async {
    try {
      final userId = context.read<AuthService>().user?.id ?? 'unknown';
      final fileName =
          'owners/$userId/${DateTime.now().millisecondsSinceEpoch}_${_randomSuffix()}.webp';
      await Supabase.instance.client.storage
          .from(_studioPhotosBucket)
          .uploadBinary(
            fileName,
            bytes,
            fileOptions: const FileOptions(
              cacheControl: '3600',
              upsert: false,
              contentType: 'image/webp',
            ),
          );
      return Supabase.instance.client.storage
          .from(_studioPhotosBucket)
          .getPublicUrl(fileName);
    } catch (_) {
      return null;
    }
  }

  String _randomSuffix() {
    final ms = DateTime.now().microsecondsSinceEpoch.toRadixString(36);
    return ms.substring(ms.length > 6 ? ms.length - 6 : 0);
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
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.borderPrimary),
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
        const pageBg = Color(0xFFF8F9FA);
        const maxContentWidth = 680.0;

        return Scaffold(
          backgroundColor: pageBg,
          appBar: AppBar(
            title: Text(locale.t('profileForm.settings')),
            backgroundColor: AppColors.backgroundPrimary,
            foregroundColor: AppColors.textPrimary,
            elevation: 0,
          ),
          body: GestureDetector(
            behavior: HitTestBehavior.translucent,
            onTap: () => FocusManager.instance.primaryFocus?.unfocus(),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: maxContentWidth),
                child: ListView(
                  padding: const EdgeInsets.all(12),
                  children: [
                    const SizedBox(height: 8),

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
                                        label: locale.t(
                                          'profileForm.salonName',
                                        ),
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
                                          controller:
                                              _salonDescriptionController,
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
                                        child: InkWell(
                                          onTap: () async {
                                            await AddressPickerModal.show(
                                              context,
                                              initialAddress:
                                                  _salonAddressController.text,
                                              initialLat: _salonLat,
                                              initialLon: _salonLon,
                                              onSelect: (address, lat, lon) {
                                                setState(() {
                                                  _salonAddressController.text =
                                                      address;
                                                  _salonLat = lat;
                                                  _salonLon = lon;
                                                });
                                              },
                                            );
                                          },
                                          borderRadius: BorderRadius.circular(
                                            10,
                                          ),
                                          child: InputDecorator(
                                            decoration:
                                                _inputDecoration(
                                                  hint: locale.t(
                                                    'profileForm.enterAddress',
                                                  ),
                                                ).copyWith(
                                                  suffixIcon: Icon(
                                                    Icons.location_on_outlined,
                                                    size: 20,
                                                    color:
                                                        AppColors.textSecondary,
                                                  ),
                                                ),
                                            child: Text(
                                              _salonAddressController
                                                      .text
                                                      .isEmpty
                                                  ? ''
                                                  : _salonAddressController
                                                        .text,
                                              style: TextStyle(
                                                fontSize: 16,
                                                color:
                                                    _salonAddressController
                                                        .text
                                                        .isEmpty
                                                    ? AppColors.textSecondary
                                                    : AppColors.textPrimary,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(height: 20),
                                      SizedBox(
                                        height: 44,
                                        child: FilledButton(
                                          onPressed: _salonSaving
                                              ? null
                                              : _saveSalon,
                                          style: FilledButton.styleFrom(
                                            backgroundColor:
                                                AppColors.primary500,
                                          ),
                                          child: _salonSaving
                                              ? const SizedBox(
                                                  height: 22,
                                                  width: 22,
                                                  child:
                                                      CircularProgressIndicator(
                                                        strokeWidth: 2,
                                                        color: Colors.white,
                                                      ),
                                                )
                                              : Text(
                                                  _salon == null
                                                      ? locale.t(
                                                          'profileForm.addSalon',
                                                        )
                                                      : locale.t('common.save'),
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
                                        'До $_maxStudioPhotos фото, максимум 3MB на фото. Автоконвертация: WebP, ширина до 1000px.',
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
                                        label: locale.t(
                                          'profileForm.salonPhone',
                                        ),
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
                                        label: locale.t(
                                          'profileForm.salonEmail',
                                        ),
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
                                        label: locale.t(
                                          'profileForm.instagram',
                                        ),
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
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderPrimary),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0D000000),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 16),
            child,
          ],
        ),
      ),
    );
  }
}
