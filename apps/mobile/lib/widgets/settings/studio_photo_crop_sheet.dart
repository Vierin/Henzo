import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:crop_your_image/crop_your_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../models/studio_photo_asset.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Smaller frame → slightly lower initial cover scale.
const _cropViewportInset = 0.68;

const _cropMaskColor = ui.Color.fromARGB(140, 255, 255, 255);

enum _StudioPhotoCropFormat { studioPage, browseCard }

enum _CropSaveStep { idle, hero, card }

class StudioPhotoCropResult {
  const StudioPhotoCropResult({
    required this.crops,
    required this.heroBytes,
    required this.cardBytes,
  });

  final StudioPhotoCrops crops;
  final Uint8List heroBytes;
  final Uint8List cardBytes;
}

/// Opens a full-screen crop editor; returns crop result or `null` if skipped.
Future<StudioPhotoCropResult?> showStudioPhotoCropSheet({
  required BuildContext context,
  required Uint8List imageBytes,
  StudioPhotoCrops? initialCrops,
}) async {
  if (!context.mounted) return null;

  return Navigator.of(context).push<StudioPhotoCropResult>(
    MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) => _StudioPhotoCropScreen(
        imageBytes: imageBytes,
        initialCrops: initialCrops,
      ),
    ),
  );
}

class _StudioPhotoCropScreen extends StatefulWidget {
  const _StudioPhotoCropScreen({
    required this.imageBytes,
    this.initialCrops,
  });

  final Uint8List imageBytes;
  final StudioPhotoCrops? initialCrops;

  @override
  State<_StudioPhotoCropScreen> createState() => _StudioPhotoCropScreenState();
}

class _StudioPhotoCropScreenState extends State<_StudioPhotoCropScreen> {
  final _controllers = <_StudioPhotoCropFormat, CropController>{
    _StudioPhotoCropFormat.studioPage: CropController(),
    _StudioPhotoCropFormat.browseCard: CropController(),
  };
  final _savedAreas = <_StudioPhotoCropFormat, Rect>{};
  final _pendingAreaRestore = <_StudioPhotoCropFormat, bool>{
    _StudioPhotoCropFormat.studioPage: false,
    _StudioPhotoCropFormat.browseCard: false,
  };

  var _cropping = false;
  var _activeFormat = _StudioPhotoCropFormat.studioPage;
  var _saveStep = _CropSaveStep.idle;
  Uint8List? _heroBytes;
  Size? _imageSize;

  double _aspectRatioFor(_StudioPhotoCropFormat format) => switch (format) {
        _StudioPhotoCropFormat.studioPage => kStudioCoverPhotoAspectRatio,
        _StudioPhotoCropFormat.browseCard => kStudioListPhotoAspectRatio,
      };

  @override
  void initState() {
    super.initState();
    _decodeImageSize();
  }

  Future<void> _decodeImageSize() async {
    try {
      final codec = await ui.instantiateImageCodec(widget.imageBytes);
      final frame = await codec.getNextFrame();
      final image = frame.image;
      final size = Size(image.width.toDouble(), image.height.toDouble());
      image.dispose();
      if (!mounted) return;
      setState(() => _imageSize = size);
      _queueInitialAreaRestore();
    } catch (_) {
      // Crop widget will still work without restored areas.
    }
  }

  void _queueInitialAreaRestore() {
    final crops = widget.initialCrops;
    final imageSize = _imageSize;
    if (crops == null || imageSize == null) return;

    _scheduleAreaRestore(
      _StudioPhotoCropFormat.studioPage,
      crops.studioPage,
      imageSize,
    );
    _scheduleAreaRestore(
      _StudioPhotoCropFormat.browseCard,
      crops.browseCard,
      imageSize,
    );
  }

  void _scheduleAreaRestore(
    _StudioPhotoCropFormat format,
    StudioPhotoCropRect crop,
    Size imageSize,
  ) {
    _pendingAreaRestore[format] = true;
    _restoreAreaIfNeeded(format, crop: crop, imageSize: imageSize);
  }

  void _restoreAreaIfNeeded(
    _StudioPhotoCropFormat format, {
    StudioPhotoCropRect? crop,
    Size? imageSize,
  }) {
    if (_pendingAreaRestore[format] != true) return;
    final imageSizeValue = imageSize ?? _imageSize;
    final crops = widget.initialCrops;
    if (imageSizeValue == null || crops == null) return;

    final normalized = crop ??
        switch (format) {
          _StudioPhotoCropFormat.studioPage => crops.studioPage,
          _StudioPhotoCropFormat.browseCard => crops.browseCard,
        };

    _controllers[format]!.area =
        _imageRectFromNormalized(normalized, imageSizeValue);
    _pendingAreaRestore[format] = false;
  }

  Rect _imageRectFromNormalized(StudioPhotoCropRect crop, Size imageSize) {
    return Rect.fromLTWH(
      crop.x * imageSize.width,
      crop.y * imageSize.height,
      crop.w * imageSize.width,
      crop.h * imageSize.height,
    );
  }

  StudioPhotoCropRect _normalizedFromImageRect(Rect area) {
    final imageSize = _imageSize;
    if (imageSize == null || imageSize.width <= 0 || imageSize.height <= 0) {
      return const StudioPhotoCropRect(x: 0, y: 0, w: 1, h: 1);
    }
    return StudioPhotoCropRect(
      x: (area.left / imageSize.width).clamp(0.0, 1.0),
      y: (area.top / imageSize.height).clamp(0.0, 1.0),
      w: (area.width / imageSize.width).clamp(0.0, 1.0),
      h: (area.height / imageSize.height).clamp(0.0, 1.0),
    );
  }

  void _selectFormat(_StudioPhotoCropFormat format) {
    if (_cropping || format == _activeFormat) return;
    setState(() => _activeFormat = format);
  }

  void _onCropMoved(
    _StudioPhotoCropFormat format,
    ViewportBasedRect viewportRect,
    ImageBasedRect imageRect,
  ) {
    _savedAreas[format] = imageRect;
  }

  void _onSave() {
    if (_cropping) return;
    setState(() {
      _cropping = true;
      _saveStep = _CropSaveStep.hero;
      _heroBytes = null;
    });
    _controllers[_StudioPhotoCropFormat.studioPage]!.crop();
  }

  void _onCropped(_StudioPhotoCropFormat format, CropResult result) {
    if (!mounted) return;
    switch (result) {
      case CropSuccess(:final croppedImage):
        if (_saveStep == _CropSaveStep.hero &&
            format == _StudioPhotoCropFormat.studioPage) {
          _heroBytes = croppedImage;
          setState(() => _saveStep = _CropSaveStep.card);
          _controllers[_StudioPhotoCropFormat.browseCard]!.crop();
          return;
        }
        if (_saveStep == _CropSaveStep.card &&
            format == _StudioPhotoCropFormat.browseCard &&
            _heroBytes != null) {
          final heroArea = _savedAreas[_StudioPhotoCropFormat.studioPage];
          final cardArea = _savedAreas[_StudioPhotoCropFormat.browseCard];
          if (heroArea == null || cardArea == null) {
            setState(() {
              _cropping = false;
              _saveStep = _CropSaveStep.idle;
            });
            return;
          }
          Navigator.of(context).pop(
            StudioPhotoCropResult(
              crops: StudioPhotoCrops(
                studioPage: _normalizedFromImageRect(heroArea),
                browseCard: _normalizedFromImageRect(cardArea),
              ),
              heroBytes: _heroBytes!,
              cardBytes: croppedImage,
            ),
          );
          return;
        }
        setState(() {
          _cropping = false;
          _saveStep = _CropSaveStep.idle;
        });
      case CropFailure():
        setState(() {
          _cropping = false;
          _saveStep = _CropSaveStep.idle;
        });
    }
  }

  Rect _cropRectFor(Size viewport, double aspectRatio) {
    final maxW = viewport.width * _cropViewportInset;
    final maxH = viewport.height * _cropViewportInset;
    var width = maxW;
    var height = width / aspectRatio;
    if (height > maxH) {
      height = maxH;
      width = height * aspectRatio;
    }
    return Rect.fromCenter(
      center: Offset(viewport.width / 2, viewport.height / 2),
      width: width,
      height: height,
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    const screenBg = AppColors.backgroundPrimary;

    return Scaffold(
      backgroundColor: screenBg,
      appBar: AppBar(
        backgroundColor: screenBg,
        elevation: 0,
        scrolledUnderElevation: 0,
        leadingWidth: 56,
        leading: Padding(
          padding: const EdgeInsets.only(left: 8),
          child: Center(
            child: Material(
              color: AppColors.neutral200,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: _cropping ? null : () => Navigator.of(context).pop(),
                child: const SizedBox(
                  width: 40,
                  height: 40,
                  child: Icon(
                    Icons.close,
                    size: 20,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
            ),
          ),
        ),
        title: Text(
          locale.t('profileForm.studioPhotoCropTitle'),
          style: TextStyle(
            fontSize: 16.sp,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(
              child: FilledButton(
                onPressed: _cropping ? null : _onSave,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary500,
                  disabledBackgroundColor: AppColors.neutral200,
                  disabledForegroundColor: AppColors.textTertiary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 18),
                  minimumSize: const Size(0, 36),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
                child: _cropping
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text(
                        locale.t('common.save'),
                        style: TextStyle(
                          fontSize: 15.sp,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: IndexedStack(
                index: _activeFormat.index,
                children: [
                  for (final format in _StudioPhotoCropFormat.values)
                    _CropEditorPane(
                      key: ValueKey(format),
                      format: format,
                      imageBytes: widget.imageBytes,
                      controller: _controllers[format]!,
                      aspectRatio: _aspectRatioFor(format),
                      screenBg: screenBg,
                      cropRectFor: _cropRectFor,
                      onMoved: _onCropMoved,
                      onCropped: _onCropped,
                      onReady: () => _restoreAreaIfNeeded(format),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _CropFormatPreview(
                    label: locale.t('profileForm.studioPhotoCropPreviewWide'),
                    aspectRatio: kStudioCoverPhotoAspectRatio,
                    width: 30,
                    isSelected:
                        _activeFormat == _StudioPhotoCropFormat.studioPage,
                    onTap: _cropping
                        ? null
                        : () =>
                              _selectFormat(_StudioPhotoCropFormat.studioPage),
                  ),
                  const SizedBox(width: 16),
                  _CropFormatPreview(
                    label: locale.t('profileForm.studioPhotoCropPreviewTall'),
                    aspectRatio: kStudioListPhotoAspectRatio,
                    width: 20,
                    isSelected:
                        _activeFormat == _StudioPhotoCropFormat.browseCard,
                    onTap: _cropping
                        ? null
                        : () =>
                              _selectFormat(_StudioPhotoCropFormat.browseCard),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
              child: Text(
                locale.t('profileForm.studioPhotoCropHint'),
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 14.sp,
                  height: 1.35,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CropEditorPane extends StatelessWidget {
  const _CropEditorPane({
    super.key,
    required this.format,
    required this.imageBytes,
    required this.controller,
    required this.aspectRatio,
    required this.screenBg,
    required this.cropRectFor,
    required this.onMoved,
    required this.onCropped,
    required this.onReady,
  });

  final _StudioPhotoCropFormat format;
  final Uint8List imageBytes;
  final CropController controller;
  final double aspectRatio;
  final Color screenBg;
  final Rect Function(Size viewport, double aspectRatio) cropRectFor;
  final void Function(
    _StudioPhotoCropFormat format,
    ViewportBasedRect viewportRect,
    ImageBasedRect imageRect,
  )
  onMoved;
  final void Function(_StudioPhotoCropFormat format, CropResult result) onCropped;
  final VoidCallback onReady;

  @override
  Widget build(BuildContext context) {
    return Crop(
      image: imageBytes,
      controller: controller,
      aspectRatio: aspectRatio,
      interactive: true,
      fixCropRect: true,
      baseColor: screenBg,
      maskColor: _cropMaskColor,
      radius: 0,
      onStatusChanged: (status) {
        if (status == CropStatus.ready) onReady();
      },
      onCropped: (result) => onCropped(format, result),
      onMoved: (viewportRect, imageRect) =>
          onMoved(format, viewportRect, imageRect),
      cornerDotBuilder: (_, _) => const SizedBox.shrink(),
      overlayBuilder: (context, rect) {
        return CustomPaint(
          painter: const _CropFramePainter(),
          child: const SizedBox.expand(),
        );
      },
      initialRectBuilder: InitialRectBuilder.withBuilder((
        viewportRect,
        imageRect,
      ) {
        return cropRectFor(
          Size(viewportRect.width, viewportRect.height),
          aspectRatio,
        );
      }),
    );
  }
}

class _CropFormatPreview extends StatelessWidget {
  const _CropFormatPreview({
    required this.label,
    required this.aspectRatio,
    required this.width,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final double aspectRatio;
  final double width;
  final bool isSelected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final height = width / aspectRatio;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: width,
                height: height,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(3),
                  border: Border.all(color: AppColors.neutral700, width: 1),
                  color: AppColors.neutral400,
                ),
                clipBehavior: Clip.antiAlias,
                child: isSelected
                    ? const Center(
                        child: Icon(Icons.check, size: 14, color: Colors.black),
                      )
                    : const SizedBox.shrink(),
              ),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12.sp,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                  color: isSelected
                      ? AppColors.primary500
                      : AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CropFramePainter extends CustomPainter {
  const _CropFramePainter();

  static const _frameColor = Colors.black;
  static const _frameWidth = 1.0;
  static const _tickLength = 14.0;
  static const _tickWidth = 2.0;

  @override
  void paint(Canvas canvas, Size size) {
    final framePaint = Paint()
      ..color = _frameColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = _frameWidth;

    final tickPaint = Paint()
      ..color = _frameColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = _tickWidth
      ..strokeCap = StrokeCap.square;

    final rect = Rect.fromLTWH(
      _frameWidth / 2,
      _frameWidth / 2,
      size.width - _frameWidth,
      size.height - _frameWidth,
    );
    canvas.drawRect(rect, framePaint);

    _drawCornerTicks(canvas, rect, tickPaint);
    _drawMidpointTicks(canvas, rect, tickPaint);
  }

  void _drawCornerTicks(Canvas canvas, Rect rect, Paint paint) {
    final left = rect.left;
    final top = rect.top;
    final right = rect.right;
    final bottom = rect.bottom;

    canvas.drawLine(Offset(left, top), Offset(left + _tickLength, top), paint);
    canvas.drawLine(Offset(left, top), Offset(left, top + _tickLength), paint);

    canvas.drawLine(
      Offset(right, top),
      Offset(right - _tickLength, top),
      paint,
    );
    canvas.drawLine(
      Offset(right, top),
      Offset(right, top + _tickLength),
      paint,
    );

    canvas.drawLine(
      Offset(left, bottom),
      Offset(left + _tickLength, bottom),
      paint,
    );
    canvas.drawLine(
      Offset(left, bottom),
      Offset(left, bottom - _tickLength),
      paint,
    );

    canvas.drawLine(
      Offset(right, bottom),
      Offset(right - _tickLength, bottom),
      paint,
    );
    canvas.drawLine(
      Offset(right, bottom),
      Offset(right, bottom - _tickLength),
      paint,
    );
  }

  void _drawMidpointTicks(Canvas canvas, Rect rect, Paint paint) {
    final cx = rect.center.dx;
    final cy = rect.center.dy;
    final half = _tickLength / 2;

    canvas.drawLine(
      Offset(cx - half, rect.top),
      Offset(cx + half, rect.top),
      paint,
    );
    canvas.drawLine(
      Offset(cx - half, rect.bottom),
      Offset(cx + half, rect.bottom),
      paint,
    );
    canvas.drawLine(
      Offset(rect.left, cy - half),
      Offset(rect.left, cy + half),
      paint,
    );
    canvas.drawLine(
      Offset(rect.right, cy - half),
      Offset(rect.right, cy + half),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _CropFramePainter oldDelegate) => false;
}
