/// Row from GET /trainings/categories (TrainingCategory).
class TrainingCategoryOption {
  const TrainingCategoryOption({
    required this.id,
    required this.nameEn,
    required this.nameRu,
    required this.nameVn,
  });

  final int id;
  final String nameEn;
  final String nameRu;
  final String nameVn;

  String label(String localeCode) {
    switch (localeCode) {
      case 'vi':
        return nameVn.isNotEmpty ? nameVn : nameEn;
      case 'ru':
        return nameRu.isNotEmpty ? nameRu : nameEn;
      default:
        return nameEn.isNotEmpty ? nameEn : nameRu;
    }
  }

  factory TrainingCategoryOption.fromJson(Map<String, dynamic> json) {
    return TrainingCategoryOption(
      id: (json['id'] as num).toInt(),
      nameEn: (json['name_en'] ?? '').toString(),
      nameRu: (json['name_ru'] ?? '').toString(),
      nameVn: (json['name_vn'] ?? '').toString(),
    );
  }
}
