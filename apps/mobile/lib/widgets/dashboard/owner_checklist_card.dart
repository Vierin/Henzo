import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Owner onboarding card: 3 required steps, then 3 optional (design mock).
class OwnerChecklistCard extends StatelessWidget {
  const OwnerChecklistCard({
    super.key,
    required this.studioDetailsCompleted,
    required this.hasTraining,
    required this.hasPhoto,
    required this.hasLogo,
    required this.contactsConfigured,
    required this.hasDescription,
    required this.canPublish,
    required this.isStudioActive,
    required this.isPublishing,
    required this.onStudioDetailsTap,
    required this.onCreateTrainingTap,
    required this.onAddPhotoTap,
    required this.onAddLogoTap,
    required this.onContactsTap,
    required this.onAddDescriptionTap,
    required this.onPreviewPublicPageTap,
    required this.onPublishTap,
    required this.showOptionalPhase,
    this.showPreviewButton = true,
  });

  final bool studioDetailsCompleted;
  final bool hasTraining;
  final bool hasPhoto;
  final bool hasLogo;
  final bool contactsConfigured;
  final bool hasDescription;
  final bool canPublish;
  final bool isStudioActive;
  final bool isPublishing;
  final bool showPreviewButton;
  final VoidCallback onStudioDetailsTap;
  final VoidCallback onCreateTrainingTap;
  final VoidCallback onAddPhotoTap;
  final VoidCallback onAddLogoTap;
  final VoidCallback onContactsTap;
  final VoidCallback onAddDescriptionTap;
  final VoidCallback onPreviewPublicPageTap;
  final VoidCallback onPublishTap;
  final bool showOptionalPhase;

  static const _taskIconColor = AppColors.primary500;
  static const _chevronColor = Color(0xFF3B5BDB);
  static const _mandatoryStepWeight = 25;
  static const _optionalTotalWeight = 25;
  static const _optionalStepCount = 3;

  int get _mandatoryDoneCount => <bool>[
    studioDetailsCompleted,
    hasTraining,
    hasPhoto,
  ].where((d) => d).length;

  int get _optionalDoneCount => <bool>[
    hasLogo,
    contactsConfigured,
    hasDescription,
  ].where((d) => d).length;

  int get _mandatoryLeft => 3 - _mandatoryDoneCount;

  int get _optionalLeft => 3 - _optionalDoneCount;

  /// Mandatory 25% × 3 (75%), optional 25% total across 3 steps → 100%.
  int get _percent {
    final mandatoryPart = _mandatoryDoneCount * _mandatoryStepWeight;
    if (!showOptionalPhase) return mandatoryPart;
    final optionalPart = _optionalDoneCount == _optionalStepCount
        ? _optionalTotalWeight
        : (_optionalDoneCount * _optionalTotalWeight / _optionalStepCount)
              .round();
    return mandatoryPart + optionalPart;
  }

  int get _stepsLeft => showOptionalPhase ? _optionalLeft : _mandatoryLeft;

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LocaleProvider>();
    String tr(String k) => t.t('dashboard.$k');

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(13, 16, 13, 16),
      decoration: BoxDecoration(
        color: const Color(0xFFC2F600).withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: showOptionalPhase
                    ? _OptionalPhaseHeader(tr: tr)
                    : _MandatoryPhaseHeader(
                        tr: tr,
                        percent: _percent,
                        stepsLeft: _stepsLeft,
                      ),
              ),
              const SizedBox(width: 12),
              _OnboardingProgressRing(
                percent: _percent,
                completedLabel: tr('onboardingCompletedLabel'),
              ),
            ],
          ),
          if (showPreviewButton || (!isStudioActive && canPublish)) ...[
            const SizedBox(height: 14),
            _OnboardingActionButtons(
              previewLabel: tr('onboardingPreviewPublicPage'),
              activateLabel: tr('onboardingActivate'),
              showPreview: showPreviewButton,
              showActivate: !isStudioActive && canPublish,
              isPublishing: isPublishing,
              onPreviewTap: onPreviewPublicPageTap,
              onActivateTap: onPublishTap,
            ),
          ],
          if (_stepsLeft > 0) ...[
            const SizedBox(height: 20),
            if (!showOptionalPhase) ...[
              if (!studioDetailsCompleted)
                _OnboardingTaskRow(
                  icon: Icons.storefront_outlined,
                  title: tr('onboardingStudioDetailsTitle'),
                  subtitle: tr('onboardingStudioDetailsSubtitle'),
                  onTap: onStudioDetailsTap,
                ),
              if (!hasTraining)
                _OnboardingTaskRow(
                  icon: Icons.calendar_today_outlined,
                  title: tr('onboardingCreateClassTitle'),
                  subtitle: tr('onboardingCreateClassSubtitle'),
                  onTap: onCreateTrainingTap,
                ),
              if (!hasPhoto)
                _OnboardingTaskRow(
                  icon: Icons.photo_outlined,
                  title: tr('onboardingPhotoTitle'),
                  subtitle: tr('onboardingPhotoSubtitle'),
                  onTap: onAddPhotoTap,
                ),
            ] else ...[
              if (!hasLogo)
                _OnboardingTaskRow(
                  icon: Icons.image_outlined,
                  title: tr('onboardingAddLogo'),
                  subtitle: tr('onboardingLogoSubtitle'),
                  onTap: onAddLogoTap,
                ),
              if (!contactsConfigured)
                _OnboardingTaskRow(
                  icon: Icons.contact_phone_outlined,
                  title: tr('onboardingContacts'),
                  subtitle: tr('onboardingContactsSubtitle'),
                  onTap: onContactsTap,
                ),
              if (!hasDescription)
                _OnboardingTaskRow(
                  icon: Icons.description_outlined,
                  title: tr('onboardingAddStudioDescriptionTitle'),
                  subtitle: tr('onboardingAddStudioDescriptionSubtitle'),
                  onTap: onAddDescriptionTap,
                ),
            ],
          ],
        ],
      ),
    );
  }
}

class _MandatoryPhaseHeader extends StatelessWidget {
  const _MandatoryPhaseHeader({
    required this.tr,
    required this.percent,
    required this.stepsLeft,
  });

  final String Function(String) tr;
  final int percent;
  final int stepsLeft;

  @override
  Widget build(BuildContext context) {
    final stepsText = stepsLeft == 1
        ? tr('onboardingOneStepLeft')
        : tr('onboardingStepsLeft').replaceAll('{count}', '$stepsLeft');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          tr('onboardingTagline'),
          style: TextStyle(
            fontSize: 11.sp,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.6,
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          tr('onboardingStudioReadyPrefix').trim(),
          style: TextStyle(
            fontSize: 24.sp,
            fontWeight: FontWeight.w400,
            height: 1.2,
            color: AppColors.textPrimary,
          ),
        ),
        RichText(
          text: TextSpan(
            style: TextStyle(
              fontSize: 24.sp,
              fontWeight: FontWeight.w400,
              height: 1.2,
              color: AppColors.textPrimary,
            ),
            children: [
              TextSpan(
                text: '$percent%',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
              TextSpan(text: tr('onboardingStudioReadySuffix')),
            ],
          ),
        ),
        const SizedBox(height: 6),
        Text(
          stepsText,
          style: TextStyle(
            fontSize: 12.sp,
            height: 1.2,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}

class _OnboardingActionButtons extends StatelessWidget {
  const _OnboardingActionButtons({
    required this.previewLabel,
    required this.activateLabel,
    required this.showPreview,
    required this.showActivate,
    required this.isPublishing,
    required this.onPreviewTap,
    required this.onActivateTap,
  });

  final String previewLabel;
  final String activateLabel;
  final bool showPreview;
  final bool showActivate;
  final bool isPublishing;
  final VoidCallback onPreviewTap;
  final VoidCallback onActivateTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (showPreview)
          Expanded(
            child: _PreviewPublicPageButton(
              label: previewLabel,
              onTap: onPreviewTap,
            ),
          ),
        if (showPreview && showActivate) const SizedBox(width: 8),
        if (showActivate)
          Expanded(
            child: _ActivateStudioButton(
              label: activateLabel,
              isPublishing: isPublishing,
              onTap: onActivateTap,
            ),
          ),
      ],
    );
  }
}

class _OptionalPhaseHeader extends StatelessWidget {
  const _OptionalPhaseHeader({required this.tr});

  final String Function(String) tr;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(0, 12, 0, 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tr('onboardingOptionalHeadline'),
                  style: TextStyle(
                    fontSize: 17.sp,
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  tr('onboardingOptionalSubhead'),
                  style: TextStyle(
                    fontSize: 13.sp,
                    height: 1.35,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PreviewPublicPageButton extends StatelessWidget {
  const _PreviewPublicPageButton({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.primary500,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12.sp,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(width: 4),
              const Icon(Icons.chevron_right_rounded, color: Colors.white, size: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActivateStudioButton extends StatelessWidget {
  const _ActivateStudioButton({
    required this.label,
    required this.isPublishing,
    required this.onTap,
  });

  final String label;
  final bool isPublishing;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: isPublishing ? null : onTap,
        borderRadius: BorderRadius.circular(999),
        child: Ink(
          decoration: BoxDecoration(
            color: AppColors.backgroundPrimary,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: AppColors.primary500, width: 1.5),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (isPublishing)
                const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppColors.primary500,
                  ),
                )
              else
                Flexible(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12.sp,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary500,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OnboardingProgressRing extends StatelessWidget {
  const _OnboardingProgressRing({
    required this.percent,
    required this.completedLabel,
  });

  final int percent;
  final String completedLabel;

  @override
  Widget build(BuildContext context) {
    const size = 106.0;
    const stroke = 8.0;
    const rocketSize = 34.0;
    final progress = (percent.clamp(0, 100)) / 100.0;

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          CustomPaint(
            size: const Size(size, size),
            painter: _RingPainter(progress: progress, stroke: stroke),
          ),
          Positioned.fill(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '$percent%',
                  style: TextStyle(
                    fontSize: 24.sp,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textPrimary,
                    height: 1,
                  ),
                ),
                Text(
                  completedLabel,
                  style: TextStyle(
                    fontSize: 11.sp,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            right: -4,
            bottom: -6,
            child: Image.asset(
              'assets/icons/icon-rocket.png',
              width: rocketSize,
              height: rocketSize,
            ),
          ),
        ],
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({required this.progress, this.stroke = 8.0});

  final double progress;
  final double stroke;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - stroke / 2;

    final track = Paint()
      ..color = AppColors.primary50
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;

    final arc = Paint()
      ..color = AppColors.primary500
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, track);
    if (progress > 0) {
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        -math.pi / 2,
        2 * math.pi * progress,
        false,
        arc,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _RingPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.stroke != stroke;
}

class _OnboardingTaskRow extends StatelessWidget {
  const _OnboardingTaskRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: const BoxDecoration(
                    color: OwnerChecklistCard._taskIconColor,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: Colors.white, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: 15.sp,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        subtitle,
                        style: TextStyle(
                          fontSize: 13.sp,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: OwnerChecklistCard._chevronColor,
                  size: 24,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
