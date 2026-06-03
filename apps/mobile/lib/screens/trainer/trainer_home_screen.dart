import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../services/auth_service.dart';
import '../../services/trainer_api_service.dart';
import 'package:intl/intl.dart';

import '../../utils/formatters.dart';
import 'trainer_session_card.dart';

class TrainerHomeScreen extends StatefulWidget {
  const TrainerHomeScreen({super.key});

  @override
  State<TrainerHomeScreen> createState() => _TrainerHomeScreenState();
}

class _TrainerHomeScreenState extends State<TrainerHomeScreen> {
  List<Map<String, dynamic>> _todaySessions = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final now = DateTime.now();
      final from = DateTime(now.year, now.month, now.day);
      final to = DateTime(now.year, now.month, now.day, 23, 59, 59);
      final result = await TrainerApiService.getSessions(token, from: from, to: to);
      final sessions = (result['sessions'] as List?)
              ?.whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList() ??
          [];
      if (!mounted) return;
      setState(() {
        _todaySessions = sessions;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final trainer = context.watch<AuthService>().trainerInfo;
    final now = DateTime.now();
    final dateLabel = DateFormat('EEEE, d MMMM').format(now).toUpperCase();

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          color: AppColors.primary500,
          child: ListView(
            padding: EdgeInsets.fromLTRB(
              kScreenPaddingHorizontal,
              16,
              kScreenPaddingHorizontal,
              24,
            ),
            children: [
              // Header
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          trainer?.name ?? locale.t('settings.owner.ownerRole'),
                          style: TextStyle(
                            fontSize: 22.sp,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                            letterSpacing: -0.4,
                          ),
                        ),
                        Text(
                          trainer?.studioName ?? '',
                          style: TextStyle(
                            fontSize: 13.sp,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Today label
              Text(
                dateLabel,
                style: TextStyle(
                  fontSize: 13.sp,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                  letterSpacing: 0.4,
                ),
              ),
              const SizedBox(height: 10),

              if (_loading)
                const Center(child: Padding(
                  padding: EdgeInsets.all(40),
                  child: CircularProgressIndicator(),
                ))
              else if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 20),
                  child: Text(_error!, style: const TextStyle(color: AppColors.error500)),
                )
              else if (_todaySessions.isEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 40),
                  child: Center(
                    child: Text(
                      locale.t('dashboard.noClassesToday'),
                      style: TextStyle(
                        fontSize: 14.sp,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                )
              else
                for (final session in _todaySessions)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: TrainerSessionCard(
                      session: session,
                      onTap: () => _openEnrollments(context, session),
                    ),
                  ),
            ],
          ),
        ),
      ),
    );
  }

  void _openEnrollments(BuildContext context, Map<String, dynamic> session) {
    Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => TrainerSessionEnrollmentsScreen(session: session),
    ));
  }
}

// ── Enrollments detail screen ─────────────────────────────────

class TrainerSessionEnrollmentsScreen extends StatefulWidget {
  const TrainerSessionEnrollmentsScreen({super.key, required this.session});
  final Map<String, dynamic> session;

  @override
  State<TrainerSessionEnrollmentsScreen> createState() =>
      TrainerSessionEnrollmentsScreenState();
}

class TrainerSessionEnrollmentsScreenState extends State<TrainerSessionEnrollmentsScreen> {
  List<Map<String, dynamic>> _enrollments = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;
    setState(() => _loading = true);
    try {
      final sessionId = widget.session['id'] as String;
      final list = await TrainerApiService.getSessionEnrollments(token, sessionId);
      if (!mounted) return;
      setState(() {
        _enrollments = list;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleAttendance(Map<String, dynamic> enrollment) async {
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;
    final id = enrollment['enrollmentId'] as String;
    final currentStatus = enrollment['status'] as String;
    final newPresent = currentStatus == 'NO_SHOW';
    try {
      await TrainerApiService.markAttendance(token, id, present: newPresent);
      await _load();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final training = widget.session['Training'] is Map
        ? Map<String, dynamic>.from(widget.session['Training'] as Map)
        : <String, dynamic>{};
    final title = (training['name'] ?? 'Class').toString();
    final startsAt = parseApiDateTime(widget.session['startsAt'] as String?);
    final timeLabel = startsAt != null ? formatTime24(startsAt) : '';

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundSecondary,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.w700)),
            if (timeLabel.isNotEmpty)
              Text(timeLabel, style: TextStyle(fontSize: 12.sp, color: AppColors.textSecondary)),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _enrollments.isEmpty
          ? Center(
              child: Text(
                context.watch<LocaleProvider>().t('trainer.noClientsEnrolled'),
                style: TextStyle(color: AppColors.textSecondary, fontSize: 14.sp),
              ),
            )
          : Builder(builder: (context) {
              final t = context.watch<LocaleProvider>().t;
              return ListView.builder(
                padding: EdgeInsets.all(kScreenPaddingHorizontal),
                itemCount: _enrollments.length,
                itemBuilder: (_, i) {
                  final e = _enrollments[i];
                  final user = e['user'] is Map
                      ? Map<String, dynamic>.from(e['user'] as Map)
                      : <String, dynamic>{};
                  final name = (user['name'] ?? user['email'] ?? 'Client').toString();
                  final status = (e['status'] ?? 'ACTIVE').toString();
                  final isNoShow = status == 'NO_SHOW';
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: AppColors.primary100,
                        child: Text(
                          name.isNotEmpty ? name[0].toUpperCase() : '?',
                          style: const TextStyle(color: AppColors.primary700, fontWeight: FontWeight.w700),
                        ),
                      ),
                      title: Text(name, style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w600)),
                      subtitle: isNoShow
                          ? Text(t('trainer.noShowStatus'), style: TextStyle(fontSize: 12.sp, color: AppColors.error500))
                          : null,
                      trailing: IconButton(
                        icon: Icon(
                          isNoShow ? Icons.check_circle_outline : Icons.cancel_outlined,
                          color: isNoShow ? AppColors.success500 : AppColors.error400,
                        ),
                        tooltip: isNoShow ? t('trainer.markPresent') : t('trainer.markNoShow'),
                        onPressed: () => _toggleAttendance(e),
                      ),
                    ),
                  );
                },
              );
            }),
    );
  }
}
