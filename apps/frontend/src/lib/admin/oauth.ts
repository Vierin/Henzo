/** Cookie marker: admin Google OAuth in flight (PKCE via cookie client). */
export const ADMIN_OAUTH_COOKIE = 'henzo-admin-oauth';

export function setAdminOauthMarker() {
  document.cookie = `${ADMIN_OAUTH_COOKIE}=1; Path=/; Max-Age=600; SameSite=Lax`;
}

export function clearAdminOauthMarker() {
  document.cookie = `${ADMIN_OAUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
