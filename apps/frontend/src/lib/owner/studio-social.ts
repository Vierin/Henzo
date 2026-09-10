/** Mobile `studio_social_link.dart` parity. */

export type StudioSocialPlatform =
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'tiktok'
  | 'whatsApp'
  | 'telegram'
  | 'website';

export type StudioSocialLink = {
  platform: StudioSocialPlatform;
  value: string;
};

export const STUDIO_SOCIAL_PLATFORMS: StudioSocialPlatform[] = [
  'instagram',
  'facebook',
  'website',
  'youtube',
  'tiktok',
  'whatsApp',
  'telegram',
];

export function socialPlatformLabel(p: StudioSocialPlatform): string {
  switch (p) {
    case 'instagram':
      return 'Instagram';
    case 'facebook':
      return 'Facebook';
    case 'youtube':
      return 'YouTube';
    case 'tiktok':
      return 'TikTok';
    case 'whatsApp':
      return 'WhatsApp';
    case 'telegram':
      return 'Telegram';
    case 'website':
      return 'Website';
  }
}

export function socialPlatformHint(p: StudioSocialPlatform): string {
  switch (p) {
    case 'instagram':
      return '@username';
    case 'facebook':
      return 'https://facebook.com/...';
    case 'youtube':
      return 'https://youtube.com/@...';
    case 'tiktok':
      return 'https://tiktok.com/@...';
    case 'whatsApp':
      return '+84...';
    case 'telegram':
      return '@username';
    case 'website':
      return 'https://...';
  }
}

/** Mobile `assets/icons/icon-*.png` (copied to `/images/social`). */
export function socialPlatformIconSrc(p: StudioSocialPlatform): string {
  switch (p) {
    case 'instagram':
      return '/images/social/icon-instagram.png';
    case 'facebook':
      return '/images/social/icon-facebook.png';
    case 'youtube':
      return '/images/social/icon-youtube.png';
    case 'tiktok':
      return '/images/social/icon-tiktok.png';
    case 'whatsApp':
      return '/images/social/icon-whatsap.png';
    case 'telegram':
      return '/images/social/icon-telegram.png';
    case 'website':
      return '/images/social/icon-web.png';
  }
}

export function studioSocialLinksFromStudio(studio: {
  instagram?: string | null;
  website?: string | null;
  reminderSettings?: { socialLinks?: unknown } | null;
}): StudioSocialLink[] {
  const links: StudioSocialLink[] = [];
  const instagram = studio.instagram?.trim();
  if (instagram) {
    links.push({ platform: 'instagram', value: instagram });
  }

  const website = studio.website?.trim();
  if (website) {
    const isFacebook = /facebook\.com|fb\.com|fb\.me/i.test(website);
    links.push({
      platform: isFacebook ? 'facebook' : 'website',
      value: website,
    });
  }

  const extra = studio.reminderSettings?.socialLinks;
  if (Array.isArray(extra)) {
    for (const item of extra) {
      if (!item || typeof item !== 'object') continue;
      const platform = String(
        (item as { platform?: string }).platform ?? '',
      ).trim() as StudioSocialPlatform;
      const value = String((item as { value?: string }).value ?? '').trim();
      if (!STUDIO_SOCIAL_PLATFORMS.includes(platform) || !value) continue;
      if (links.some((l) => l.platform === platform)) continue;
      links.push({ platform, value });
    }
  }
  return links;
}

export function studioSocialLinksToPayload(links: StudioSocialLink[]): {
  instagram: string;
  website: string;
  extras: { platform: string; value: string }[];
} {
  let instagram = '';
  let website = '';
  const extras: { platform: string; value: string }[] = [];

  for (const link of links) {
    const value = link.value.trim();
    if (!value) continue;
    switch (link.platform) {
      case 'instagram':
        instagram = value;
        break;
      case 'facebook':
      case 'website':
        website = value;
        break;
      case 'youtube':
      case 'tiktok':
      case 'whatsApp':
      case 'telegram':
        extras.push({ platform: link.platform, value });
        break;
    }
  }
  return { instagram, website, extras };
}

export function studioSocialLinksSnapshot(links: StudioSocialLink[]): string {
  return [...links]
    .map((l) => `${l.platform}:${l.value.trim()}`)
    .sort()
    .join('|');
}
