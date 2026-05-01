/// Тренировка студии для экрана «Сервисы» (legacy имя класса ServiceItem).
class ServiceItem {
  final String id;
  final String name;
  final String? description;
  final String? nameEn;
  final String? nameVi;
  final String? nameRu;
  final double? price;
  final int? duration;
  final String? salonId;
  /// Id категории тренировки (канонично).
  final int? trainingCategoryId;
  /// @deprecated см. trainingCategoryId
  final int? serviceCategoryId;
  /// Название категории для тега.
  final String? categoryName;
  final String? displayColor;

  ServiceItem({
    required this.id,
    required this.name,
    this.description,
    this.nameEn,
    this.nameVi,
    this.nameRu,
    this.price,
    this.duration,
    this.salonId,
    this.trainingCategoryId,
    this.serviceCategoryId,
    this.categoryName,
    this.displayColor,
  });

  String get displayName => name;

  static double? _parseDouble(dynamic v) {
    if (v == null) return null;
    if (v is num) return v.toDouble();
    if (v is String) return double.tryParse(v);
    return null;
  }

  static int? _parseInt(dynamic v) {
    if (v == null) return null;
    if (v is int) return v;
    if (v is num) return v.toInt();
    if (v is String) return int.tryParse(v);
    return null;
  }

  List<String> get tagNames {
    final list = <String>[];
    if (categoryName != null && categoryName!.isNotEmpty) list.add(categoryName!);
    return list;
  }

  static String? _categoryLabelFromMap(Map<dynamic, dynamic> m) {
    final nameRu = m['name_ru'] ?? m['nameRu'];
    final nameEn = m['name_en'] ?? m['nameEn'];
    final nameVn = m['name_vn'] ?? m['nameVn'];
    if (nameRu is String && nameRu.isNotEmpty) return nameRu;
    if (nameEn is String && nameEn.isNotEmpty) return nameEn;
    if (nameVn is String && nameVn.isNotEmpty) return nameVn;
    return null;
  }

  factory ServiceItem.fromJson(Map<String, dynamic> json) {
    final idRaw = json['id'];
    final id = (idRaw == null ? '' : idRaw.toString()).trim();
    final name = (json['name'] as String?) ??
        (json['nameEn'] as String?) ??
        (json['nameVi'] as String?) ??
        (json['nameRu'] as String?) ??
        '';

    final trainingCatId =
        _parseInt(json['trainingCategoryId']) ?? _parseInt(json['serviceCategoryId']);

    String? categoryName;
    dynamic cat = json['trainingCategory'];
    if (cat is! Map) cat = json['service_categories'];
    if (cat is Map) categoryName = _categoryLabelFromMap(cat);

    return ServiceItem(
      id: id,
      name: name,
      description: json['description'] as String?,
      nameEn: json['nameEn'] as String?,
      nameVi: json['nameVi'] as String?,
      nameRu: json['nameRu'] as String?,
      price: _parseDouble(json['price']),
      duration: _parseInt(json['duration']),
      salonId: (json['studioId'] ?? json['salonId']) as String?,
      trainingCategoryId: trainingCatId,
      serviceCategoryId: _parseInt(json['serviceCategoryId']) ?? trainingCatId,
      categoryName: categoryName,
      displayColor: json['displayColor']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'nameEn': nameEn,
      'nameVi': nameVi,
      'nameRu': nameRu,
      'price': price,
      'duration': duration,
      'studioId': salonId,
      'trainingCategoryId': trainingCategoryId,
      'serviceCategoryId': serviceCategoryId,
      'categoryName': categoryName,
      'displayColor': displayColor,
    };
  }
}
