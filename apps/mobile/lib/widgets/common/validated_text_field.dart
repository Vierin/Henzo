import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

import '../../constants/colors.dart';

typedef ValidatedFieldDecorationBuilder = InputDecoration Function({
  required bool invalid,
});

/// TextField wrapped in [FormField] with error text rendered below the input.
class ValidatedTextField extends StatelessWidget {
  const ValidatedTextField({
    super.key,
    required this.controller,
    required this.decorationBuilder,
    this.style,
    this.validator,
    this.keyboardType,
    this.textInputAction,
    this.obscureText = false,
    this.textCapitalization = TextCapitalization.none,
    this.enabled = true,
    this.fixedHeight,
    this.onFieldSubmitted,
    this.onChanged,
  });

  final TextEditingController controller;
  final ValidatedFieldDecorationBuilder decorationBuilder;
  final TextStyle? style;
  final String? Function(String?)? validator;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final bool obscureText;
  final TextCapitalization textCapitalization;
  final bool enabled;
  final double? fixedHeight;
  final void Function(String)? onFieldSubmitted;
  final void Function(String)? onChanged;

  @override
  Widget build(BuildContext context) {
    return FormField<String>(
      validator: (_) => validator?.call(controller.text),
      builder: (field) {
        final invalid = field.hasError;
        final input = TextField(
          controller: controller,
          style: style,
          enabled: enabled,
          keyboardType: keyboardType,
          textInputAction: textInputAction,
          obscureText: obscureText,
          textCapitalization: textCapitalization,
          onSubmitted: onFieldSubmitted,
          onChanged: (value) {
            field.didChange(value);
            onChanged?.call(value);
            if (field.hasError) {
              field.validate();
            }
          },
          decoration: decorationBuilder(invalid: invalid),
        );

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (fixedHeight != null)
              SizedBox(height: fixedHeight, child: input)
            else
              input,
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
