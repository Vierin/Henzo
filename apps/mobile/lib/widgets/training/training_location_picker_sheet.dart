import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../models/training_location_item.dart';

sealed class TrainingLocationPickerResult {
  const TrainingLocationPickerResult();
}

final class TrainingLocationPicked extends TrainingLocationPickerResult {
  const TrainingLocationPicked(this.location);
  final TrainingLocationItem location;
}

final class TrainingLocationAddRequested extends TrainingLocationPickerResult {
  const TrainingLocationAddRequested();
}

/// Bottom sheet: pick studio location (mockup layout, Henzo branding).
Future<TrainingLocationPickerResult?> showTrainingLocationPickerSheet(
  BuildContext context, {
  required List<TrainingLocationItem> locations,
  required String selectedId,
}) async {
  await context.read<LocaleProvider>().loadStrings();
  if (!context.mounted) return null;

  return showModalBottomSheet<TrainingLocationPickerResult>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetCtx) {
      var currentId = selectedId;
      return StatefulBuilder(
        builder: (context, setModalState) {
          return Consumer<LocaleProvider>(
            builder: (context, locale, _) => SafeArea(
              top: false,
              child: Container(
                margin: const EdgeInsets.only(top: 12),
                decoration: const BoxDecoration(
                  color: AppColors.backgroundPrimary,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
                child: Padding(
                  padding: EdgeInsets.fromLTRB(
                    16,
                    12,
                    16,
                    16 + MediaQuery.viewInsetsOf(context).bottom,
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
                      Text(
                        locale.t('addTraining.locationSheetTitle'),
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.3,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 16),
                      ...locations.map((loc) {
                        final selected = loc.id == currentId;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _LocationOptionCard(
                            location: loc,
                            selected: selected,
                            defaultBadgeLabel: locale.t(
                              'addTraining.defaultLocationBadge',
                            ),
                            onTap: () {
                              setModalState(() => currentId = loc.id);
                              Navigator.of(sheetCtx).pop(
                                TrainingLocationPicked(loc),
                              );
                            },
                          ),
                        );
                      }),
                      _AddLocationButton(
                        label: locale.t('addTraining.addNewLocation'),
                        onTap: () => Navigator.of(sheetCtx).pop(
                          const TrainingLocationAddRequested(),
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
    },
  );
}

class _LocationOptionCard extends StatelessWidget {
  const _LocationOptionCard({
    required this.location,
    required this.selected,
    required this.defaultBadgeLabel,
    required this.onTap,
  });

  final TrainingLocationItem location;
  final bool selected;
  final String defaultBadgeLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.backgroundPrimary,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? AppColors.primary500 : AppColors.borderPrimary,
              width: selected ? 1.5 : 1,
            ),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: SvgPicture.asset(
                  'assets/icons/icon-pin.svg',
                  width: 15,
                  height: 21,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      location.name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    if (location.address.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        location.address,
                        style: const TextStyle(
                          fontSize: 14,
                          height: 1.25,
                          fontWeight: FontWeight.w400,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                    if (location.isDefault) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.neutral100,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          defaultBadgeLabel,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (selected)
                const Padding(
                  padding: EdgeInsets.only(left: 8, top: 2),
                  child: Icon(
                    Icons.check_circle,
                    color: AppColors.primary500,
                    size: 24,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AddLocationButton extends StatelessWidget {
  const _AddLocationButton({
    required this.label,
    required this.onTap,
  });

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.backgroundPrimary,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.borderPrimary),
          ),
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.add, color: AppColors.primary500, size: 22),
              const SizedBox(width: 8),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 16,
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
