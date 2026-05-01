import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../utils/currency_format.dart';
import '../../models/booking.dart';
import '../../services/auth_service.dart';
import '../../services/cache/bookings_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/client_identity.dart';
import '../../utils/show_api_error.dart';
import '../../widgets/dashboard/booking_detail_modal.dart';

class ClientDetailScreen extends StatefulWidget {
  final String clientKey;
  final String name;
  final String? userId;
  final String? email;
  final String? phone;
  final bool initialBlocked;

  const ClientDetailScreen({
    super.key,
    required this.clientKey,
    required this.name,
    this.userId,
    this.email,
    this.phone,
    this.initialBlocked = false,
  });

  @override
  State<ClientDetailScreen> createState() => _ClientDetailScreenState();
}

class _ClientDetailScreenState extends State<ClientDetailScreen> {
  List<Booking> _bookings = [];
  bool _loading = true;
  bool _blocked = false;
  bool _blockUpdating = false;

  @override
  void initState() {
    super.initState();
    _blocked = widget.initialBlocked;
    _loadData();
  }

  Future<void> _loadData() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    setState(() => _loading = true);
    try {
      final primaryBookings = await context.read<BookingsCache>().getBookings(
        token,
      );
      final enrollmentBookings =
          await DashboardApiService.getOwnerEnrollmentBookings(token);
      final all = <Booking>[...primaryBookings, ...enrollmentBookings];
      final list =
          all.where((b) => clientIdentityKey(b) == widget.clientKey).toList()
            ..sort((a, b) => b.dateTime.compareTo(a.dateTime));
      if (mounted) {
        setState(() {
          _bookings = list;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        showApiError(context, e);
      }
    }
  }

  DateTime? get _firstVisit => _bookings.isEmpty
      ? null
      : _bookings
            .map((b) => b.dateTime)
            .reduce((a, b) => a.isBefore(b) ? a : b);
  DateTime? get _lastVisit => _bookings.isEmpty
      ? null
      : _bookings.map((b) => b.dateTime).reduce((a, b) => a.isAfter(b) ? a : b);
  double get _income => _bookings
      .where((b) => b.status != BookingStatus.canceled)
      .fold(0.0, (s, b) => s + (b.service?.price ?? 0));
  int get _rejectedVisits => _bookings
      .where(
        (b) =>
            b.status == BookingStatus.canceled ||
            b.status == BookingStatus.noShow,
      )
      .length;
  int get _totalVisits => _bookings.length;

  Future<void> _handleCancelBooking(String id) async {
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;
    await DashboardApiService.cancelBooking(token, id);
    if (mounted) {
      context.read<BookingsCache>().invalidate();
      _loadData();
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(
          content: Text('Запись отменена'),
          backgroundColor: Colors.orange,
        ),
      );
    }
  }

  Future<void> _handleConfirmBooking(String id) async {
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;
    await DashboardApiService.confirmBooking(token, id);
    if (mounted) {
      context.read<BookingsCache>().invalidate();
      _loadData();
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(
          content: Text('Подтверждено'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  Future<void> _handleRejectBooking(String id) async {
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;
    await DashboardApiService.rejectBooking(token, id);
    if (mounted) {
      context.read<BookingsCache>().invalidate();
      _loadData();
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(
          content: Text('Отклонено'),
          backgroundColor: Colors.orange,
        ),
      );
    }
  }

  String? _clean(String? value, {bool lowercase = false}) {
    if (value == null) return null;
    final trimmed = value.trim();
    if (trimmed.isEmpty) return null;
    return lowercase ? trimmed.toLowerCase() : trimmed;
  }

  ({String? userId, String? email, String? phone}) _resolveClientIdentity() {
    final userId =
        _clean(widget.userId) ??
        _bookings
            .map((b) => _clean(b.user?.id))
            .whereType<String>()
            .firstWhere((v) => v.isNotEmpty, orElse: () => '');
    final email =
        _clean(widget.email, lowercase: true) ??
        _bookings
            .map((b) => _clean(b.user?.email, lowercase: true))
            .whereType<String>()
            .firstWhere((v) => v.isNotEmpty, orElse: () => '');
    final phone =
        _clean(widget.phone) ??
        _bookings
            .map((b) => _clean(b.user?.phone))
            .whereType<String>()
            .firstWhere((v) => v.isNotEmpty, orElse: () => '');
    return (
      userId: userId.isEmpty ? null : userId,
      email: email.isEmpty ? null : email,
      phone: phone.isEmpty ? null : phone,
    );
  }

  bool _isBlockedByAnyIdentity(
    List<OwnerClientBlock> blocklist, {
    String? userId,
    String? email,
    String? phone,
  }) {
    return blocklist.any((b) {
      final blockUserId = _clean(b.userId);
      final blockEmail = _clean(b.email, lowercase: true);
      final blockPhone = _clean(b.phone);
      return (userId != null && blockUserId == userId) ||
          (email != null && blockEmail == email) ||
          (phone != null && blockPhone == phone);
    });
  }

  Future<void> _toggleBlocked() async {
    if (_blockUpdating) return;
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;
    final identity = _resolveClientIdentity();
    final userId = identity.userId;
    final email = identity.email;
    final phone = identity.phone;
    if (userId == null && email == null && phone == null) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(
          content: Text('Нужно минимум email/phone/userId для блокировки'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _blockUpdating = true);
    try {
      if (_blocked) {
        await DashboardApiService.unblockOwnerClient(
          token,
          userId: userId,
          email: email,
          phone: phone,
        );
      } else {
        await DashboardApiService.blockOwnerClient(
          token,
          userId: userId,
          email: email,
          phone: phone,
        );
      }

      final blocklist = await DashboardApiService.getOwnerClientBlocklist(
        token,
      );
      final nowBlocked = _isBlockedByAnyIdentity(
        blocklist,
        userId: userId,
        email: email,
        phone: phone,
      );

      if (!mounted) return;
      setState(() => _blocked = nowBlocked);
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(
          content: Text(
            nowBlocked ? 'Клиент заблокирован' : 'Клиент разблокирован',
          ),
          backgroundColor: Colors.orange,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      showApiError(context, e);
    } finally {
      if (mounted) {
        setState(() => _blockUpdating = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          widget.name,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
          textAlign: TextAlign.center,
        ),
        centerTitle: true,
        backgroundColor: AppColors.backgroundPrimary,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined, color: AppColors.textPrimary),
            onPressed: () {
              ScaffoldMessenger.maybeOf(context)?.showSnackBar(
                const SnackBar(
                  content: Text('Редактирование клиента — в разработке'),
                ),
              );
            },
          ),
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary500),
            )
          : RefreshIndicator(
              onRefresh: _loadData,
              color: AppColors.primary500,
              child: ListView.builder(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(12),
                itemCount: _bookings.length + 1,
                itemBuilder: (context, index) {
                  if (index == 0) {
                    final resolvedPhone =
                        _clean(widget.phone) ??
                        _bookings
                            .map((b) => _clean(b.user?.phone))
                            .whereType<String>()
                            .firstWhere((v) => v.isNotEmpty, orElse: () => '');
                    final resolvedEmail =
                        _clean(widget.email, lowercase: true) ??
                        _bookings
                            .map((b) => _clean(b.user?.email, lowercase: true))
                            .whereType<String>()
                            .firstWhere((v) => v.isNotEmpty, orElse: () => '');
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (resolvedPhone.isNotEmpty ||
                            resolvedEmail.isNotEmpty) ...[
                          const Text(
                            'Контактные данные',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.textTertiary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          if (resolvedPhone.isNotEmpty)
                            Text(
                              resolvedPhone,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          if (resolvedEmail.isNotEmpty) ...[
                            if (resolvedPhone.isNotEmpty)
                              const SizedBox(height: 2),
                            Text(
                              resolvedEmail,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                          const SizedBox(height: 20),
                        ],
                        if (_firstVisit != null) ...[
                          const Text(
                            'Дата первого визита',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.textTertiary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            DateFormat('dd.MM.yyyy').format(_firstVisit!),
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 20),
                        ],
                        Row(
                          children: [
                            Expanded(
                              child: _MiniCard(
                                title: 'Последний визит',
                                value: _lastVisit != null
                                    ? DateFormat('dd.MM.yy').format(_lastVisit!)
                                    : '—',
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _MiniCard(
                                title: 'Income from client',
                                value: formatVnd(_income),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: _MiniCard(
                                title: 'Rejected Visits',
                                value: '$_rejectedVisits',
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _MiniCard(
                                title: 'Total visits',
                                value: '$_totalVisits',
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            if (widget.phone != null &&
                                widget.phone!.isNotEmpty)
                              IconButton(
                                onPressed: () =>
                                    _showPhone(context, widget.phone!),
                                icon: const Icon(
                                  Icons.phone_outlined,
                                  size: 28,
                                ),
                                color: AppColors.primary500,
                                tooltip: widget.phone,
                              ),
                            const SizedBox(width: 8),
                            IconButton(
                              onPressed: _blockUpdating ? null : _toggleBlocked,
                              icon: Icon(
                                _blocked ? Icons.block : Icons.block_outlined,
                                size: 28,
                                color: _blocked
                                    ? AppColors.error500
                                    : AppColors.textSecondary,
                              ),
                              tooltip: 'Заблокировать клиента',
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'Резервации',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 12),
                        if (_bookings.isEmpty) ...[
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 24),
                            child: Center(
                              child: Text(
                                context.watch<LocaleProvider>().t(
                                  'booking.noBookings',
                                ),
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ],
                    );
                  }
                  final booking = _bookings[index - 1];
                  return _BookingCard(
                    booking: booking,
                    onTap: () => BookingDetailModal.show(
                      context,
                      booking: booking,
                      onCancel: _handleCancelBooking,
                      onConfirm: _handleConfirmBooking,
                      onReject: _handleRejectBooking,
                    ),
                  );
                },
              ),
            ),
    );
  }

  void _showPhone(BuildContext context, String phone) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Телефон',
              style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 8),
            SelectableText(
              phone,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}

class _MiniCard extends StatelessWidget {
  final String title;
  final String value;

  const _MiniCard({required this.title, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderPrimary),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 11, color: AppColors.textTertiary),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

class _BookingCard extends StatelessWidget {
  final Booking booking;
  final VoidCallback onTap;

  const _BookingCard({required this.booking, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final price = booking.service?.price;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: AppColors.backgroundPrimary,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      DateFormat('dd.MM.yyyy, HH:mm').format(booking.dateTime),
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      booking.service?.name ?? '—',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                price != null ? formatVnd(price) : '—',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
