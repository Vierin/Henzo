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

export function tryOpenDeepLink(deepLink: string): void {
  window.location.href = deepLink;
}
