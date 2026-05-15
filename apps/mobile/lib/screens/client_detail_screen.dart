import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../models/booking.dart';
import '../../services/auth_service.dart';
import '../../services/cache/bookings_cache.dart';
import '../../services/cache/salon_cache.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/client_identity.dart';
import '../../utils/show_api_error.dart';
import '../../widgets/dashboard/booking_detail_modal.dart';
import 'main_shell.dart';

/// Shared soft shadow for profile + visit cards on this screen.
const List<BoxShadow> _kClientDetailCardShadow = <BoxShadow>[
  BoxShadow(color: Color(0x14000000), blurRadius: 20, offset: Offset(0, 8)),
];

class ClientDetailScreen extends StatefulWidget {
  const ClientDetailScreen({
    super.key,
    required this.clientKey,
    required this.name,
    this.userId,
    this.email,
    this.phone,
    this.initialBlocked = false,
  });

  final String clientKey;
  final String name;
  final String? userId;
  final String? email;
  final String? phone;
  final bool initialBlocked;

  @override
  State<ClientDetailScreen> createState() => _ClientDetailScreenState();
}

class _ClientDetailScreenState extends State<ClientDetailScreen> {
  static const int _kVisitBatch = 10;

  List<Booking> _bookings = [];
  bool _loading = true;
  bool _blocked = false;
  bool _blockUpdating = false;
  int _visibleVisitCount = _kVisitBatch;

  final ScrollController _scrollController = ScrollController();

  /// Matches studio client profile mock (warm off-white, not pure white).
  static const Color _kClientPageBg = Color(0xFFFDF8F5);

  static const List<Color> _visitAccentPalette = <Color>[
    Color(0xFFEAB308),
    Color(0xFFEC4899),
    Color(0xFF22C55E),
    Color(0xFF3B82F6),
    Color(0xFFF15942),
    Color(0xFF8B5CF6),
  ];

  @override
  void initState() {
    super.initState();
    _blocked = widget.initialBlocked;
    _scrollController.addListener(_onVisitsScroll);
    _loadData();
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onVisitsScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onVisitsScroll() {
    if (!_scrollController.hasClients) return;
    if (_visibleVisitCount >= _bookings.length) return;
    final pos = _scrollController.position;
    if (pos.maxScrollExtent - pos.pixels > 180) return;
    setState(() {
      final next = _visibleVisitCount + _kVisitBatch;
      _visibleVisitCount = next > _bookings.length ? _bookings.length : next;
    });
  }

  /// If the first batch does not overflow, reveal more until the list scrolls
  /// or everything is shown (tall viewport / few pixels per card).
  void _scheduleFillVisitsIfShortScroll() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_scrollController.hasClients) return;
      if (_visibleVisitCount >= _bookings.length) return;
      final pos = _scrollController.position;
      if (pos.maxScrollExtent > 48) return;
      setState(() {
        final next = _visibleVisitCount + _kVisitBatch;
        _visibleVisitCount = next > _bookings.length ? _bookings.length : next;
      });
      _scheduleFillVisitsIfShortScroll();
    });
  }

  Future<void> _loadData() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    final salonCache = context.read<SalonCache>();
    final bookingsCache = context.read<BookingsCache>();
    setState(() => _loading = true);
    try {
      try {
        await salonCache.getSalon(token);
      } catch (_) {
        /* studio line still works without name */
      }
      final primaryBookings = await bookingsCache.getBookings(token);
      final enrollmentBookings =
          await DashboardApiService.getOwnerEnrollmentBookings(token);
      final all = <Booking>[...primaryBookings, ...enrollmentBookings];
      final list =
          all.where((b) => clientIdentityKey(b) == widget.clientKey).toList()
            ..sort((a, b) => b.dateTime.compareTo(a.dateTime));
      if (mounted) {
        setState(() {
          _bookings = list;
          _visibleVisitCount = list.length <= _kVisitBatch
              ? list.length
              : _kVisitBatch;
          _loading = false;
        });
        if (list.isNotEmpty) {
          _scheduleFillVisitsIfShortScroll();
        }
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

  int get _noShowVisits =>
      _bookings.where((b) => b.status == BookingStatus.noShow).length;

  int get _totalVisits => _bookings.length;

  List<Booking> get _visibleBookings =>
      _bookings.take(_visibleVisitCount).toList();

  Future<void> _handleCancelBooking(String id) async {
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;
    await DashboardApiService.cancelBooking(token, id);
    if (mounted) {
      context.read<BookingsCache>().invalidate();
      _loadData();
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(
          content: Text(context.read<LocaleProvider>().t('booking.cancelled')),
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
        SnackBar(
          content: Text(context.read<LocaleProvider>().t('booking.confirmed')),
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
        SnackBar(
          content: Text(context.read<LocaleProvider>().t('booking.rejected')),
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
    final tr = context.read<LocaleProvider>().t;
    final identity = _resolveClientIdentity();
    final userId = identity.userId;
    final email = identity.email;
    final phone = identity.phone;
    if (userId == null && email == null && phone == null) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(
          content: Text(tr('ownerClient.blockNeedsIdentity')),
          backgroundColor: AppColors.error500,
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
            nowBlocked
                ? tr('ownerClient.blockedToast')
                : tr('ownerClient.unblockedToast'),
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

  String _initials(String name) {
    final parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((e) => e.isNotEmpty)
        .take(2)
        .toList();
    if (parts.isEmpty) return '?';
    return parts.map((p) => p[0].toUpperCase()).join();
  }

  Color _visitAccent(Booking b) {
    final key = b.service?.name ?? b.id;
    var h = 0;
    for (var i = 0; i < key.length; i++) {
      h = 31 * h + key.codeUnitAt(i);
    }
    return _visitAccentPalette[h.abs() % _visitAccentPalette.length];
  }

  String _ownerTrainerFallback(AuthService auth) {
    final u = auth.user;
    if (u == null) return '';
    final n = u.name?.trim();
    if (n != null && n.isNotEmpty) return n;
    return u.email.trim();
  }

  Future<void> _openTel(String raw) async {
    final compact = raw.replaceAll(RegExp(r'[\s\-\(\)]'), '');
    if (compact.isEmpty) return;
    final uri = Uri.parse('tel:$compact');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _openMail(String raw) async {
    final uri = Uri(scheme: 'mailto', path: raw);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _openBookTraining() {
    final shell = context.findAncestorStateOfType<MainShellState>();
    if (shell != null) {
      shell.navigateToTab0Route('/trainings/new');
      return;
    }
    Navigator.of(context).pushNamed('/trainings/new');
  }

  @override
  Widget build(BuildContext context) {
    final tr = context.watch<LocaleProvider>().t;
    final localeCode = context.watch<LocaleProvider>().localeCode;
    final auth = context.watch<AuthService>();
    final salonName = context.watch<SalonCache>().salon?.name?.trim() ?? '';
    final identity = _resolveClientIdentity();
    final resolvedPhone = identity.phone ?? '';
    final resolvedEmail = identity.email ?? '';
    final hasPhone = resolvedPhone.isNotEmpty;
    final hasEmail = resolvedEmail.isNotEmpty;
    final ownerName = _ownerTrainerFallback(auth);

    return Scaffold(
      backgroundColor: _kClientPageBg,
      appBar: AppBar(
        leadingWidth: 52,
        leading: Padding(
          padding: const EdgeInsets.only(left: 8),
          child: Center(
            child: Material(
              color: AppColors.backgroundPrimary,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: () => Navigator.of(context).pop(),
                child: const SizedBox(
                  width: 40,
                  height: 40,
                  child: Icon(
                    Icons.arrow_back_ios_new,
                    size: 18,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ),
          ),
        ),
        title: Text(
          tr('booking.client'),
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
        backgroundColor: _kClientPageBg,
        foregroundColor: AppColors.textPrimary,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        elevation: 0,
        shadowColor: Colors.transparent,
        actions: [
          Padding(
            padding: const EdgeInsets.fromLTRB(0, 8, 8, 8),
            child: Center(
              child: _blocked
                  ? OutlinedButton.icon(
                      onPressed: _blockUpdating ? null : _toggleBlocked,
                      icon: const Icon(Icons.lock_open_outlined, size: 16),
                      label: Text(tr('ownerClient.unblock')),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary500,
                        side: const BorderSide(color: AppColors.primary500),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(999),
                        ),
                        visualDensity: VisualDensity.compact,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 10,
                        ),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        textStyle: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    )
                  : FilledButton.icon(
                      onPressed: _blockUpdating ? null : _toggleBlocked,
                      icon: const Icon(Icons.block, size: 16),
                      label: Text(tr('ownerClient.block')),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primary500,
                        foregroundColor: AppColors.textInverse,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(999),
                        ),
                        visualDensity: VisualDensity.compact,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 14,
                        ),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        textStyle: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
            ),
          ),
        ],
      ),
      body: _loading
          ? const ColoredBox(
              color: _kClientPageBg,
              child: Center(
                child: CircularProgressIndicator(color: AppColors.primary500),
              ),
            )
          : RefreshIndicator(
              onRefresh: _loadData,
              color: AppColors.primary500,
              child: ListView(
                controller: _scrollController,
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(
                  kScreenPaddingHorizontal,
                  4,
                  kScreenPaddingHorizontal,
                  24,
                ),
                children: [
                  _ClientProfileHeader(
                    name: widget.name,
                    initials: _initials(widget.name),
                    memberSinceLabel: _firstVisit != null
                        ? tr('ownerClient.memberSince').replaceAll(
                            '{monthYear}',
                            DateFormat(
                              'MMMM yyyy',
                              localeCode,
                            ).format(_firstVisit!.toLocal()),
                          )
                        : tr('ownerClient.noVisitsYet'),
                    totalVisits: _totalVisits,
                    noShowVisits: _noShowVisits,
                    totalVisitsLabel: tr('ownerClient.totalVisitsStat'),
                    noShowLabel: tr('ownerClient.noShowStat'),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Expanded(
                        child: _ClientActionTile(
                          iconTopPadding: 4,
                          icon: SvgPicture.asset(
                            'assets/icons/icon-phone.svg',
                            width: 15,
                            height: 15,
                            colorFilter: ColorFilter.mode(
                              hasPhone
                                  ? AppColors.textSecondary
                                  : AppColors.textTertiary,
                              BlendMode.srcIn,
                            ),
                          ),
                          label: tr('ownerClient.actionCall'),
                          filled: false,
                          enabled: hasPhone,
                          onTap: hasPhone
                              ? () => _openTel(resolvedPhone)
                              : null,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _ClientActionTile(
                          iconTopPadding: 4,
                          icon: SvgPicture.asset(
                            'assets/icons/icon-mail.svg',
                            width: 15,
                            height: 15,
                            colorFilter: ColorFilter.mode(
                              hasEmail
                                  ? AppColors.textSecondary
                                  : AppColors.textTertiary,
                              BlendMode.srcIn,
                            ),
                          ),
                          label: tr('ownerClient.actionEmail'),
                          filled: false,
                          enabled: hasEmail,
                          onTap: hasEmail
                              ? () => _openMail(resolvedEmail)
                              : null,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _ClientActionTile(
                          icon: const Icon(
                            Icons.add,
                            size: 24,
                            color: AppColors.textInverse,
                          ),
                          label: tr('booking.book'),
                          filled: true,
                          enabled: true,
                          onTap: _openBookTraining,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Text(
                    tr('ownerClient.visitsSection'),
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.8,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 10),
                  if (_bookings.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 28),
                      child: Center(
                        child: Text(
                          tr('booking.noBookings'),
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    )
                  else
                    ..._visibleBookings.map(
                      (b) => _ClientVisitCard(
                        booking: b,
                        accent: _visitAccent(b),
                        salonName: salonName,
                        trainerLabel: _trainerLine(b, ownerName, tr),
                        durationLabel: _durationLabel(b, tr),
                        onTap: () => BookingDetailModal.show(
                          context,
                          booking: b,
                          onCancel: _handleCancelBooking,
                          onConfirm: _handleConfirmBooking,
                          onReject: _handleRejectBooking,
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }

  String _trainerLine(Booking b, String ownerName, String Function(String) tr) {
    final raw = (b.staff?.name ?? '').trim();
    if (raw.isNotEmpty && raw != '—') return raw;
    if (ownerName.isNotEmpty) return ownerName;
    return tr('ownerClient.trainerYou');
  }

  String _durationLabel(Booking b, String Function(String) tr) {
    final dur = b.service?.duration;
    if (dur == null) return '—';
    return tr('ownerClient.visitMinutes').replaceAll('{n}', '$dur');
  }
}

class _ClientProfileHeader extends StatelessWidget {
  const _ClientProfileHeader({
    required this.name,
    required this.initials,
    required this.memberSinceLabel,
    required this.totalVisits,
    required this.noShowVisits,
    required this.totalVisitsLabel,
    required this.noShowLabel,
  });

  final String name;
  final String initials;
  final String memberSinceLabel;
  final int totalVisits;
  final int noShowVisits;
  final String totalVisitsLabel;
  final String noShowLabel;

  static const double _avatarSize = 100;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 20),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: AppColors.backgroundPrimary,
              borderRadius: BorderRadius.circular(20),
              boxShadow: _kClientDetailCardShadow,
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(left: _avatarSize + 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.3,
                            height: 1.2,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          memberSinceLabel,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            _InlineStat(
                              label: totalVisitsLabel,
                              value: totalVisits,
                            ),
                            const SizedBox(width: 16),
                            _InlineStat(
                              label: noShowLabel,
                              value: noShowVisits,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        Positioned(
          left: 16,
          top: 0,
          child: Container(
            width: _avatarSize,
            height: _avatarSize,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: const <BoxShadow>[
                BoxShadow(
                  color: Color(0x1A000000),
                  blurRadius: 12,
                  offset: Offset(0, 4),
                ),
              ],
            ),
            child: CircleAvatar(
              backgroundColor: AppColors.primary100,
              child: Text(
                initials,
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary500,
                  height: 1,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _InlineStat extends StatelessWidget {
  const _InlineStat({required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return Text.rich(
      TextSpan(
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: AppColors.textPrimary,
          height: 1.3,
        ),
        children: [
          TextSpan(text: label),
          const TextSpan(
            text: ' · ',
            style: TextStyle(
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
            ),
          ),
          TextSpan(
            text: '$value',
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

class _ClientActionTile extends StatelessWidget {
  const _ClientActionTile({
    required this.icon,
    required this.label,
    required this.filled,
    required this.enabled,
    required this.onTap,
    this.iconTopPadding = 0,
  });

  static const double _tileHeight = 70;

  final Widget icon;
  final String label;
  final bool filled;
  final bool enabled;
  final VoidCallback? onTap;
  final double iconTopPadding;

  @override
  Widget build(BuildContext context) {
    final effectiveTap = enabled ? onTap : null;
    return SizedBox(
      height: _tileHeight,
      child: Material(
        color: filled ? AppColors.primary500 : AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: effectiveTap,
          borderRadius: BorderRadius.circular(12),
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: filled
                  ? null
                  : Border.all(color: AppColors.borderPrimary),
            ),
            child: Opacity(
              opacity: enabled ? 1 : 0.45,
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 6,
                  vertical: 10,
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Padding(
                      padding: EdgeInsets.only(top: iconTopPadding),
                      child: IconTheme.merge(
                        data: IconThemeData(
                          color: filled
                              ? AppColors.textInverse
                              : AppColors.textSecondary,
                        ),
                        child: icon,
                      ),
                    ),
                    Text(
                      label,
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: filled
                            ? AppColors.textInverse
                            : AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ClientVisitCard extends StatelessWidget {
  const _ClientVisitCard({
    required this.booking,
    required this.accent,
    required this.salonName,
    required this.trainerLabel,
    required this.durationLabel,
    required this.onTap,
  });

  final Booking booking;
  final Color accent;
  final String salonName;
  final String trainerLabel;
  final String durationLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context);
    final matLoc = MaterialLocalizations.of(context);
    final localDt = booking.dateTime.toLocal();
    final startLabel = matLoc.formatTimeOfDay(
      TimeOfDay.fromDateTime(localDt),
      alwaysUse24HourFormat: true,
    );
    final dateLabel = DateFormat('dd.MM.yy', locale.toString()).format(localDt);
    final title = booking.service?.name ?? '—';
    final pinLine = salonName.isNotEmpty
        ? '$salonName • $trainerLabel'
        : trainerLabel;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(14),
        clipBehavior: Clip.hardEdge,
        child: InkWell(
          onTap: onTap,
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(width: 4, decoration: BoxDecoration(color: accent)),
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 14, 0, 14),
                  child: SizedBox(
                    width: 56,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        Text(
                          startLabel,
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w600,
                            height: 1,
                            letterSpacing: -0.3,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        Text(
                          durationLabel,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFFA4A4A4),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Container(width: 1, color: accent),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 14, 12, 14),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            height: 1,
                            letterSpacing: -0.3,
                            color: AppColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(Icons.place_outlined, size: 13, color: accent),
                            const SizedBox(width: 3),
                            Flexible(
                              child: Text(
                                pinLine,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w400,
                                  color: AppColors.textSecondary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(0, 14, 14, 14),
                  child: Center(
                    child: Text(
                      dateLabel,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
