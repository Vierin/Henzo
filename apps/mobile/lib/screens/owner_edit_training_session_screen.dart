import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../models/staff_member.dart';
import '../services/auth_service.dart';
import '../services/cache/salon_cache.dart';
import '../services/cache/owner_sessions_cache.dart';
import '../services/dashboard_api_service.dart';
import '../services/staff_api_service.dart';
import '../utils/show_api_error.dart';

/// Редактирование одного слота групповой тренировки (время, тренер, отмена).
/// Не меняет карточку услуги — для этого вкладка «Услуги».
class OwnerEditTrainingSessionScreen extends StatefulWidget {
  const OwnerEditTrainingSessionScreen({super.key});

  @override
  State<OwnerEditTrainingSessionScreen> createState() =>
      _OwnerEditTrainingSessionScreenState();
}

class _OwnerEditTrainingSessionScreenState
    extends State<OwnerEditTrainingSessionScreen> {
  OwnerTrainingSession? _initial;
  late DateTime _startsAt;
  String? _trainerId;
  List<StaffMember> _trainers = [];
  bool _loadingTrainers = true;
  bool _loadingSubscription = true;
  bool _isProPlan = false;
  bool _saving = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initial != null) return;
    final raw = ModalRoute.of(context)?.settings.arguments;
    if (raw is Map) {
      try {
        _initial = OwnerTrainingSession.fromRouteArgs(
          Map<String, dynamic>.from(raw),
        );
        _startsAt = _initial!.startsAt.toLocal();
        _trainerId = _initial!.trainerId;
      } catch (_) {
        _initial = null;
      }
    }
    if (_initial != null) {
      _loadTrainers();
    }
  }

  Future<void> _loadTrainers() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) {
        setState(() {
          _loadingTrainers = false;
          _loadingSubscription = false;
        });
      }
      return;
    }
    try {
      final salon = await context.read<SalonCache>().getSalon(token);
      if (salon == null || !mounted) {
        setState(() {
          _loadingTrainers = false;
          _loadingSubscription = false;
        });
        return;
      }
      final list = await StaffApiService.getBySalon(token, salon.id);
      final sub = await DashboardApiService.getCurrentSubscription(token);
      String? selectedTrainerId = _trainerId;
      if (selectedTrainerId == null) {
        final currentName = _initial?.trainerName.trim() ?? '';
        if (currentName.isNotEmpty && currentName != '—' && currentName != '-') {
          final matched = list.where(
            (t) => t.name.trim().toLowerCase() == currentName.toLowerCase(),
          );
          if (matched.isNotEmpty) {
            selectedTrainerId = matched.first.id;
          }
        }
      }
      if (!mounted) return;
      setState(() {
        _trainers = list;
        _trainerId = selectedTrainerId;
        _loadingTrainers = false;
        _loadingSubscription = false;
        _isProPlan = (sub?.type.toUpperCase() ?? 'FREEMIUM') == 'PRO';
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _loadingTrainers = false;
          _loadingSubscription = false;
        });
      }
    }
  }

  Future<void> _pickStart() async {
    final initial = _startsAt;
    final d = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(initial.year - 1),
      lastDate: DateTime(initial.year + 2),
    );
    if (d == null || !mounted) return;
    final t = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
    );
    if (t == null || !mounted) return;
    setState(() {
      _startsAt = DateTime(d.year, d.month, d.day, t.hour, t.minute);
    });
  }

  Future<void> _showTrainerPlanInfo() async {
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Тренер'),
        content: const Text(
          'На плане Free поле тренера доступно только для чтения.\n\n'
          'Изменять тренера и добавлять новых тренеров можно на плане Pro.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Понятно'),
          ),
        ],
      ),
    );
  }

  bool _sameStartLocal(OwnerTrainingSession session) {
    final a = session.startsAt.toLocal();
    final b = _startsAt;
    return a.year == b.year &&
        a.month == b.month &&
        a.day == b.day &&
        a.hour == b.hour &&
        a.minute == b.minute;
  }

  Future<void> _save() async {
    final session = _initial;
    if (session == null) return;
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;

    final body = <String, dynamic>{};
    if (!_sameStartLocal(session)) {
      body['startsAt'] = _startsAt.toUtc().toIso8601String();
    }
    final trainerBefore = session.trainerId;
    final trainerAfter = _trainerId;
    if (_isProPlan && trainerBefore != trainerAfter) {
      body['trainerId'] = trainerAfter;
    }

    if (body.isEmpty) {
      if (mounted) Navigator.of(context).pop(false);
      return;
    }

    setState(() => _saving = true);
    try {
      await DashboardApiService.patchOwnerTrainingSession(
        token,
        session.sessionId,
        body,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Сохранено')),
      );
      context.read<OwnerSessionsCache>().invalidate();
      Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) showApiError(context, e);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _cancelSession() async {
    final session = _initial;
    if (session == null) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Отменить занятие?'),
        content: const Text(
          'Слот будет помечен как отменённый. Клиенты увидят отмену в расписании.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Нет'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Отменить'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;

    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;

    setState(() => _saving = true);
    try {
      await DashboardApiService.patchOwnerTrainingSession(
        token,
        session.sessionId,
        {'status': 'CANCELLED'},
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Занятие отменено')),
      );
      context.read<OwnerSessionsCache>().invalidate();
      Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) showApiError(context, e);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = _initial;
    if (session == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Занятие')),
        body: const Center(child: Text('Нет данных')),
      );
    }

    final completed = session.status.toUpperCase() == 'COMPLETED';
    final trainerReadOnly = completed || !_isProPlan;

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        title: Text(
          session.trainingName,
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (completed)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Text(
                'Занятие уже завершено — время и тренер не меняются.',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
              ),
            ),
          Text(
            'Время и тренер относятся только к этому дню. '
            'Чтобы поменять название или цену услуги, откройте «Услуги».',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
          ),
          const SizedBox(height: 20),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text(
              'Дата и время',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
            subtitle: Text(
              '${MaterialLocalizations.of(context).formatFullDate(_startsAt)} · ${TimeOfDay.fromDateTime(_startsAt).format(context)}',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            trailing: const Icon(Icons.schedule),
            onTap: completed ? null : _pickStart,
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                'Тренер',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(width: 6),
              InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: _showTrainerPlanInfo,
                child: const Padding(
                  padding: EdgeInsets.all(2),
                  child: Icon(
                    Icons.info_outline,
                    size: 16,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (_loadingTrainers || _loadingSubscription)
            const Padding(
              padding: EdgeInsets.all(12),
              child: Center(child: CircularProgressIndicator()),
            )
          else
            Builder(
              builder: (context) {
                final orphanId = _trainerId;
                final hasOrphan = orphanId != null &&
                    !_trainers.any((t) => t.id == orphanId);
                final items = <DropdownMenuItem<String?>>[
                  const DropdownMenuItem<String?>(
                    value: null,
                    child: Text('Без тренера'),
                  ),
                  if (hasOrphan)
                    DropdownMenuItem<String?>(
                      value: orphanId,
                      child: Text(session.trainerName),
                    ),
                  ..._trainers.map(
                    (t) => DropdownMenuItem<String?>(
                      value: t.id,
                      child: Text(t.name),
                    ),
                  ),
                ];
                return InputDecorator(
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: AppColors.backgroundPrimary,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide:
                          const BorderSide(color: AppColors.borderPrimary),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 4,
                    ),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String?>(
                      isExpanded: true,
                      value: _trainerId,
                      items: items,
                      onChanged: trainerReadOnly
                          ? null
                          : (v) => setState(() => _trainerId = v),
                    ),
                  ),
                );
              },
            ),
          if (!_isProPlan && !completed)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'На Free изменение тренера недоступно.',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                ),
              ),
            ),
          const SizedBox(height: 28),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton(
              onPressed: (_saving || completed) ? null : _save,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary500,
              ),
              child: _saving
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Сохранить'),
            ),
          ),
          if (!completed &&
              session.status.toUpperCase() != 'CANCELLED') ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton(
                onPressed: _saving ? null : _cancelSession,
                child: const Text('Отменить занятие'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
