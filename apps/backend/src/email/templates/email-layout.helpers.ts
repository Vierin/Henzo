export const HENZO_EMAIL_LOGO_URL = 'https://henzo.app/logo.png';
export const HENZO_EMAIL_ICON_BASE_URL = 'https://api.henzo.app/email/icons';

export type EmailIconName =
  | 'lock'
  | 'shield'
  | 'clock'
  | 'people'
  | 'link'
  | 'copy'
  | 'instagram'
  | 'facebook';

export function renderEmailIcon(
  name: EmailIconName,
  size = 18,
  alt = '',
  inline = false,
): string {
  const safeAlt = escapeHtml(alt);
  const display = inline
    ? 'display:inline-block;vertical-align:middle;border:0;outline:none;text-decoration:none;'
    : 'display:block;margin:0 auto;border:0;outline:none;text-decoration:none;';
  return `<img src="${HENZO_EMAIL_ICON_BASE_URL}/icon-${name}.png" width="${size}" height="${size}" alt="${safeAlt}" style="${display}" />`;
}

export function renderEmailIconCircle(
  name: EmailIconName,
  iconBg: string,
  size = 36,
  iconSize = 18,
): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="display:inline-table;">
      <tr>
        <td align="center" valign="middle" style="width:${size}px;height:${size}px;background-color:${iconBg};border-radius:50%;">
          ${renderEmailIcon(name, iconSize)}
        </td>
      </tr>
    </table>`;
}

export const EMAIL_CLOCK_ICON = renderEmailIcon('clock', 18);
export const EMAIL_SHIELD_ICON = renderEmailIcon('shield', 18);
export const EMAIL_LOCK_ICON = renderEmailIcon('lock', 14, '', true);
export const EMAIL_TRAINER_ICON = renderEmailIcon('people', 14, '', true);
export const EMAIL_LINK_ICON = renderEmailIcon('link', 14);
export const EMAIL_COPY_ICON = renderEmailIcon('copy', 16);
export const EMAIL_INSTAGRAM_ICON = renderEmailIcon(
  'instagram',
  18,
  'Instagram',
);
export const EMAIL_FACEBOOK_ICON = renderEmailIcon('facebook', 18, 'Facebook');

export function renderEmailLogoHeader(
  maxWidth = 560,
  marginBottom = 20,
): string {
  return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="${maxWidth}" style="max-width:${maxWidth}px;width:100%;margin:0 auto ${marginBottom}px;">
          <tr>
            <td align="center">
              <a href="https://henzo.app" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
                <img
                  src="${HENZO_EMAIL_LOGO_URL}"
                  alt="Henzo"
                  width="110"
                  style="display:block;margin:0 auto;max-width:110px;height:auto;border:0;"
                />
              </a>
            </td>
          </tr>
        </table>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderEmailFooter(footerTagline: string): string {
  const year = new Date().getFullYear();

  return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;width:100%;margin:28px auto 0;">
          <tr>
            <td align="center" style="padding-bottom:16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:0 8px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" valign="middle" width="44" height="44" style="width:44px;height:44px;background-color:#ffffff;border-radius:50%;box-shadow:0 2px 8px rgba(63,63,63,0.08);">
                          <a href="https://www.instagram.com/henzo.app/" target="_blank" rel="noopener noreferrer" style="display:block;line-height:0;text-decoration:none;">
                            ${EMAIL_INSTAGRAM_ICON}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding:0 8px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" valign="middle" width="44" height="44" style="width:44px;height:44px;background-color:#ffffff;border-radius:50%;box-shadow:0 2px 8px rgba(63,63,63,0.08);">
                          <a href="https://www.facebook.com/profile.php?id=61581892591997" target="_blank" rel="noopener noreferrer" style="display:block;line-height:0;text-decoration:none;">
                            ${EMAIL_FACEBOOK_ICON}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="font-size:13px;color:#B0B0B0;line-height:1.6;padding-bottom:4px;">
              &copy; ${year} Henzo
            </td>
          </tr>
          <tr>
            <td align="center" style="font-size:13px;color:#C8C8C8;line-height:1.6;">
              ${footerTagline}
            </td>
          </tr>
        </table>`;
}

export function renderEmailInfoRow(
  icon: string,
  iconBg: string,
  text: string,
): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td valign="middle" align="center" style="padding-right:12px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="display:inline-table;">
                  <tr>
                    <td align="center" valign="middle" style="width:36px;height:36px;background-color:${iconBg};border-radius:50%;">
                      ${icon}
                    </td>
                  </tr>
                </table>
              </td>
              <td valign="middle" style="font-size:14px;color:#3F3F3F;line-height:1.5;max-width:380px;text-align:left;">
                ${text}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}
