import 'salon.dart';

/// Studio venue for add-training (default salon + optional extras in reminderSettings).
class TrainingLocationItem {
  const TrainingLocationItem({
    required this.id,
    required this.name,
    required this.address,
    this.isDefault = false,
    this.latitude,
    this.longitude,
  });

  final String id;
  final String name;
  final String address;
  final bool isDefault;
  final double? latitude;
  final double? longitude;

  static const defaultLocationNameKey = 'defaultLocationName';

  static String? readDefaultLocationName(Salon? salon) {
    final raw = salon?.reminderSettings?[defaultLocationNameKey];
    if (raw is String && raw.trim().isNotEmpty) return raw.trim();
    return null;
  }

  static void writeDefaultLocationName(
    Map<String, dynamic> reminderSettings,
    String? name,
  ) {
    final trimmed = name?.trim();
    if (trimmed != null && trimmed.isNotEmpty) {
      reminderSettings[defaultLocationNameKey] = trimmed;
    } else {
      reminderSettings.remove(defaultLocationNameKey);
    }
  }

  factory TrainingLocationItem.defaultFromSalon(
    Salon salon, {
    required String mainStudioName,
  }) {
    final storedName = readDefaultLocationName(salon);
    return TrainingLocationItem(
      id: 'default',
      name: storedName ?? mainStudioName,
      address: salon.address?.trim() ?? '',
      isDefault: true,
      latitude: salon.latitude,
      longitude: salon.longitude,
    );
  }

  factory TrainingLocationItem.fromJson(Map<String, dynamic> json) {
    final lat = json['latitude'];
    final lon = json['longitude'];
    return TrainingLocationItem(
      id: (json['id'] as String?)?.trim() ??
          'loc_${DateTime.now().millisecondsSinceEpoch}',
      name: (json['name'] as String?)?.trim() ?? '',
      address: (json['address'] as String?)?.trim() ?? '',
      isDefault: json['isDefault'] as bool? ?? false,
      latitude: lat is num ? lat.toDouble() : double.tryParse('$lat'),
      longitude: lon is num ? lon.toDouble() : double.tryParse('$lon'),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'address': address,
    'isDefault': isDefault,
    if (latitude != null) 'latitude': latitude,
    if (longitude != null) 'longitude': longitude,
  };

  static List<TrainingLocationItem> listFromSalon(
    Salon? salon, {
    required String mainStudioName,
  }) {
    if (salon == null) return [];
    final items = <TrainingLocationItem>[
      TrainingLocationItem.defaultFromSalon(
        salon,
        mainStudioName: mainStudioName,
      ),
    ];
    final raw = salon.reminderSettings?['trainingLocations'];
    if (raw is List) {
      for (final entry in raw) {
        if (entry is! Map) continue;
        final map = Map<String, dynamic>.from(entry);
        final parsed = TrainingLocationItem.fromJson(map);
        if (parsed.id == 'default' || parsed.address.isEmpty) continue;
        items.add(parsed);
      }
    }
    return items;
  }

  static List<Map<String, dynamic>> extraLocationsToJson(
    List<TrainingLocationItem> all,
  ) {
    return all
        .where((l) => !l.isDefault && l.address.isNotEmpty)
        .map((l) => l.toJson())
        .toList();
  }
}
