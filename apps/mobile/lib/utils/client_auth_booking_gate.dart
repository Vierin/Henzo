import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import '../screens/client_registration_screen.dart';
import '../screens/login_screen.dart';
import 'auth_entry_prefs.dart';

/// Soft gate: keep studio/class visible; ask for auth only on book.
Future<void> showClientAuthGateForBooking(
  BuildContext context, {
  required Future<void> Function() persistShareIntent,
}) async {
  await persistShareIntent();
  if (!context.mounted) return;

  final locale = context.read<LocaleProvider>();
  final choice = await showModalBottomSheet<String>(
    context: context,
    showDragHandle: true,
    builder: (ctx) {
      return SafeArea(
        child: Padding(
          padding: EdgeInsets.fromLTRB(20.w, 8.h, 20.w, 20.h),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                locale.t('clientClassDetail.authGateTitle'),
                style: TextStyle(
                  fontSize: 18.sp,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              SizedBox(height: 8.h),
              Text(
                locale.t('clientClassDetail.authGateBody'),
                style: TextStyle(
                  fontSize: 14.sp,
                  height: 1.4,
                  color: Colors.grey.shade700,
                ),
              ),
              SizedBox(height: 20.h),
              FilledButton(
                onPressed: () => Navigator.of(ctx).pop('login'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary500,
                  minimumSize: Size.fromHeight(48.h),
                ),
                child: Text(locale.t('auth.signIn')),
              ),
              SizedBox(height: 10.h),
              OutlinedButton(
                onPressed: () => Navigator.of(ctx).pop('register'),
                style: OutlinedButton.styleFrom(
                  minimumSize: Size.fromHeight(48.h),
                ),
                child: Text(locale.t('clientClassDetail.createClientAccount')),
              ),
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: Text(locale.t('common.cancel')),
              ),
            ],
          ),
        ),
      );
    },
  );

  if (!context.mounted || choice == null) return;

  await AuthEntryPrefs.markCompleted();
  if (!context.mounted) return;

  final nav = Navigator.of(context, rootNavigator: true);
  if (choice == 'login') {
    await nav.push(
      MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
    );
  } else if (choice == 'register') {
    await nav.push(
      MaterialPageRoute<void>(
        builder: (_) => const ClientRegistrationScreen(),
      ),
    );
  }
}
