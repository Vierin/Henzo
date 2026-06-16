import 'package:flutter/material.dart';

import '../common/validated_text_field.dart';
import 'settings_form_tokens.dart';

/// Settings-style input with inline validation (bottom sheets, modals).
class SettingsValidatedTextField extends StatelessWidget {
  const SettingsValidatedTextField({
    super.key,
    required this.controller,
    required this.hintText,
    required this.validator,
    this.enabled = true,
    this.keyboardType,
    this.textCapitalization = TextCapitalization.none,
    this.onChanged,
  });

  final TextEditingController controller;
  final String hintText;
  final String? Function(String) validator;
  final bool enabled;
  final TextInputType? keyboardType;
  final TextCapitalization textCapitalization;
  final void Function(String)? onChanged;

  @override
  Widget build(BuildContext context) {
    return ValidatedTextField(
      controller: controller,
      enabled: enabled,
      keyboardType: keyboardType,
      textCapitalization: textCapitalization,
      onChanged: onChanged,
      decorationBuilder: ({required invalid}) => settingsInputDecoration(
        hintText: hintText,
        invalid: invalid,
      ),
      validator: (value) => validator(value ?? ''),
    );
  }
}
