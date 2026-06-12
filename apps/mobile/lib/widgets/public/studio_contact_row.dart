import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../constants/colors.dart';
import '../../utils/studio_public_contacts.dart';
import '../settings/studio_social_link.dart';

/// Circular contact shortcuts (phone, email, social) — studio profile mock.
class StudioContactRow extends StatelessWidget {
  const StudioContactRow({
    super.key,
    required this.contacts,
    required this.onContactTap,
  });

  final List<StudioPublicContact> contacts;
  final ValueChanged<StudioPublicContact> onContactTap;

  static const _size = 44.0;

  @override
  Widget build(BuildContext context) {
    if (contacts.isEmpty) return const SizedBox.shrink();

    return SizedBox(
      height: _size,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: contacts.length,
        separatorBuilder: (_, _) => const SizedBox(width: 10),
        itemBuilder: (_, index) {
          final contact = contacts[index];
          return _ContactCircle(
            contact: contact,
            onTap: () => onContactTap(contact),
          );
        },
      ),
    );
  }
}

class _ContactCircle extends StatelessWidget {
  const _ContactCircle({required this.contact, required this.onTap});

  final StudioPublicContact contact;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final platform = _platformFor(contact.kind);
    if (platform != null) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          customBorder: const CircleBorder(),
          child: SocialPlatformIcon(
            platform: platform,
            size: StudioContactRow._size,
          ),
        ),
      );
    }

    return Material(
      color: AppColors.primary500,
      shape: const CircleBorder(),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: SizedBox(
          width: StudioContactRow._size,
          height: StudioContactRow._size,
          child: Center(child: _SystemContactIcon(kind: contact.kind)),
        ),
      ),
    );
  }

  StudioSocialPlatform? _platformFor(StudioPublicContactKind kind) {
    return switch (kind) {
      StudioPublicContactKind.instagram => StudioSocialPlatform.instagram,
      StudioPublicContactKind.telegram => StudioSocialPlatform.telegram,
      StudioPublicContactKind.youtube => StudioSocialPlatform.youtube,
      StudioPublicContactKind.whatsApp => StudioSocialPlatform.whatsApp,
      StudioPublicContactKind.facebook => StudioSocialPlatform.facebook,
      StudioPublicContactKind.tiktok => StudioSocialPlatform.tiktok,
      StudioPublicContactKind.website => StudioSocialPlatform.website,
      _ => null,
    };
  }
}

class _SystemContactIcon extends StatelessWidget {
  const _SystemContactIcon({required this.kind});

  final StudioPublicContactKind kind;

  @override
  Widget build(BuildContext context) {
    return switch (kind) {
      StudioPublicContactKind.phone => SvgPicture.asset(
        'assets/icons/icon-phone.svg',
        width: 20,
        height: 20,
        colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
      ),
      StudioPublicContactKind.email => SvgPicture.asset(
        'assets/icons/icon-mail.svg',
        width: 20,
        height: 20,
        colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
      ),
      _ => const SizedBox.shrink(),
    };
  }
}
