import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
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
  double? _salonLat;
  double? _salonLon;

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
          body: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(
                      maxWidth: maxContentWidth,
                    ),
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
                                  child: Center(
                                    child: CircularProgressIndicator(),
                                  ),
                                ),
                              )
                            : Form(
                                key: _salonFormKey,
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
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
                                                  (v == null ||
                                                      v.trim().isEmpty)
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
                                            label: locale.t(
                                              'profileForm.address',
                                            ),
                                            child: InkWell(
                                              onTap: () async {
                                                await AddressPickerModal.show(
                                                  context,
                                                  initialAddress:
                                                      _salonAddressController
                                                          .text,
                                                  initialLat: _salonLat,
                                                  initialLon: _salonLon,
                                                  onSelect: (address, lat, lon) {
                                                    setState(() {
                                                      _salonAddressController
                                                              .text =
                                                          address;
                                                      _salonLat = lat;
                                                      _salonLon = lon;
                                                    });
                                                  },
                                                );
                                              },
                                              borderRadius:
                                                  BorderRadius.circular(10),
                                              child: InputDecorator(
                                                decoration:
                                                    _inputDecoration(
                                                      hint: locale.t(
                                                        'profileForm.enterAddress',
                                                      ),
                                                    ).copyWith(
                                                      suffixIcon: Icon(
                                                        Icons
                                                            .location_on_outlined,
                                                        size: 20,
                                                        color: AppColors
                                                            .textSecondary,
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
                                                        ? AppColors
                                                              .textSecondary
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
                                                          : locale.t(
                                                              'common.save',
                                                            ),
                                                    ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(height: 24),
                                    _SectionCard(
                                      title: locale.t(
                                        'profileForm.contactInfo',
                                      ),
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
                                              controller:
                                                  _salonFacebookController,
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
                                              controller:
                                                  _salonInstagramController,
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

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.child,
  });

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
