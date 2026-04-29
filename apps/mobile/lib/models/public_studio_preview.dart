class PublicStudioPreview {
  const PublicStudioPreview({
    required this.id,
    required this.name,
    required this.categories,
    required this.rating,
    required this.address,
    this.distanceKm,
    this.photoUrl,
  });

  final String id;
  final String name;
  final List<String> categories;
  final double rating;
  final String address;
  final double? distanceKm;
  final String? photoUrl;

  String get primaryCategory => categories.isNotEmpty ? categories.first : 'Fitness';
}
