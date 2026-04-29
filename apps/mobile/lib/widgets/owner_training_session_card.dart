import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../services/dashboard_api_service.dart';



/// Owner-facing card: start clock time + duration in minutes, title/trainer, occupancy + "booked".

class OwnerTrainingSessionCard extends StatelessWidget {

  const OwnerTrainingSessionCard({

    super.key,

    required this.session,

    this.statusBadge,

    this.margin = const EdgeInsets.only(bottom: 12),

    this.onTap,

    /// When API returns no trainer (owner-led session), show this instead of "—".

    this.trainerFallbackName,

  });



  final OwnerTrainingSession session;

  final Widget? statusBadge;

  final EdgeInsetsGeometry margin;

  final VoidCallback? onTap;



  /// Owner name/email when trainer is unset in backend.

  final String? trainerFallbackName;



  /// Duration as configured (whole minutes).

  static int durationMinutes(OwnerTrainingSession session) {

    final d = session.endsAt.difference(session.startsAt);

    return d.inMinutes.clamp(0, 24 * 60);

  }



  static String durationMinutesLabel(OwnerTrainingSession session) {

    final m = durationMinutes(session);

    return '$m min';

  }



  /// Effective trainer label when session has no Trainer row (owner teaches).

  static String displayTrainer(

    OwnerTrainingSession session,

    String? fallbackName,

  ) {

    final raw = session.trainerName.trim();

    if (raw.isNotEmpty && raw != '—' && raw != '-') {

      return session.trainerName;

    }

    final f = fallbackName?.trim();

    if (f != null && f.isNotEmpty) return f;

    return '—';

  }



  static Future<void> showDetailsModal(

    BuildContext context,

    OwnerTrainingSession session, {

    Widget? statusBadge,

    String? trainerFallbackName,

    /// Редактировать только этот слот (время, тренер, отмена).
    VoidCallback? onEditSession,

    /// Редактировать шаблон услуги (имя, цена, длительность) — влияет на все будущие слоты.
    VoidCallback? onEditService,

  }) {

    final startsLocal = session.startsAt.toLocal();

    final dateFmt = DateFormat('dd.MM.yyyy');

    final timeFmt = DateFormat('HH:mm');

    final minutes = durationMinutes(session);

    final trainerLabel =

        displayTrainer(session, trainerFallbackName);



    return showModalBottomSheet<void>(

      context: context,

      isScrollControlled: true,

      backgroundColor: Colors.transparent,

      builder: (ctx) {
        final badge = statusBadge;
        final tr = context.read<LocaleProvider>().t;

        return SafeArea(

          child: Padding(

            padding: EdgeInsets.only(

              left: 16,

              right: 16,

              bottom: 16 + MediaQuery.of(ctx).viewInsets.bottom,

              top: 8,

            ),

            child: Container(

              decoration: BoxDecoration(

                color: AppColors.backgroundPrimary,

                borderRadius: BorderRadius.circular(16),

                border: Border.all(color: AppColors.borderPrimary),

                boxShadow: const [

                  BoxShadow(

                    color: Color(0x14000000),

                    blurRadius: 16,

                    offset: Offset(0, 6),

                  ),

                ],

              ),

              padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),

              child: SingleChildScrollView(

                child: Column(

                  crossAxisAlignment: CrossAxisAlignment.start,

                  mainAxisSize: MainAxisSize.min,

                  children: [

                    Row(

                      crossAxisAlignment: CrossAxisAlignment.start,

                      children: [

                        Expanded(

                          child: Text(

                            session.trainingName,

                            style: const TextStyle(

                              fontSize: 18,

                              fontWeight: FontWeight.w800,

                              color: AppColors.textPrimary,

                              height: 1.25,

                            ),

                          ),

                        ),

                        if (badge != null) ...[

                          const SizedBox(width: 10),

                          badge,

                        ],

                      ],

                    ),

                    const SizedBox(height: 16),

                    _detailRow(

                      'Начало',

                      '${dateFmt.format(startsLocal)} · ${timeFmt.format(startsLocal)}',

                    ),

                    _detailRow('Длительность', '$minutes min'),

                    _detailRow('Тренер', trainerLabel),

                    _detailRow(

                      'Заполненность',

                      '${session.enrolledCount} / ${session.capacity}',

                    ),

                    const SizedBox(height: 8),

                    if (onEditSession != null ||
                        onEditService != null) ...[
                      if (onEditSession != null)
                        SizedBox(
                          width: double.infinity,
                          height: 46,
                          child: OutlinedButton(
                            onPressed: () {
                              Navigator.of(ctx).pop();
                              onEditSession();
                            },
                            child: Text(
                              tr('ownerSession.editCurrentSession'),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                      if (onEditSession != null &&
                          onEditService != null)
                        const SizedBox(height: 8),
                      if (onEditService != null)
                        SizedBox(
                          width: double.infinity,
                          child: TextButton(
                            onPressed: () {
                              Navigator.of(ctx).pop();
                              onEditService();
                            },
                            child: Text(
                              tr('ownerSession.editAllTrainings'),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: FilledButton(
                          onPressed: () => Navigator.of(ctx).pop(),
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.primary500,
                          ),
                          child: const Text('Закрыть'),
                        ),
                      ),
                    ] else
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: FilledButton(
                          onPressed: () => Navigator.of(ctx).pop(),
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.primary500,
                          ),
                          child: const Text('Закрыть'),
                        ),
                      ),

                  ],

                ),

              ),

            ),

          ),

        );

      },

    );

  }



  static Widget _detailRow(String label, String value) {

    return Padding(

      padding: const EdgeInsets.only(bottom: 10),

      child: Row(

        crossAxisAlignment: CrossAxisAlignment.start,

        children: [

          SizedBox(

            width: 118,

            child: Text(

              label,

              style: TextStyle(

                fontSize: 13,

                fontWeight: FontWeight.w600,

                color: AppColors.textSecondary,

              ),

            ),

          ),

          Expanded(

            child: Text(

              value,

              style: const TextStyle(

                fontSize: 14,

                fontWeight: FontWeight.w600,

                color: AppColors.textPrimary,

              ),

            ),

          ),

        ],

      ),

    );

  }



  @override

  Widget build(BuildContext context) {

    final badge = statusBadge;

    final trainerLabel =

        displayTrainer(session, trainerFallbackName);

    final startLabel = TimeOfDay.fromDateTime(

      session.startsAt.toLocal(),

    ).format(context);

    final durationLabel = durationMinutesLabel(session);

    final enrolled = session.enrolledCount;

    final cap = session.capacity;

    final fillLabel = cap > 0 ? '$enrolled/$cap' : '$enrolled';



    final inner = IntrinsicHeight(

      child: Row(

        crossAxisAlignment: CrossAxisAlignment.stretch,

        children: [

          Container(

            width: 4,

            decoration: const BoxDecoration(

              color: AppColors.primary500,

            ),

          ),

          Expanded(

            child: Padding(

              padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),

              child: Row(

                crossAxisAlignment: CrossAxisAlignment.start,

                children: [

                  SizedBox(

                    width: 76,

                    child: Column(

                      crossAxisAlignment: CrossAxisAlignment.start,

                      children: [

                        Text(

                          startLabel,

                          style: const TextStyle(

                            fontSize: 18,

                            fontWeight: FontWeight.w800,

                            letterSpacing: -0.3,

                            color: AppColors.textPrimary,

                            height: 1.1,

                          ),

                        ),

                        const SizedBox(height: 4),

                        Text(

                          durationLabel,

                          style: TextStyle(

                            fontSize: 12,

                            fontWeight: FontWeight.w500,

                            color: AppColors.textSecondary,

                          ),

                        ),

                      ],

                    ),

                  ),

                  const SizedBox(width: 10),

                  Expanded(

                    child: Column(

                      crossAxisAlignment: CrossAxisAlignment.start,

                      children: [

                        Row(

                          crossAxisAlignment: CrossAxisAlignment.start,

                          children: [

                            Expanded(

                              child: Text(

                                session.trainingName,

                                style: const TextStyle(

                                  fontSize: 16,

                                  fontWeight: FontWeight.w700,

                                  color: AppColors.textPrimary,

                                  height: 1.25,

                                ),

                              ),

                            ),

                            if (badge != null) ...[

                              const SizedBox(width: 8),

                              badge,

                            ],

                          ],

                        ),

                        const SizedBox(height: 4),

                        Text(

                          trainerLabel,

                          maxLines: 1,

                          overflow: TextOverflow.ellipsis,

                          style: TextStyle(

                            fontSize: 13,

                            color: AppColors.textSecondary,

                          ),

                        ),

                      ],

                    ),

                  ),

                  const SizedBox(width: 10),

                  Column(

                    crossAxisAlignment: CrossAxisAlignment.end,

                    children: [

                      Text(

                        fillLabel,

                        style: const TextStyle(

                          fontSize: 17,

                          fontWeight: FontWeight.w800,

                          letterSpacing: -0.2,

                          color: AppColors.primary600,

                          height: 1.05,

                        ),

                      ),

                      const SizedBox(height: 2),

                      Text(

                        'booked',

                        style: TextStyle(

                          fontSize: 11,

                          fontWeight: FontWeight.w600,

                          letterSpacing: 0.2,

                          color: AppColors.textSecondary,

                        ),

                      ),

                    ],

                  ),

                ],

              ),

            ),

          ),

        ],

      ),

    );



    final box = Container(

      margin: margin,

      decoration: BoxDecoration(

        color: AppColors.backgroundPrimary,

        borderRadius: BorderRadius.circular(14),

        border: Border.all(color: AppColors.borderPrimary),

        boxShadow: const [

          BoxShadow(

            color: Color(0x10000000),

            blurRadius: 10,

            offset: Offset(0, 3),

          ),

        ],

      ),

      clipBehavior: Clip.antiAlias,

      child: inner,

    );



    if (onTap == null) return box;



    return GestureDetector(

      onTap: onTap,

      behavior: HitTestBehavior.opaque,

      child: box,

    );

  }

}

