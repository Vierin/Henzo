import 'studio_photo_asset.dart';
import 'studio_status.dart';
import '../utils/studio_photo_urls.dart';

class Studio {
  final String id;
  final String? name;
  final String? description;
  final String? address;
  final String? phone;
  final String? email;
  final String? website;
  final String? instagram;
  final String? logoUrl;
  final List<String>? photos;
  final List<StudioPhotoAsset>? photoGallery;
  final Map<String, dynamic>? workingHours;
  final Map<String, dynamic>? reminderSettings;
  final String? slug;
  final StudioStatus status;
  final bool? autoConfirmBookings;
  final double? latitude;
  final double? longitude;
  final double? rating;
  final DateTime? createdAt;
  final String currency;

  Studio({
    required this.id,
    this.name,
    this.description,
    this.address,
    this.phone,
    this.email,
    this.website,
    this.instagram,
    this.logoUrl,
    this.photos,
    this.photoGallery,
    this.workingHours,
    this.reminderSettings,
    this.slug,
    this.status = StudioStatus.draft,
    this.autoConfirmBookings,
    this.latitude,
    this.longitude,
    this.rating,
    this.createdAt,
    this.currency = 'EUR',
  });

  factory Studio.fromJson(Map<String, dynamic> json) {
    final id = json['id'];
    if (id == null) throw ArgumentError('Studio id is required');
    List<String>? photosList;
    final p = json['photos'];
    if (p is List) {
      photosList = p
          .map((e) => e?.toString() ?? '')
          .where((s) => s.isNotEmpty)
          .toList();
    }
    final gallery = studioPhotoGalleryFromPayload(
      photoGallery: json['photoGallery'],
      photos: photosList,
    );
    if (photosList == null || photosList.isEmpty) {
      photosList = studioHeroPhotoUrls(gallery: gallery);
    }
    Map<String, dynamic>? wh;
    final whRaw = json['workingHours'];
    if (whRaw is Map) {
      wh = Map<String, dynamic>.from(whRaw);
    }
    Map<String, dynamic>? rs;
    final rsRaw = json['reminderSettings'];
    if (rsRaw is Map) {
      rs = Map<String, dynamic>.from(rsRaw);
    }
    double? lat;
    final latVal = json['latitude'];
    if (latVal != null) {
      lat = (latVal is num)
          ? latVal.toDouble()
          : double.tryParse(latVal.toString());
    }
    double? lon;
    final lonVal = json['longitude'];
    if (lonVal != null) {
      lon = (lonVal is num)
          ? lonVal.toDouble()
          : double.tryParse(lonVal.toString());
    }
    double? rating;
    final ratingVal = json['rating'];
    if (ratingVal != null) {
      rating = (ratingVal is num)
          ? ratingVal.toDouble()
          : double.tryParse(ratingVal.toString());
    }
    return Studio(
      id: id.toString(),
      name: json['name'] as String?,
      description: json['description'] as String?,
      address: json['address'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      website: json['website'] as String?,
      instagram: json['instagram'] as String?,
      logoUrl: json['logoUrl'] as String?,
      photos: photosList,
      photoGallery: gallery.isEmpty ? null : gallery,
      workingHours: wh,
      reminderSettings: rs,
      slug: json['slug'] as String?,
      status: StudioStatus.parse(json['status']?.toString()),
      autoConfirmBookings: json['autoConfirmBookings'] as bool?,
      latitude: lat,
      longitude: lon,
      rating: rating,
      createdAt: DateTime.tryParse((json['createdAt'] ?? '').toString()),
      currency: (json['currency'] as String?)?.trim().toUpperCase() ?? 'EUR',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'address': address,
      'phone': phone,
      'email': email,
      'website': website,
      'instagram': instagram,
      'logoUrl': logoUrl,
      'photos': photos,
      if (photoGallery != null)
        'photoGallery': photoGallery!.map((asset) => asset.toJson()).toList(),
      'workingHours': workingHours,
      'reminderSettings': reminderSettings,
      'slug': slug,
      'status': status.name.toUpperCase(),
      'autoConfirmBookings': autoConfirmBookings,
      'latitude': latitude,
      'longitude': longitude,
      'rating': rating,
      'currency': currency,
    };
  }

  Map<String, dynamic> toUpdatePayload() {
    return {
      if (name != null) 'name': name,
      if (autoConfirmBookings != null)
        'autoConfirmBookings': autoConfirmBookings,
      if (description != null) 'description': description,
      if (address != null) 'address': address,
      if (phone != null) 'phone': phone,
      if (email != null) 'email': email,
      if (website != null) 'website': website,
      if (instagram != null) 'instagram': instagram,
      if (logoUrl != null) 'logoUrl': logoUrl,
      if (photos != null) 'photos': photos,
      if (photoGallery != null)
        'photoGallery': photoGallery!.map((asset) => asset.toJson()).toList(),
      if (workingHours != null) 'workingHours': workingHours,
      if (reminderSettings != null) 'reminderSettings': reminderSettings,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      'currency': currency,
    };
  }
}
