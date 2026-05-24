/// Picks localized studio description (matches web public studio page).
String resolveStudioDescription(
  Map<String, dynamic> studio,
  String localeCode,
) {
  final loc = localeCode.toLowerCase();
  if (loc.startsWith('ru')) {
    final ru = studio['descriptionRu']?.toString().trim();
    if (ru != null && ru.isNotEmpty) return ru;
  }
  if (loc.startsWith('vi')) {
    final vi = studio['descriptionVi']?.toString().trim();
    if (vi != null && vi.isNotEmpty) return vi;
  }
  final en = studio['descriptionEn']?.toString().trim();
  if (en != null && en.isNotEmpty) return en;
  return studio['description']?.toString() ?? '';
}
