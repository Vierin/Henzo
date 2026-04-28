import 'package:flutter/material.dart';
import '../../constants/colors.dart';

class OwnerChecklistCard extends StatelessWidget {
  const OwnerChecklistCard({
    super.key,
    required this.hasTraining,
    required this.hasPhoto,
    required this.bookingWindowConfigured,
    required this.contactsConfigured,
    required this.canPublish,
    required this.isPublishing,
    required this.onCreateTrainingTap,
    required this.onAddPhotoTap,
    required this.onBookingWindowTap,
    required this.onContactsTap,
    required this.onPublishTap,
    this.missingRequiredSteps = const <String>[],
  });

  final bool hasTraining;
  final bool hasPhoto;
  final bool bookingWindowConfigured;
  final bool contactsConfigured;
  final bool canPublish;
  final bool isPublishing;
  final List<String> missingRequiredSteps;
  final VoidCallback onCreateTrainingTap;
  final VoidCallback onAddPhotoTap;
  final VoidCallback onBookingWindowTap;
  final VoidCallback onContactsTap;
  final VoidCallback onPublishTap;

  @override
  Widget build(BuildContext context) {
    final completedCount = <bool>[
      hasTraining,
      hasPhoto,
      bookingWindowConfigured,
      contactsConfigured,
    ].where((done) => done).length;

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
          Text(
            'Studio onboarding',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '$completedCount/4 completed',
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 12),
          _ChecklistRow(
            label: 'Create first training',
            required: true,
            done: hasTraining,
            onTap: onCreateTrainingTap,
          ),
          _ChecklistRow(
            label: 'Add at least 1 studio photo',
            required: true,
            done: hasPhoto,
            onTap: onAddPhotoTap,
          ),
          const Divider(height: 18, color: AppColors.borderSecondary),
          _ChecklistRow(
            label: 'Configure booking window',
            required: false,
            done: bookingWindowConfigured,
            onTap: onBookingWindowTap,
          ),
          _ChecklistRow(
            label: 'Add contact info',
            required: false,
            done: contactsConfigured,
            onTap: onContactsTap,
          ),
          if (missingRequiredSteps.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              'Missing required: ${missingRequiredSteps.join(', ')}',
              style: const TextStyle(
                color: AppColors.warning600,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ],
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: canPublish && !isPublishing ? onPublishTap : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary500,
                disabledBackgroundColor: AppColors.borderPrimary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              child: isPublishing
                  ? const SizedBox(
                      height: 16,
                      width: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Text('Activate studio'),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChecklistRow extends StatelessWidget {
  const _ChecklistRow({
    required this.label,
    required this.required,
    required this.done,
    required this.onTap,
  });

  final String label;
  final bool required;
  final bool done;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final icon = done ? Icons.check_circle : Icons.radio_button_unchecked;
    final color = done ? AppColors.success600 : AppColors.textSecondary;
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.zero,
      minVerticalPadding: 0,
      leading: Icon(icon, size: 20, color: color),
      title: Text(
        required ? '$label (required)' : label,
        style: TextStyle(
          fontSize: 14,
          fontWeight: done ? FontWeight.w600 : FontWeight.w500,
          color: AppColors.textPrimary,
        ),
      ),
      trailing: const Icon(
        Icons.chevron_right_rounded,
        color: AppColors.textSecondary,
      ),
      onTap: onTap,
    );
  }
}
