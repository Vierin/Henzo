import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';

class OwnerChecklistCard extends StatefulWidget {
  const OwnerChecklistCard({
    super.key,
    required this.hasTraining,
    required this.hasPhoto,
    required this.hasLogo,
    required this.bookingWindowConfigured,
    required this.contactsConfigured,
    required this.canPublish,
    required this.isStudioActive,
    required this.isPublishing,
    required this.onCreateTrainingTap,
    required this.onAddPhotoTap,
    required this.onAddLogoTap,
    required this.onBookingWindowTap,
    required this.onContactsTap,
    required this.onPublishTap,
    this.missingRequiredSteps = const <String>[],
  });

  final bool hasTraining;
  final bool hasPhoto;
  final bool hasLogo;
  final bool bookingWindowConfigured;
  final bool contactsConfigured;
  final bool canPublish;
  final bool isStudioActive;
  final bool isPublishing;
  final List<String> missingRequiredSteps;
  final VoidCallback onCreateTrainingTap;
  final VoidCallback onAddPhotoTap;
  final VoidCallback onAddLogoTap;
  final VoidCallback onBookingWindowTap;
  final VoidCallback onContactsTap;
  final VoidCallback onPublishTap;

  @override
  State<OwnerChecklistCard> createState() => _OwnerChecklistCardState();
}

class _OwnerChecklistCardState extends State<OwnerChecklistCard> {
  static const int _kTotalSteps = 5;
  /// Collapsed by default to save vertical space; header stays visible.
  bool _checklistExpanded = false;

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LocaleProvider>();
    String tr(String k) => t.t('dashboard.$k');

    final completedCount = <bool>[
      widget.hasTraining,
      widget.hasPhoto,
      widget.hasLogo,
      widget.bookingWindowConfigured,
      widget.contactsConfigured,
    ].where((done) => done).length;

    final progressLine =
        '$completedCount/$_kTotalSteps ${tr('onboardingStepsCompleted')}';

    final missingText = widget.missingRequiredSteps.isEmpty
        ? null
        : tr('onboardingMissingRequired').replaceAll(
            '{items}',
            widget.missingRequiredSteps.join(', '),
          );

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderPrimary),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: () =>
                  setState(() => _checklistExpanded = !_checklistExpanded),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            tr('onboardingTitle'),
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            progressLine,
                            style: const TextStyle(
                              fontSize: 13,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Icon(
                      _checklistExpanded
                          ? Icons.expand_less_rounded
                          : Icons.expand_more_rounded,
                      size: 28,
                      color: AppColors.textSecondary,
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (missingText != null) ...[
            const SizedBox(height: 10),
            Text(
              missingText,
              style: const TextStyle(
                color: AppColors.warning600,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ],
          if (_checklistExpanded) ...[
            const SizedBox(height: 12),
            Text(
              tr('onboardingRequiredCaption'),
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.4,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 6),
            _ChecklistRow(
              label: tr('onboardingCreateTraining'),
              done: widget.hasTraining,
              onTap: widget.hasTraining ? null : widget.onCreateTrainingTap,
            ),
            _ChecklistRow(
              label: tr('onboardingAddPhoto'),
              done: widget.hasPhoto,
              onTap: widget.hasPhoto ? null : widget.onAddPhotoTap,
            ),
            Padding(
              padding: const EdgeInsets.only(top: 10, bottom: 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          height: 1,
                          color: AppColors.borderSecondary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    tr('onboardingOptionalTitle'),
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.4,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            _ChecklistRow(
              label: tr('onboardingAddLogo'),
              done: widget.hasLogo,
              onTap: widget.hasLogo ? null : widget.onAddLogoTap,
            ),
            _ChecklistRow(
              label: tr('onboardingBookingWindow'),
              done: widget.bookingWindowConfigured,
              onTap: widget.bookingWindowConfigured
                  ? null
                  : widget.onBookingWindowTap,
            ),
            _ChecklistRow(
              label: tr('onboardingContacts'),
              done: widget.contactsConfigured,
              onTap: widget.contactsConfigured ? null : widget.onContactsTap,
            ),
          ],
          if (!widget.isStudioActive) ...[
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: widget.canPublish && !widget.isPublishing
                    ? widget.onPublishTap
                    : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary500,
                  disabledBackgroundColor: AppColors.borderPrimary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: widget.isPublishing
                    ? const SizedBox(
                        height: 16,
                        width: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            Colors.white,
                          ),
                        ),
                      )
                    : Text(tr('onboardingActivate')),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ChecklistRow extends StatelessWidget {
  const _ChecklistRow({
    required this.label,
    required this.done,
    this.onTap,
  });

  final String label;
  final bool done;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final icon = done ? Icons.check_circle : Icons.radio_button_unchecked;
    final color = done ? AppColors.success600 : AppColors.textSecondary;
    final disabled = onTap == null;
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.zero,
      minVerticalPadding: 0,
      leading: Icon(icon, size: 20, color: color),
      title: Text(
        label,
        style: TextStyle(
          fontSize: 14,
          fontWeight: done ? FontWeight.w600 : FontWeight.w500,
          color: disabled ? AppColors.textSecondary : AppColors.textPrimary,
        ),
      ),
      trailing: disabled
          ? const SizedBox.shrink()
          : const Icon(
              Icons.chevron_right_rounded,
              color: AppColors.textSecondary,
            ),
      onTap: onTap,
    );
  }
}
