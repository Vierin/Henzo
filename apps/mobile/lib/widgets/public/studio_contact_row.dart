import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../constants/colors.dart';
import '../../utils/studio_public_contacts.dart';
import '../settings/studio_social_link.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

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
        separatorBuilder: (_, __) => const SizedBox(width: 10),
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
    final bg = _backgroundFor(contact.kind);
    return Material(
      color: bg,
      shape: const CircleBorder(),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: SizedBox(
          width: StudioContactRow._size,
          height: StudioContactRow._size,
          child: Center(child: _ContactIcon(kind: contact.kind)),
        ),
      ),
    );
  }

  Color _backgroundFor(StudioPublicContactKind kind) {
    return switch (kind) {
      StudioPublicContactKind.phone ||
      StudioPublicContactKind.email =>
        AppColors.primary500,
      StudioPublicContactKind.instagram => const Color(0xFFE1306C),
      StudioPublicContactKind.telegram => const Color(0xFF229ED9),
      StudioPublicContactKind.youtube => const Color(0xFFFF0000),
      StudioPublicContactKind.whatsApp => const Color(0xFF25D366),
    };
  }
}

class _ContactIcon extends StatelessWidget {
  const _ContactIcon({required this.kind});

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
      StudioPublicContactKind.instagram ||
      StudioPublicContactKind.telegram ||
      StudioPublicContactKind.youtube ||
      StudioPublicContactKind.whatsApp =>
        Image.asset(
          _socialAsset(kind),
          width: 22,
          height: 22,
          fit: BoxFit.contain,
        ),
    };
  }

  String _socialAsset(StudioPublicContactKind kind) {
    final platform = switch (kind) {
      StudioPublicContactKind.instagram => StudioSocialPlatform.instagram,
      StudioPublicContactKind.telegram => StudioSocialPlatform.telegram,
      StudioPublicContactKind.youtube => StudioSocialPlatform.youtube,
      StudioPublicContactKind.whatsApp => StudioSocialPlatform.whatsApp,
      _ => StudioSocialPlatform.instagram,
    };
    return platform.iconAsset;
  }
}
