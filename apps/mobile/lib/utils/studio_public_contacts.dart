import 'package:url_launcher/url_launcher.dart';

import '../widgets/settings/studio_social_link.dart';

enum StudioPublicContactKind {
  phone,
  email,
  instagram,
  telegram,
  youtube,
  whatsApp,
  website,
  facebook,
  tiktok,
}

class StudioPublicContact {
  const StudioPublicContact({
    required this.kind,
    required this.value,
  });

  final StudioPublicContactKind kind;
  final String value;
}

/// Ordered contact chips for client studio profile (mock layout).
List<StudioPublicContact> studioPublicContactsFromMap(
  Map<String, dynamic> studio,
) {
  final out = <StudioPublicContact>[];

  final phone = (studio['phone'] ?? '').toString().trim();
  if (phone.isNotEmpty) {
    out.add(StudioPublicContact(kind: StudioPublicContactKind.phone, value: phone));
  }

  final email = (studio['email'] ?? '').toString().trim();
  if (email.isNotEmpty) {
    out.add(StudioPublicContact(kind: StudioPublicContactKind.email, value: email));
  }

  final instagram = (studio['instagram'] ?? '').toString().trim();
  if (instagram.isNotEmpty) {
    out.add(
      StudioPublicContact(
        kind: StudioPublicContactKind.instagram,
        value: instagram,
      ),
    );
  }

  final website = (studio['website'] ?? '').toString().trim();
  if (website.isNotEmpty) {
    final isFacebook = RegExp(
      r'facebook\.com|fb\.com|fb\.me',
      caseSensitive: false,
    ).hasMatch(website);
    out.add(
      StudioPublicContact(
        kind: isFacebook
            ? StudioPublicContactKind.facebook
            : StudioPublicContactKind.website,
        value: website,
      ),
    );
  }

  final reminder = studio['reminderSettings'];
  final extras = reminder is Map ? reminder['socialLinks'] : null;
  if (extras is List) {
    for (final item in extras) {
      if (item is! Map) continue;
      final platform = StudioSocialPlatform.fromId(
        item['platform']?.toString(),
      );
      final value = item['value']?.toString().trim() ?? '';
      if (platform == null || value.isEmpty) continue;
      final kind = switch (platform) {
        StudioSocialPlatform.telegram => StudioPublicContactKind.telegram,
        StudioSocialPlatform.youtube => StudioPublicContactKind.youtube,
        StudioSocialPlatform.whatsApp => StudioPublicContactKind.whatsApp,
        StudioSocialPlatform.instagram => StudioPublicContactKind.instagram,
        StudioSocialPlatform.facebook => StudioPublicContactKind.facebook,
        StudioSocialPlatform.tiktok => StudioPublicContactKind.tiktok,
        StudioSocialPlatform.website => StudioPublicContactKind.website,
      };
      if (out.any((c) => c.kind == kind)) continue;
      out.add(StudioPublicContact(kind: kind, value: value));
    }
  }

  const order = StudioPublicContactKind.values;
  out.sort(
    (a, b) => order.indexOf(a.kind).compareTo(order.indexOf(b.kind)),
  );
  return out;
}

Uri? studioPublicContactUri(StudioPublicContact contact) {
  final raw = contact.value.trim();
  if (raw.isEmpty) return null;

  switch (contact.kind) {
    case StudioPublicContactKind.phone:
      final compact = raw.replaceAll(RegExp(r'[\s\-\(\)]'), '');
      if (compact.isEmpty) return null;
      return Uri.parse('tel:$compact');
    case StudioPublicContactKind.email:
      return Uri(scheme: 'mailto', path: raw);
    case StudioPublicContactKind.instagram:
      if (raw.contains('://')) return Uri.tryParse(raw);
      final handle = raw.replaceFirst(RegExp(r'^@'), '');
      return Uri.parse('https://instagram.com/$handle');
    case StudioPublicContactKind.telegram:
      if (raw.contains('://')) return Uri.tryParse(raw);
      final handle = raw.replaceFirst(RegExp(r'^@'), '');
      return Uri.parse('https://t.me/$handle');
    case StudioPublicContactKind.youtube:
      if (raw.contains('://')) return Uri.tryParse(raw);
      final handle = raw.replaceFirst(RegExp(r'^@'), '');
      return Uri.parse('https://youtube.com/@$handle');
    case StudioPublicContactKind.whatsApp:
      if (raw.contains('://')) return Uri.tryParse(raw);
      final digits = raw.replaceAll(RegExp(r'\D'), '');
      if (digits.isEmpty) return null;
      return Uri.parse('https://wa.me/$digits');
    case StudioPublicContactKind.website:
    case StudioPublicContactKind.facebook:
    case StudioPublicContactKind.tiktok:
      if (raw.contains('://')) return Uri.tryParse(raw);
      return Uri.parse('https://$raw');
  }
}

Future<void> launchStudioPublicContact(StudioPublicContact contact) async {
  final uri = studioPublicContactUri(contact);
  if (uri == null) return;
  if (await canLaunchUrl(uri)) {
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}
