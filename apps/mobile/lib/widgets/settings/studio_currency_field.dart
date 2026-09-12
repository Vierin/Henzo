import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../utils/currency_format.dart';
import '../common/henzo_modal.dart';
import 'settings_form_tokens.dart';

Future<String?> showStudioCurrencyPickerSheet(
  BuildContext context, {
  required String selectedCurrency,
}) {
  final current = parseStudioCurrency(selectedCurrency);
  final locale = context.read<LocaleProvider>();

  return showHenzoModalBottomSheet<String>(
    context: context,
    backgroundColor: AppColors.backgroundPrimary,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (sheetContext) {
      return SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: AppColors.borderPrimary,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(bottom: 12, left: 4),
                child: Text(
                  locale.t('profileForm.chooseCurrency'),
                  style: TextStyle(
                    fontSize: 18.sp,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              for (final opt in studioCurrencyOptions)
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () => Navigator.of(sheetContext).pop(opt.code),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 14,
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: opt.code == current
                                  ? AppColors.primary50
                                  : AppColors.backgroundSecondary,
                              shape: BoxShape.circle,
                            ),
                            child: Text(
                              opt.symbol,
                              style: TextStyle(
                                fontSize: 16.sp,
                                fontWeight: FontWeight.w700,
                                color: opt.code == current
                                    ? AppColors.primary500
                                    : AppColors.textPrimary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  opt.name,
                                  style: TextStyle(
                                    fontSize: 15.sp,
                                    fontWeight: opt.code == current
                                        ? FontWeight.w700
                                        : FontWeight.w500,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  opt.code,
                                  style: TextStyle(
                                    fontSize: 13.sp,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (opt.code == current)
                            const Icon(
                              CupertinoIcons.checkmark_alt,
                              color: AppColors.primary500,
                              size: 22,
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      );
    },
  );
}

class StudioCurrencyField extends StatelessWidget {
  const StudioCurrencyField({
    super.key,
    required this.selectedCurrency,
    required this.onChanged,
  });

  final String selectedCurrency;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final currentCode = parseStudioCurrency(selectedCurrency);
    final option = studioCurrencyOptions.firstWhere(
      (o) => o.code == currentCode,
      orElse: () => studioCurrencyOptions.first,
    );

    return Material(
      color: AppColors.backgroundPrimary,
      borderRadius: settingsInputBorderRadius(maxLines: 1),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        borderRadius: settingsInputBorderRadius(maxLines: 1),
        onTap: () async {
          final chosen = await showStudioCurrencyPickerSheet(
            context,
            selectedCurrency: currentCode,
          );
          if (chosen != null && chosen != currentCode) {
            onChanged(chosen);
          }
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          child: Row(
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 1),
                child: SvgPicture.asset(
                  'assets/icons/icon-card.svg',
                  width: 17,
                  height: 17,
                  colorFilter: const ColorFilter.mode(
                    AppColors.textSecondary,
                    BlendMode.srcIn,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      locale.t('profileForm.currency'),
                      style: TextStyle(
                        fontSize: 12.sp,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textTertiary,
                        height: 1.1,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      option.label,
                      style: TextStyle(
                        fontSize: 15.sp,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                        height: 1.2,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                CupertinoIcons.chevron_down,
                size: 16,
                color: AppColors.textTertiary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
