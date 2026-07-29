import { appStoreUrl, playStoreUrl } from '@/constants/appStores';

export type MobilePlatform = 'ios' | 'android' | 'other';

export function getMobilePlatform(): MobilePlatform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

export function storeUrlForPlatform(platform: MobilePlatform): string {
  return platform === 'ios' ? appStoreUrl : playStoreUrl;
}

/** Play Store URL with install-referrer carrying the deep link for deferred open. */
export function playStoreUrlWithDeepLink(deepLink: string): string {
  const referrer = encodeURIComponent(
    `henzo_dl=${encodeURIComponent(deepLink)}`,
  );
  const sep = playStoreUrl.includes('?') ? '&' : '?';
  return `${playStoreUrl}${sep}referrer=${referrer}`;
}

/** Best-effort clipboard write so first app open can restore share intent. */
export async function copyDeepLinkForDeferredOpen(
  deepLink: string,
): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(deepLink);
    }
  } catch {
    // Ignore — Play referrer / re-tap link still work.
  }
}

export function buildClassDeepLink(params: {
  studioId: string;
  sessionId: string;
  startsAt: string;
}): string {
  const q = new URLSearchParams({
    studioId: params.studioId,
    sessionId: params.sessionId,
    startsAt: params.startsAt,
  });
  return `henzo://class?${q.toString()}`;
}

export function buildStudioDeepLink(slugOrId: string): string {
  return `henzo://studio/${encodeURIComponent(slugOrId)}`;
}

export function buildTrainerInviteDeepLink(token: string): string {
  return `henzo://trainer-invite/${encodeURIComponent(token)}`;
}

export function buildStudioClaimDeepLink(
  token: string,
  action: string = 'manage',
): string {
  const q = new URLSearchParams({ action });
  return `henzo://studio-claim/${encodeURIComponent(token)}?${q.toString()}`;
}

export function tryOpenDeepLink(deepLink: string): void {
  window.location.href = deepLink;
}
