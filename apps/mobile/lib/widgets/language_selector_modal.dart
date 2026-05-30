import 'package:flutter/material.dart';
import 'common/henzo_modal.dart';
import 'package:provider/provider.dart';

import '../constants/colors.dart';
import '../l10n/app_locales.dart';
import '../l10n/locale_provider.dart';

/// Shared language picker: bottom sheet with flags, radios, and Cancel.
/// Optional [onLocaleSelected] (e.g. to re-register push token after change).
void showLanguageSelectorModal(
  BuildContext context,
  LocaleProvider locale, {
  void Function(String code)? onLocaleSelected,
}) {
  showHenzoModalBottomSheet<void>(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (sheetCtx) => _LanguageBottomSheet(
      onLocaleSelected: onLocaleSelected,
    ),
  );
}

const Map<String, String> _languageLabels = {
  'en': 'English',
  'ru': 'Русский',
  'vi': 'Tiếng Việt',
};

const Map<String, String> _languageFlags = {
  'en': '🇺🇸',
  'ru': '🇷🇺',
  'vi': '🇻🇳',
};

class _LanguageBottomSheet extends StatelessWidget {
  const _LanguageBottomSheet({this.onLocaleSelected});

  final void Function(String code)? onLocaleSelected;

  Future<void> _select(
    BuildContext context,
    LocaleProvider loc,
    String code,
  ) async {
    if (loc.localeCode != code) {
      await loc.setLocale(code);
      onLocaleSelected?.call(code);
    }
    if (context.mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<LocaleProvider>(
      builder: (context, loc, _) {
        final bottomInset = MediaQuery.paddingOf(context).bottom;
        return Padding(
          padding: EdgeInsets.only(bottom: bottomInset),
          child: DecoratedBox(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(height: 10),
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: AppColors.neutral300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    loc.t('settings.chooseLanguage'),
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  for (var i = 0; i < supportedLocaleCodes.length; i++) ...[
                    if (i > 0)
                      Divider(
                        height: 1,
                        thickness: 1,
                        color: AppColors.neutral200,
                      ),
                    _LanguageRow(
                      code: supportedLocaleCodes[i],
                      label: _languageLabels[supportedLocaleCodes[i]] ??
                          supportedLocaleCodes[i],
                      flag: _languageFlags[supportedLocaleCodes[i]] ?? '',
                      groupValue: loc.localeCode,
                      onSelect: () => _select(context, loc, supportedLocaleCodes[i]),
                    ),
                  ],
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
                    child: SizedBox(
                      width: double.infinity,
                      child: TextButton(
                        style: TextButton.styleFrom(
                          backgroundColor: AppColors.primary50,
                          foregroundColor: AppColors.primary500,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: () => Navigator.of(context).pop(),
                        child: Text(loc.t('common.cancel')),
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
}

class _LanguageRow extends StatelessWidget {
  const _LanguageRow({
    required this.code,
    required this.label,
    required this.flag,
    required this.groupValue,
    required this.onSelect,
  });

  final String code;
  final String label;
  final String flag;
  final String groupValue;
  final VoidCallback onSelect;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onSelect,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          child: Row(
            children: [
              Text(flag, style: const TextStyle(fontSize: 22)),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              _LanguageRadioDot(selected: code == groupValue),
            ],
          ),
        ),
      ),
    );
  }
}

/// Brand purple selection dot (#4D39A8).
class _LanguageRadioDot extends StatelessWidget {
  const _LanguageRadioDot({required this.selected});

  final bool selected;

  @override
  Widget build(BuildContext context) {
    const accent = Color(0xFF4D39A8);
    return Container(
      width: 22,
      height: 22,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: accent, width: 2),
        color: selected ? accent : Colors.transparent,
      ),
      alignment: Alignment.center,
      child: selected
          ? Container(
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white,
              ),
            )
          : null,
    );
  }
}
