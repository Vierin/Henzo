import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

import '../../constants/colors.dart';

enum HenzoSnackBarVariant { success, error, warning }

void showHenzaSnackBar(
  BuildContext context, {
  required HenzoSnackBarVariant variant,
  required String message,
  String? detail,
  Duration duration = const Duration(seconds: 4),
}) {
  if (!context.mounted) return;
  final messenger = ScaffoldMessenger.maybeOf(context);
  if (messenger == null) return;

  messenger.clearSnackBars();
  messenger.showSnackBar(
    SnackBar(
      behavior: SnackBarBehavior.floating,
      backgroundColor: Colors.transparent,
      elevation: 0,
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      duration: duration,
      content: _HenzaSnackBarBody(
        variant: variant,
        message: message,
        detail: detail,
      ),
    ),
  );
}

class _HenzaSnackBarBody extends StatelessWidget {
  const _HenzaSnackBarBody({
    required this.variant,
    required this.message,
    this.detail,
  });

  final HenzoSnackBarVariant variant;
  final String message;
  final String? detail;

  ({Color bg, Color fg, IconData icon}) get _palette => switch (variant) {
        HenzoSnackBarVariant.success => (
            bg: AppColors.success50,
            fg: AppColors.success600,
            icon: Icons.check_rounded,
          ),
        HenzoSnackBarVariant.error => (
            bg: AppColors.error50,
            fg: AppColors.error600,
            icon: Icons.close_rounded,
          ),
        HenzoSnackBarVariant.warning => (
            bg: AppColors.warning50,
            fg: AppColors.warning700,
            icon: Icons.info_outline_rounded,
          ),
      };

  @override
  Widget build(BuildContext context) {
    final colors = _palette;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderPrimary),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary500.withValues(alpha: 0.1),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: colors.bg,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: Icon(colors.icon, size: 18, color: colors.fg),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    message,
                    style: TextStyle(
                      fontSize: 14.sp,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                      height: 1.25,
                    ),
                  ),
                  if (detail != null && detail!.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      detail!,
                      style: TextStyle(
                        fontSize: 12.sp,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                        height: 1.3,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
