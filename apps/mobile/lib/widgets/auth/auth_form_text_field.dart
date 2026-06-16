import 'package:flutter/material.dart';

import '../common/validated_text_field.dart';
import 'auth_form_styles.dart';

typedef AuthFieldDecorationBuilder = InputDecoration Function({
  required bool invalid,
});

/// Auth input with fixed height; validation text renders below the field.
class AuthFormTextField extends StatelessWidget {
  const AuthFormTextField({
    super.key,
    required this.controller,
    required this.decorationBuilder,
    required this.style,
    this.validator,
    this.keyboardType,
    this.textInputAction,
    this.obscureText = false,
    this.textCapitalization = TextCapitalization.none,
    this.onFieldSubmitted,
    this.onChanged,
  });

  final TextEditingController controller;
  final AuthFieldDecorationBuilder decorationBuilder;
  final TextStyle style;
  final String? Function(String?)? validator;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final bool obscureText;
  final TextCapitalization textCapitalization;
  final void Function(String)? onFieldSubmitted;
  final void Function(String)? onChanged;

  @override
  Widget build(BuildContext context) {
    return ValidatedTextField(
      controller: controller,
      decorationBuilder: decorationBuilder,
      style: style,
      validator: validator,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      obscureText: obscureText,
      textCapitalization: textCapitalization,
      fixedHeight: AuthFormStyles.fieldHeight,
      onFieldSubmitted: onFieldSubmitted,
      onChanged: onChanged,
    );
  }
}
