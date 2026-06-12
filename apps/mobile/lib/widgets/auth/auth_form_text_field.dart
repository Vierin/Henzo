import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

import '../../constants/colors.dart';
import 'auth_form_styles.dart';

typedef AuthFieldDecorationBuilder = InputDecoration Function({
  required bool invalid,
});

/// Auth input with fixed height; validation text renders below the field.
class AuthFormTextField extends StatefulWidget {
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
  State<AuthFormTextField> createState() => _AuthFormTextFieldState();
}

class _AuthFormTextFieldState extends State<AuthFormTextField> {
  @override
  Widget build(BuildContext context) {
    return FormField<String>(
      validator: (_) => widget.validator?.call(widget.controller.text),
      builder: (field) {
        final invalid = field.hasError;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              height: AuthFormStyles.fieldHeight,
              child: TextField(
                controller: widget.controller,
                style: widget.style,
                keyboardType: widget.keyboardType,
                textInputAction: widget.textInputAction,
                obscureText: widget.obscureText,
                textCapitalization: widget.textCapitalization,
                onSubmitted: widget.onFieldSubmitted,
                onChanged: (value) {
                  field.didChange(value);
                  widget.onChanged?.call(value);
                  if (field.hasError) {
                    field.validate();
                  }
                },
                decoration: widget.decorationBuilder(invalid: invalid),
              ),
            ),
            if (invalid && field.errorText != null)
              Padding(
                padding: const EdgeInsets.only(top: 4, left: 2),
                child: Text(
                  field.errorText!,
                  style: TextStyle(
                    fontSize: 12.sp,
                    height: 1.2,
                    color: AppColors.error600,
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
