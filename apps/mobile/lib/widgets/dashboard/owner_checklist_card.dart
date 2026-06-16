import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Owner onboarding: studio details, first class, photo → activate.
class OwnerChecklistCard extends StatelessWidget {
  const OwnerChecklistCard({
    super.key,
    required this.studioDetailsCompleted,
    required this.hasTraining,
    required this.hasPhoto,
    required this.canPublish,
    required this.isStudioActive,
    required this.isPublishing,
    required this.onStudioDetailsTap,
    required this.onCreateTrainingTap,
    required this.onAddPhotoTap,
    required this.onPreviewPublicPageTap,
    required this.onPublishTap,
    this.showPreviewButton = true,
  });

  final bool studioDetailsCompleted;
  final bool hasTraining;
  final bool hasPhoto;
  final bool canPublish;
  final bool isStudioActive;
  final bool isPublishing;
  final bool showPreviewButton;
  final VoidCallback onStudioDetailsTap;
  final VoidCallback onCreateTrainingTap;
  final VoidCallback onAddPhotoTap;
  final VoidCallback onPreviewPublicPageTap;
  final VoidCallback onPublishTap;

  static const _taskIconColor = AppColors.primary500;
  static const _chevronColor = Color(0xFF3B5BDB);
  static const _stepCount = 3;

  int get _doneCount => <bool>[
    studioDetailsCompleted,
    hasTraining,
    hasPhoto,
  ].where((d) => d).length;

  int get _stepsLeft => _stepCount - _doneCount;

  int get _percent => ((_doneCount * 100) / _stepCount).round();

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
                child: _PhaseHeader(
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
            if (!studioDetailsCompleted)
              _OnboardingTaskRow(
                svgAsset: 'assets/icons/icon-studio.svg',
                svgWidth: 16,
                svgHeight: 16,
                title: tr('onboardingStudioDetailsTitle'),
                subtitle: tr('onboardingStudioDetailsSubtitle'),
                onTap: onStudioDetailsTap,
              ),
            if (!hasTraining)
              _OnboardingTaskRow(
                svgAsset: 'assets/icons/icon-calendar.svg',
                svgWidth: 16,
                svgHeight: 16,
                title: tr('onboardingCreateClassTitle'),
                subtitle: tr('onboardingCreateClassSubtitle'),
                onTap: onCreateTrainingTap,
              ),
            if (!hasPhoto)
              _OnboardingTaskRow(
                svgAsset: 'assets/icons/icon-img.svg',
                svgWidth: 16,
                svgHeight: 16,
                title: tr('onboardingPhotoTitle'),
                subtitle: tr('onboardingPhotoSubtitle'),
                onTap: onAddPhotoTap,
              ),
          ],
        ],
      ),
    );
  }
}

class _PhaseHeader extends StatelessWidget {
  const _PhaseHeader({
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
            fontWeight: FontWeight.w500,
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
                style: TextStyle(fontWeight: FontWeight.w500),
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
          _PreviewPublicPageButton(label: previewLabel, onTap: onPreviewTap),
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
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 14.sp,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 4),
              const Icon(
                Icons.chevron_right_rounded,
                color: Colors.white,
                size: 18,
              ),
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
    this.icon,
    this.svgAsset,
    this.svgWidth,
    this.svgHeight,
    required this.title,
    required this.subtitle,
    required this.onTap,
  }) : assert(icon != null || svgAsset != null);

  final IconData? icon;
  final String? svgAsset;
  final double? svgWidth;
  final double? svgHeight;
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
                  child: Center(
                    child: svgAsset != null
                        ? SvgPicture.asset(
                            svgAsset!,
                            width: svgWidth ?? 20,
                            height: svgHeight ?? 20,
                            fit: BoxFit.contain,
                            colorFilter: const ColorFilter.mode(
                              Colors.white,
                              BlendMode.srcIn,
                            ),
                          )
                        : Icon(icon, color: Colors.white, size: 20),
                  ),
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
                          fontWeight: FontWeight.w500,
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
