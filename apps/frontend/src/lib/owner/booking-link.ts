import { resolveStudioPublicSlug } from '@/utils/slug';

/** Absolute public studio booking URL for owner share/copy. */
export function buildStudioBookingUrl(params: {
  studio: { id: string; name?: string | null; slug?: string | null };
  locale?: string | null;
  origin: string;
}): string {
  const slug = resolveStudioPublicSlug({
    id: params.studio.id,
    name: params.studio.name ?? '',
    slug: params.studio.slug,
  });
  const locale = params.locale?.trim();
  const path = locale
    ? `/${locale}/studio/${encodeURIComponent(slug)}`
    : `/studio/${encodeURIComponent(slug)}`;
  return `${params.origin.replace(/\/$/, '')}${path}`;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
