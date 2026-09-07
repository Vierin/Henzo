export const CLIENT_AUTH_COOKIE = 'henzo-client-auth';

export function setClientAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${CLIENT_AUTH_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

export function clearClientAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${CLIENT_AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
