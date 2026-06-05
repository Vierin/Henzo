import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../models/studio.dart';
import '../../models/training_location_item.dart';
import '../../services/auth_service.dart';
import '../../services/trainer_api_service.dart';
import '../../utils/formatters.dart';
import '../../utils/load_error_message.dart';
import '../../utils/owner_session_card_subtitle.dart';

class TrainerSessionEnrollmentsScreen extends StatefulWidget {
  const TrainerSessionEnrollmentsScreen({super.key, required this.session});

  final Map<String, dynamic> session;

  @override
  State<TrainerSessionEnrollmentsScreen> createState() =>
      TrainerSessionEnrollmentsScreenState();
}

class TrainerSessionEnrollmentsScreenState
    extends State<TrainerSessionEnrollmentsScreen> {
  List<Map<String, dynamic>> _enrollments = [];
  bool _loading = true;
  String? _loadError;
  String? _attendanceError;
  Studio? _studio;

  bool get _isSessionCompleted =>
      (widget.session['status'] ?? 'ACTIVE').toString() == 'COMPLETED';

  List<Map<String, dynamic>> get _activeEnrollments => _enrollments
      .where((e) => (e['status'] ?? 'ACTIVE').toString() != 'CANCELLED')
      .toList();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _loadStudio() async {
    final studioId = context.read<AuthService>().trainerInfo?.studioId;
    if (studioId == null || studioId.isEmpty) return;
    final studio = await TrainerApiService.fetchStudioForLocations(studioId);
    if (!mounted) return;
    setState(() => _studio = studio);
  }

  Future<void> _load() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      await _loadStudio();
      final sessionId = widget.session['id'] as String;
      final list =
          await TrainerApiService.getSessionEnrollments(token, sessionId);
      if (!mounted) return;
      setState(() {
        _enrollments = list;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadError = loadErrorMessage(context.read<LocaleProvider>(), e);
        _loading = false;
      });
    }
  }

  Future<void> _toggleAttendance(Map<String, dynamic> enrollment) async {
    if (_isSessionCompleted) return;
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;
    final id = enrollment['enrollmentId'] as String;
    final currentStatus = enrollment['status'] as String;
    final newPresent = currentStatus == 'NO_SHOW';
    setState(() => _attendanceError = null);
    try {
      await TrainerApiService.markAttendance(token, id, present: newPresent);
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _attendanceError = loadErrorMessage(context.read<LocaleProvider>(), e);
      });
    }
  }

  String? _locationLabel(LocaleProvider locale) {
    final studio = _studio;
    if (studio == null) return null;
    final locations = TrainingLocationItem.listFromStudio(
      studio,
      mainStudioName: locale.t('locations.mainStudio'),
    );
    final session = TrainerApiService.ownerSessionFromTrainerMap(
      widget.session,
      trainerName: '',
    );
    return resolveOwnerSessionCardSubtitle(
      session: session,
      studioLocations: locations,
    ).label;
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final training = widget.session['Training'] is Map
        ? Map<String, dynamic>.from(widget.session['Training'] as Map)
        : <String, dynamic>{};
    final title = (training['name'] ?? 'Class').toString();
    final startsAt = parseApiDateTime(widget.session['startsAt'] as String?);
    final timeLabel = startsAt != null ? formatTime24(startsAt) : '';
    final booked = (widget.session['bookedCount'] as num?)?.toInt() ?? 0;
    final capacity = (widget.session['capacity'] as num?)?.toInt() ?? 0;
    final capacityLabel = capacity > 0 ? '$booked / $capacity' : '$booked';
    final locationLabel = _locationLabel(locale);

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundSecondary,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 16.sp,
                fontWeight: FontWeight.w700,
              ),
            ),
            if (timeLabel.isNotEmpty)
              Text(
                timeLabel,
                style: TextStyle(
                  fontSize: 12.sp,
                  color: AppColors.textSecondary,
                ),
              ),
            if (locationLabel != null && locationLabel.isNotEmpty)
              Text(
                locationLabel,
                style: TextStyle(
                  fontSize: 12.sp,
                  color: AppColors.textSecondary,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              color: AppColors.primary500,
              child: _buildBody(
                locale: locale,
                capacityLabel: capacityLabel,
              ),
            ),
    );
  }

  Widget _buildBody({
    required LocaleProvider locale,
    required String capacityLabel,
  }) {
    final t = locale.t;
    final active = _activeEnrollments;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.all(kScreenPaddingHorizontal),
      children: [
        if (_isSessionCompleted)
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.backgroundPrimary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              t('trainer.sessionCompleted'),
              style: TextStyle(
                fontSize: 13.sp,
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        Row(
          children: [
            Text(
              t('trainer.enrolledCount').replaceAll('{count}', capacityLabel),
              style: TextStyle(
                fontSize: 14.sp,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ],
        ),
        if (_loadError != null) ...[
          const SizedBox(height: 12),
          SelectableText.rich(
            TextSpan(
              text: _loadError!,
              style: TextStyle(
                color: AppColors.error500,
                fontSize: 13.sp,
              ),
            ),
          ),
        ],
        if (_attendanceError != null) ...[
          const SizedBox(height: 12),
          SelectableText.rich(
            TextSpan(
              text: _attendanceError!,
              style: TextStyle(
                color: AppColors.error500,
                fontSize: 13.sp,
              ),
            ),
          ),
        ],
        const SizedBox(height: 12),
        if (active.isEmpty && _loadError == null)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 32),
            child: Center(
              child: Text(
                t('trainer.noClientsEnrolled'),
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 14.sp,
                ),
              ),
            ),
          )
        else
          ...active.map((e) => _EnrollmentTile(
                enrollment: e,
                readOnly: _isSessionCompleted,
                onToggle: () => _toggleAttendance(e),
              )),
        const SizedBox(height: 16),
      ],
    );
  }
}

class _EnrollmentTile extends StatefulWidget {
  const _EnrollmentTile({
    required this.enrollment,
    required this.readOnly,
    required this.onToggle,
  });

  final Map<String, dynamic> enrollment;
  final bool readOnly;
  final VoidCallback onToggle;

  @override
  State<_EnrollmentTile> createState() => _EnrollmentTileState();
}

class _EnrollmentTileState extends State<_EnrollmentTile> {
  bool _avatarFailed = false;

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LocaleProvider>().t;
    final user = widget.enrollment['user'] is Map
        ? Map<String, dynamic>.from(widget.enrollment['user'] as Map)
        : <String, dynamic>{};
    final name = (user['name'] ?? user['email'] ?? 'Client').toString();
    final avatarUrl = user['avatarUrl']?.toString();
    final status = (widget.enrollment['status'] ?? 'ACTIVE').toString();
    final isNoShow = status == 'NO_SHOW';
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
    final hasAvatar =
        !_avatarFailed && avatarUrl != null && avatarUrl.isNotEmpty;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: AppColors.primary100,
          backgroundImage: hasAvatar ? NetworkImage(avatarUrl) : null,
          onBackgroundImageError: (error, stackTrace) {
            if (mounted) setState(() => _avatarFailed = true);
          },
          child: hasAvatar
              ? null
              : Text(
                  initial,
                  style: const TextStyle(
                    color: AppColors.primary700,
                    fontWeight: FontWeight.w700,
                  ),
                ),
        ),
        title: Text(
          name,
          style: TextStyle(
            fontSize: 14.sp,
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: isNoShow
            ? Text(
                t('trainer.noShowStatus'),
                style: TextStyle(
                  fontSize: 12.sp,
                  color: AppColors.error500,
                ),
              )
            : null,
        trailing: widget.readOnly
            ? null
            : IconButton(
                icon: Icon(
                  isNoShow
                      ? Icons.check_circle_outline
                      : Icons.cancel_outlined,
                  color: isNoShow
                      ? AppColors.success500
                      : AppColors.error400,
                ),
                tooltip: isNoShow
                    ? t('trainer.markPresent')
                    : t('trainer.markNoShow'),
                onPressed: widget.onToggle,
              ),
      ),
    );
  }
}
