import 'package:flutter/material.dart';
import '../common/henzo_modal.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../models/training_location_item.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

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

enum TrainingLocationPickerMode {
  /// Session location: checkmark on selected row.
  select,

  /// Settings default: “Default” badge moves on tap (no checkmark).
  setDefault,
}

/// Bottom sheet: pick studio location (mockup layout, Henzo branding).
Future<TrainingLocationPickerResult?> showTrainingLocationPickerSheet(
  BuildContext context, {
  required List<TrainingLocationItem> locations,
  required String selectedId,
  TrainingLocationPickerMode mode = TrainingLocationPickerMode.select,
  String? titleL10nKey,
  Future<bool> Function(TrainingLocationItem location)? onDeleteLocation,
  Future<TrainingLocationItem?> Function(TrainingLocationItem location)?
      onEditLocation,
}) async {
  await context.read<LocaleProvider>().loadStrings();
  if (!context.mounted) return null;

  return showHenzoModalBottomSheet<TrainingLocationPickerResult>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetCtx) {
      var currentId = selectedId;
      var items = List<TrainingLocationItem>.from(locations);

      return StatefulBuilder(
        builder: (context, setModalState) {
          Future<void> handleEdit(TrainingLocationItem loc) async {
            if (onEditLocation == null) return;
            final updated = await onEditLocation(loc);
            if (updated == null || !sheetCtx.mounted) return;
            setModalState(() {
              items = items
                  .map((l) => l.id == updated.id ? updated : l)
                  .toList();
            });
          }

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
                        locale.t(
                          titleL10nKey ?? 'addTraining.locationSheetTitle',
                        ),
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 18.sp,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.3,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 16),
                      ...items.map((loc) {
                        final isHighlighted = loc.id == currentId;
                        final isDefaultLoc =
                            loc.id == 'default' || loc.isDefault;
                        final showDefaultBadge =
                            mode == TrainingLocationPickerMode.setDefault
                            ? isHighlighted
                            : loc.isDefault;
                        final canDelete = onDeleteLocation != null &&
                            items.length > 1 &&
                            loc.id != 'default';
                        final showDeleteOnCard = onDeleteLocation != null &&
                            !isHighlighted;
                        final showEdit = onEditLocation != null;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _LocationOptionCard(
                            location: loc,
                            showCheckmark: mode ==
                                    TrainingLocationPickerMode.select &&
                                isHighlighted,
                            showDefaultBadge: showDefaultBadge,
                            defaultBadgeLabel: locale.t(
                              'addTraining.defaultLocationBadge',
                            ),
                            highlightBorder: isHighlighted,
                            showDelete: showDeleteOnCard,
                            canDelete: canDelete,
                            deleteTooltip: locale.t('common.delete'),
                            showEdit: showEdit,
                            editTooltip: locale.t('common.edit'),
                            onDelete: canDelete
                                ? () async {
                                    final ok = await onDeleteLocation(loc);
                                    if (!ok || !sheetCtx.mounted) return;
                                    setModalState(() {
                                      items = items
                                          .where((l) => l.id != loc.id)
                                          .toList();
                                      if (currentId == loc.id) {
                                        currentId = items.first.id;
                                      }
                                    });
                                  }
                                : null,
                            onEdit: showEdit
                                ? () => handleEdit(loc)
                                : null,
                            onTap: () async {
                              if (mode ==
                                      TrainingLocationPickerMode.setDefault &&
                                  showEdit &&
                                  isDefaultLoc) {
                                await handleEdit(loc);
                                return;
                              }
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
    required this.showCheckmark,
    required this.showDefaultBadge,
    required this.defaultBadgeLabel,
    required this.highlightBorder,
    required this.onTap,
    required this.showDelete,
    required this.canDelete,
    required this.deleteTooltip,
    required this.showEdit,
    required this.editTooltip,
    this.onDelete,
    this.onEdit,
  });

  final TrainingLocationItem location;
  final bool showCheckmark;
  final bool showDefaultBadge;
  final String defaultBadgeLabel;
  final bool highlightBorder;
  final VoidCallback onTap;
  final bool showDelete;
  final bool canDelete;
  final String deleteTooltip;
  final bool showEdit;
  final String editTooltip;
  final VoidCallback? onDelete;
  final VoidCallback? onEdit;

  @override
  Widget build(BuildContext context) {
    final deleteColor = canDelete
        ? AppColors.textSecondary
        : AppColors.textSecondary.withValues(alpha: 0.35);

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
              color: highlightBorder
                  ? AppColors.primary500
                  : AppColors.borderPrimary,
              width: highlightBorder ? 1.5 : 1,
            ),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  SvgPicture.asset(
                    'assets/icons/icon-pin.svg',
                    width: 15,
                    height: 21,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      location.name,
                      style: TextStyle(
                        fontSize: 16.sp,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  if (showDelete) ...[
                    const SizedBox(width: 8),
                    _LocationActionButton(
                      onPressed: onDelete,
                      tooltip: deleteTooltip,
                      color: deleteColor,
                      iconAsset: 'assets/icons/icon-trash.svg',
                    ),
                  ],
                  if (showEdit) ...[
                    const SizedBox(width: 4),
                    _LocationActionButton(
                      onPressed: onEdit,
                      tooltip: editTooltip,
                      color: AppColors.textSecondary,
                      iconAsset: 'assets/icons/icon-pencil.svg',
                    ),
                  ],
                  if (showCheckmark) ...[
                    const SizedBox(width: 8),
                    const Icon(
                      Icons.check,
                      color: AppColors.primary500,
                      size: 24,
                      weight: 700,
                    ),
                  ],
                ],
              ),
              if (location.address.isNotEmpty) ...[
                const SizedBox(height: 4),
                Padding(
                  padding: const EdgeInsets.only(left: 27),
                  child: Text(
                    location.address,
                    style: TextStyle(
                      fontSize: 14.sp,
                      height: 1.25,
                      fontWeight: FontWeight.w400,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ],
              if (showDefaultBadge) ...[
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.only(left: 27),
                  child: Container(
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
                      style: TextStyle(
                        fontSize: 12.sp,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _LocationActionButton extends StatelessWidget {
  const _LocationActionButton({
    required this.onPressed,
    required this.tooltip,
    required this.color,
    required this.iconAsset,
  });

  final VoidCallback? onPressed;
  final String tooltip;
  final Color color;
  final String iconAsset;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.all(6),
            child: SvgPicture.asset(
              iconAsset,
              width: 18,
              height: 18,
              colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
            ),
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
                style: TextStyle(
                  fontSize: 16.sp,
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
