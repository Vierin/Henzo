import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../constants/colors.dart';
import '../../config/app_config.dart';
import '../../models/salon.dart';
import '../../services/auth_service.dart';
import '../../services/cache/salon_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/show_api_error.dart';

class OnlineBookingScreen extends StatefulWidget {
  const OnlineBookingScreen({super.key});

  @override
  State<OnlineBookingScreen> createState() => _OnlineBookingScreenState();
}

class _OnlineBookingScreenState extends State<OnlineBookingScreen> {
  static const int _defaultBookingPeriodDays = 14;
  static const int _minBookingPeriodDays = 1;
  static const int _maxBookingPeriodDays = 60;

  Salon? _salon;
  bool _loading = true;
  bool _saving = false;
  int _bookingPeriodDays = _defaultBookingPeriodDays;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadSalon());
  }

  Future<void> _loadSalon() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    try {
      final salon = await context.read<SalonCache>().getSalon(token);
      if (!mounted) return;
      final periodFromSettings = _extractBookingPeriodDays(salon);
      setState(() {
        _salon = salon;
        _bookingPeriodDays = periodFromSettings ?? _defaultBookingPeriodDays;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      showApiError(context, e);
    }
  }

  int? _extractBookingPeriodDays(Salon? salon) {
    final settings = salon?.reminderSettings;
    if (settings == null) return null;
    final raw = settings['bookingPeriodDays'];
    if (raw is int) return raw;
    if (raw is num) return raw.toInt();
    if (raw is String) return int.tryParse(raw);
    return null;
  }

  /// Persists booking period days. Returns `true` on success (for closing the modal).
  Future<bool> _saveBookingPeriodDays(int days) async {
    final token = context.read<AuthService>().accessToken;
    final salon = _salon;
    if (token == null || token.isEmpty || salon == null) return false;
    setState(() => _saving = true);
    try {
      final reminderSettings = <String, dynamic>{
        ...?salon.reminderSettings,
        'bookingPeriodDays': days,
      };
      final payload = <String, dynamic>{
        'name': salon.name ?? '',
        if (salon.description != null) 'description': salon.description,
        if (salon.address != null) 'address': salon.address,
        if (salon.phone != null) 'phone': salon.phone,
        if (salon.email != null) 'email': salon.email,
        if (salon.website != null) 'website': salon.website,
        if (salon.instagram != null) 'instagram': salon.instagram,
        if (salon.photos != null) 'photos': salon.photos,
        if (salon.workingHours != null) 'workingHours': salon.workingHours,
        if (salon.latitude != null) 'latitude': salon.latitude,
        if (salon.longitude != null) 'longitude': salon.longitude,
        if (salon.autoConfirmBookings != null)
          'autoConfirmBookings': salon.autoConfirmBookings,
        'reminderSettings': reminderSettings,
      };
      final updatedSalon = await DashboardApiService.updateCurrentSalon(
        token,
        payload,
      );
      if (!mounted) return false;
      context.read<SalonCache>().invalidate();
      setState(() {
        _salon = updatedSalon;
        _bookingPeriodDays = days;
        _saving = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Настройки онлайн бронирования сохранены'),
        ),
      );
      return true;
    } catch (e) {
      if (!mounted) return false;
      setState(() => _saving = false);
      showApiError(context, e);
      return false;
    }
  }

  String get _bookingUrl {
    final salon = _salon;
    if (salon == null) return AppConfig.webUrl;
    final slug = salon.slug ?? salon.id;
    return '${AppConfig.webUrl}/studio/$slug';
  }

  Future<void> _openBookingLink() async {
    final uri = Uri.parse(_bookingUrl);
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Не удалось открыть ссылку')),
      );
    }
  }

  Future<void> _openBookingPeriodModal() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        int localDays = _bookingPeriodDays;
        final controller = TextEditingController(text: localDays.toString());
        var applying = false;

        return StatefulBuilder(
          builder: (context, setModalState) {
            void applyDays(int value) {
              final clamped = value.clamp(
                _minBookingPeriodDays,
                _maxBookingPeriodDays,
              );
              localDays = clamped;
              controller.value = TextEditingValue(
                text: clamped.toString(),
                selection: TextSelection.collapsed(
                  offset: clamped.toString().length,
                ),
              );
              setModalState(() {});
            }

            Future<void> onApply() async {
              if (applying) return;
              setModalState(() => applying = true);
              final ok = await _saveBookingPeriodDays(localDays);
              if (!mounted) return;
              setModalState(() => applying = false);
              if (ok && sheetContext.mounted) Navigator.of(sheetContext).pop();
            }

            return SafeArea(
              top: false,
              child: Container(
                margin: const EdgeInsets.only(top: 24),
                decoration: const BoxDecoration(
                  color: AppColors.backgroundPrimary,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
                child: Padding(
                  padding: EdgeInsets.fromLTRB(
                    16,
                    16,
                    16,
                    16 + MediaQuery.of(context).viewInsets.bottom,
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Booking period',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Выберите период от 1 до 60 дней',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Container(
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: AppColors.borderPrimary,
                                width: 1.5,
                              ),
                            ),
                            child: IconButton.filled(
                              onPressed: applying
                                  ? null
                                  : () => applyDays(localDays - 1),
                              icon: const Icon(Icons.remove),
                              style: IconButton.styleFrom(
                                backgroundColor: AppColors.backgroundSecondary,
                                foregroundColor: AppColors.textPrimary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextField(
                              controller: controller,
                              keyboardType: TextInputType.number,
                              textAlign: TextAlign.center,
                              enabled: !applying,
                              decoration: InputDecoration(
                                labelText: 'Дней',
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              onChanged: (value) {
                                final parsed = int.tryParse(value.trim());
                                if (parsed != null) applyDays(parsed);
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          IconButton.filled(
                            onPressed: applying
                                ? null
                                : () => applyDays(localDays + 1),
                            icon: const Icon(Icons.add),
                            style: IconButton.styleFrom(
                              backgroundColor: AppColors.primary500,
                              foregroundColor: Colors.white,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Expanded(
                            child: SizedBox(
                              height: 46,
                              child: OutlinedButton(
                                onPressed: applying
                                    ? null
                                    : () => Navigator.of(sheetContext).pop(),
                                child: const Text('Отменить'),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: SizedBox(
                              height: 46,
                              child: FilledButton(
                                onPressed: applying ? null : onApply,
                                style: FilledButton.styleFrom(
                                  backgroundColor: AppColors.primary500,
                                ),
                                child: applying
                                    ? const SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : const Text('Применить'),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        title: const Text('Онлайн бронирование'),
        backgroundColor: AppColors.backgroundPrimary,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(12),
              children: [
                _SectionCard(
                  title: '',
                  hideTitle: true,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: _saving ? null : _openBookingPeriodModal,
                    child: Ink(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.backgroundSecondary,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.borderPrimary),
                      ),
                      child: Row(
                        children: [
                          const Expanded(
                            child: Text(
                              'Период бронирования',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                '$_bookingPeriodDays',
                                style: const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                  height: 1.05,
                                ),
                              ),
                              const Text(
                                'дней',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 10),
                          const Icon(
                            Icons.chevron_right,
                            size: 20,
                            color: AppColors.textSecondary,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                _SectionCard(
                  title: '',
                  hideTitle: true,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: _openBookingLink,
                    child: Ink(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.backgroundSecondary,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.borderPrimary),
                      ),
                      child: const Row(
                        children: [
                          Text(
                            'Booking link',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          Spacer(),
                          SizedBox(width: 8),
                          Icon(
                            Icons.open_in_new,
                            size: 20,
                            color: AppColors.primary500,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.child,
    this.hideTitle = false,
  });

  final String title;
  final Widget child;
  final bool hideTitle;

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
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!hideTitle) ...[
              Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
            ],
            child,
          ],
        ),
      ),
    );
  }
}
