import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../models/training_category_option.dart';
import '../common/henzo_modal.dart';

class TrainingCategoryPickResult {
  const TrainingCategoryPickResult.cancelled()
      : applied = false,
        categoryId = null;

  const TrainingCategoryPickResult.apply(this.categoryId) : applied = true;

  final bool applied;
  final int? categoryId;
}

Future<TrainingCategoryPickResult?> showTrainingCategoryPickerSheet({
  required BuildContext context,
  required LocaleProvider locale,
  required List<TrainingCategoryOption> categories,
  required int? selectedCategoryId,
}) {
  if (categories.isEmpty) return Future.value(null);
  final localeCode = locale.localeCode;
  return showHenzoModalBottomSheet<TrainingCategoryPickResult?>(
    context: context,
    showDragHandle: false,
    isScrollControlled: true,
    backgroundColor: AppColors.backgroundPrimary,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    sheetAnimationStyle: const AnimationStyle(
      duration: Duration(milliseconds: 320),
      reverseDuration: Duration(milliseconds: 220),
    ),
    builder: (sheetCtx) {
      final h = MediaQuery.sizeOf(sheetCtx).height;
      void popCancel() => Navigator.of(
        sheetCtx,
      ).pop(const TrainingCategoryPickResult.cancelled());
      return SafeArea(
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            16,
            8,
            8,
            12 + MediaQuery.viewInsetsOf(sheetCtx).bottom,
          ),
          child: SizedBox(
            height: h * 0.42,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(top: 4, left: 4),
                        child: Text(
                          locale.t('addTraining.categorySheetTitle'),
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.4,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: popCancel,
                      icon: const Icon(Icons.close),
                      color: AppColors.textSecondary,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: SingleChildScrollView(
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: categories.map((c) {
                        final selected = selectedCategoryId == c.id;
                        final isOther = c.isOtherCategory;
                        final Color bg;
                        final Color fg;
                        if (isOther) {
                          bg = AppColors.backgroundPrimary;
                          fg = AppColors.textPrimary;
                        } else {
                          final chipBg = c.backgroundColor(
                            AppColors.neutral500,
                          );
                          bg = chipBg;
                          fg = c.foregroundColorOn(chipBg);
                        }
                        final borderW = selected ? 2.0 : 1.0;
                        final borderColor = selected
                            ? AppColors.primary500
                            : (isOther
                                  ? AppColors.primary300
                                  : Colors.transparent);
                        final chipLabel = isOther
                            ? locale.t('addTraining.categoryOtherChip')
                            : c.label(localeCode);
                        return Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () => Navigator.of(sheetCtx).pop(
                              TrainingCategoryPickResult.apply(c.id),
                            ),
                            borderRadius: BorderRadius.circular(999),
                            child: Ink(
                              decoration: BoxDecoration(
                                color: bg,
                                borderRadius: BorderRadius.circular(999),
                                border: Border.all(
                                  color: borderColor,
                                  width: borderW,
                                ),
                              ),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 10,
                              ),
                              child: Text(
                                chipLabel,
                                style: TextStyle(
                                  color: fg,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
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
