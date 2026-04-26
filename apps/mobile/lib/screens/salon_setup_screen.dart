import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/colors.dart';
import '../services/auth_service.dart';
import '../services/cache/salon_cache.dart';
import '../services/dashboard_api_service.dart';
import '../utils/show_api_error.dart';
import '../widgets/address_picker_modal.dart';

class SalonSetupScreen extends StatefulWidget {
  const SalonSetupScreen({super.key, required this.onSaved});

  final VoidCallback onSaved;

  @override
  State<SalonSetupScreen> createState() => _SalonSetupScreenState();
}

class _SalonSetupScreenState extends State<SalonSetupScreen> {
  final _nameController = TextEditingController();
  final _addressController = TextEditingController();
  double? _addressLat;
  double? _addressLon;
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(
          content: Text('Введите название студии/школы'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(
          const SnackBar(
            content: Text('Нужно войти в аккаунт'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    }
    setState(() => _isLoading = true);
    try {
      final payload = <String, dynamic>{
        'name': name,
        if (_addressController.text.trim().isNotEmpty)
          'address': _addressController.text.trim(),
        if (_addressLat != null) 'latitude': _addressLat,
        if (_addressLon != null) 'longitude': _addressLon,
      };
      await DashboardApiService.createCurrentSalon(token, payload);
      if (!mounted) return;
      context.read<SalonCache>().invalidate();
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(
          content: Text('Бизнес-аккаунт настроен'),
          backgroundColor: Colors.green,
        ),
      );
      widget.onSaved();
    } catch (e) {
      if (!mounted) return;
      showApiError(context, e);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        title: const Text(
          'Настройка бизнес-аккаунта',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        backgroundColor: AppColors.backgroundPrimary,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Название студии/школы *',
                border: OutlineInputBorder(),
                hintText: 'Например: Fit Studio или Dance School',
              ),
              textCapitalization: TextCapitalization.words,
              enabled: !_isLoading,
            ),
            const SizedBox(height: 16),
            InkWell(
              onTap: _isLoading
                  ? null
                  : () async {
                      await AddressPickerModal.show(
                        context,
                        initialAddress: _addressController.text,
                        initialLat: _addressLat,
                        initialLon: _addressLon,
                        onSelect: (address, lat, lon) {
                          setState(() {
                            _addressController.text = address;
                            _addressLat = lat;
                            _addressLon = lon;
                          });
                        },
                      );
                    },
              borderRadius: BorderRadius.circular(4),
              child: InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'Адрес',
                  border: OutlineInputBorder(),
                  hintText: 'Адрес студии/школы',
                  suffixIcon: Icon(Icons.location_on_outlined),
                ),
                child: Text(
                  _addressController.text.isEmpty ? '' : _addressController.text,
                  style: TextStyle(
                    fontSize: 16,
                    color: _addressController.text.isEmpty
                        ? AppColors.textSecondary
                        : AppColors.textPrimary,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _isLoading ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary500,
                foregroundColor: AppColors.textInverse,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text(
                      'Сохранить настройки',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
