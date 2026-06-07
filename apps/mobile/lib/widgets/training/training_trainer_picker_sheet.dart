import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../models/staff_member.dart';
import '../common/henzo_modal.dart';
import '../staff/staff_person_tile.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

String _trainerRoleLabel(LocaleProvider locale, String? accessLevel) {
  switch ((accessLevel ?? '').toUpperCase()) {
    case 'OWNER':
      return locale.t('settings.owner.ownerRole');
    case 'ADMIN':
      return locale.t('staffScreen.roleAdmin');
    default:
      return locale.t('staffScreen.roleTrainer');
  }
}

Future<String?> showTrainingTrainerPickerSheet(
  BuildContext context, {
  required List<StaffMember> trainers,
  required String? selectedId,
}) async {
  if (trainers.isEmpty) return null;
  await context.read<LocaleProvider>().loadStrings();
  if (!context.mounted) return null;

  return showHenzoModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetCtx) {
      return SafeArea(
        top: false,
        child: Container(
          margin: const EdgeInsets.only(top: 4),
          decoration: const BoxDecoration(
            color: AppColors.backgroundSecondary,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Padding(
            padding: EdgeInsets.fromLTRB(
              16,
              12,
              16,
              16 + MediaQuery.viewInsetsOf(sheetCtx).bottom,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.borderPrimary,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Consumer<LocaleProvider>(
                  builder: (context, locale, _) => Text(
                    locale.t('ownerSession.selectTrainer'),
                    style: TextStyle(
                      fontSize: 17.sp,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Flexible(
                  child: Consumer<LocaleProvider>(
                    builder: (context, locale, _) {
                      return ListView.builder(
                        shrinkWrap: true,
                        itemCount: trainers.length,
                        itemBuilder: (_, index) {
                          final trainer = trainers[index];
                          final selected = trainer.id == selectedId;
                          return StaffPersonTile(
                            name: trainer.name,
                            role: _trainerRoleLabel(
                              locale,
                              trainer.accessLevel,
                            ),
                            avatarRadius: 22,
                            borderSide: selected
                                ? const BorderSide(
                                    color: AppColors.brandAccent,
                                    width: 1,
                                  )
                                : null,
                            trailing: selected
                                ? const Icon(
                                    Icons.check_rounded,
                                    size: 20,
                                    color: AppColors.primary500,
                                  )
                                : null,
                            onTap: () => Navigator.of(sheetCtx).pop(trainer.id),
                          );
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    },
  );
}
