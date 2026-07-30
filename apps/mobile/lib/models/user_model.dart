class UserModel {
  final String id;
  final String email;
  final String? name;
  final String? phone;
  final String? avatarUrl;
  final String? city;
  final String? country;
  final String role;

  const UserModel({
    required this.id,
    required this.email,
    this.name,
    this.phone,
    this.avatarUrl,
    this.city,
    this.country,
    required this.role,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String?,
      phone: json['phone'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      city: json['city'] as String?,
      country: json['country'] as String?,
      role: json['role'] as String,
    );
  }
}
