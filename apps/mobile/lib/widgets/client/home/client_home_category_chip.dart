import 'package:flutter/material.dart';

import '../../../models/training_category_option.dart';
import '../../training/training_category_color_chip.dart';

class ClientHomeCategoryChip extends StatelessWidget {
  const ClientHomeCategoryChip({
    super.key,
    required this.category,
    required this.label,
    required this.onTap,
    this.selected = false,
  });

  final TrainingCategoryOption category;
  final String label;
  final VoidCallback onTap;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    return TrainingCategoryColorChip(
      category: category,
      label: label,
      selected: selected,
      onTap: onTap,
    );
  }
}
