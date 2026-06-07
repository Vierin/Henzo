import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Логотип и подпись при загрузке рабочего пространства владельца.
class WorkspaceLoadingView extends StatelessWidget {
  const WorkspaceLoadingView({super.key});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.backgroundPrimary,
      child: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Image.asset(
                'assets/logo.png',
                height: 80,
                width: 160,
                fit: BoxFit.contain,
                errorBuilder: (_, _, _) => Icon(
                  Icons.store,
                  size: 80,
                  color: AppColors.primary500,
                ),
              ),
              const SizedBox(height: 24),
              Consumer<LocaleProvider>(
                builder: (context, loc, _) => Text(
                  loc.t('shell.loadingWorkspace'),
                  style: TextStyle(
                    fontSize: 14.sp,
                    color: AppColors.textSecondary,
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
