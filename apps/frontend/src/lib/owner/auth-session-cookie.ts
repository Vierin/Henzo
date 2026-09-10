export const OWNER_AUTH_COOKIE = 'henzo-owner-auth';

export function setOwnerAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${OWNER_AUTH_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

export function clearOwnerAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${OWNER_AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
