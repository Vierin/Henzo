import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';

/// Styled OSM / OpenFreeMap attribution popup for [FlutterMap].
class HenzoMapAttributionWidget extends StatefulWidget {
  const HenzoMapAttributionWidget({
    super.key,
    this.alignment = AttributionAlignment.bottomRight,
  });

  final AttributionAlignment alignment;

  @override
  State<HenzoMapAttributionWidget> createState() =>
      _HenzoMapAttributionWidgetState();
}

class _HenzoMapAttributionWidgetState
    extends State<HenzoMapAttributionWidget> {
  bool _isOpen = false;
  StreamSubscription<MapEvent>? _mapEventsSub;

  static const _entries = [
    _AttributionEntry(
      label: 'OpenStreetMap contributors',
      uri: 'https://www.openstreetmap.org/copyright',
    ),
    _AttributionEntry(
      label: 'OpenMapTiles',
      uri: 'https://openmaptiles.org/',
    ),
    _AttributionEntry(
      label: 'OpenFreeMap',
      uri: 'https://openfreemap.org/',
    ),
  ];

  CrossAxisAlignment get _columnCrossAxisAlignment =>
      widget.alignment == AttributionAlignment.bottomRight
      ? CrossAxisAlignment.end
      : CrossAxisAlignment.start;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _mapEventsSub =
          MapController.of(context).mapEventStream.listen((event) {
        if (event is MapEventMove && _isOpen) {
          setState(() => _isOpen = false);
        }
      });
    });
  }

  @override
  void dispose() {
    _mapEventsSub?.cancel();
    super.dispose();
  }

  void _toggle() => setState(() => _isOpen = !_isOpen);

  void _close() => setState(() => _isOpen = false);

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    if (!await canLaunchUrl(uri)) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final title = context.watch<LocaleProvider>().t('mapAttribution.title');

    final toggle = _AttributionToggleButton(
      isOpen: _isOpen,
      onPressed: _toggle,
    );

    final panel = AnimatedSize(
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOutCubic,
      alignment: Alignment.bottomCenter,
      child: _isOpen
          ? Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _AttributionPanel(
                title: title,
                entries: _entries,
                onClose: _close,
                onLinkTap: _openUrl,
              ),
            )
          : const SizedBox.shrink(),
    );

    return SafeArea(
      child: Align(
        alignment: widget.alignment.real,
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: _columnCrossAxisAlignment,
            children: [panel, toggle],
          ),
        ),
      ),
    );
  }
}

class _AttributionEntry {
  const _AttributionEntry({required this.label, required this.uri});

  final String label;
  final String uri;
}

class _AttributionPanel extends StatelessWidget {
  const _AttributionPanel({
    required this.title,
    required this.entries,
    required this.onClose,
    required this.onLinkTap,
  });

  final String title;
  final List<_AttributionEntry> entries;
  final VoidCallback onClose;
  final ValueChanged<String> onLinkTap;

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: BoxConstraints(maxWidth: 260.w),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: AppColors.backgroundPrimary,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.borderPrimary),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary500.withValues(alpha: 0.12),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 6, 10),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: TextStyle(
                        fontSize: 12.sp,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                        letterSpacing: 0.2,
                      ),
                    ),
                  ),
                  _CloseButton(onPressed: onClose),
                ],
              ),
              SizedBox(height: 8.h),
              const Divider(height: 1, color: AppColors.borderPrimary),
              SizedBox(height: 8.h),
              for (var i = 0; i < entries.length; i++) ...[
                if (i > 0) SizedBox(height: 4.h),
                _AttributionLinkRow(
                  label: '© ${entries[i].label}',
                  onTap: () => onLinkTap(entries[i].uri),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _CloseButton extends StatelessWidget {
  const _CloseButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onPressed,
        child: Padding(
          padding: const EdgeInsets.all(4),
          child: Icon(
            Icons.close_rounded,
            size: 18,
            color: AppColors.textTertiary,
          ),
        ),
      ),
    );
  }
}

class _AttributionToggleButton extends StatelessWidget {
  const _AttributionToggleButton({
    required this.isOpen,
    required this.onPressed,
  });

  final bool isOpen;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.borderPrimary),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary500.withValues(alpha: 0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: onPressed,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  isOpen
                      ? Icons.close_rounded
                      : Icons.info_outline_rounded,
                  size: 16,
                  color: AppColors.textSecondary,
                ),
                if (!isOpen) ...[
                  SizedBox(width: 4.w),
                  Text(
                    '©',
                    style: TextStyle(
                      fontSize: 11.sp,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textTertiary,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _AttributionLinkRow extends StatelessWidget {
  const _AttributionLinkRow({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 13.sp,
                    fontWeight: FontWeight.w500,
                    color: AppColors.primary500,
                    decoration: TextDecoration.underline,
                    decorationColor: AppColors.primary500.withValues(
                      alpha: 0.45,
                    ),
                  ),
                ),
              ),
              Icon(
                Icons.open_in_new_rounded,
                size: 14,
                color: AppColors.textTertiary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
