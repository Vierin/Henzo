/** Mirrors `apps/backend/src/lib/text-content.ts` — keep in sync. */

export const STUDIO_LOCATION_NAME_MAX = 60;
export const STUDIO_DESCRIPTION_MAX = 250;

const URL_PROTOCOL = /https?:\/\//i;
const WWW_PREFIX = /\bwww\./i;
const MESSENGER_PATH = /\b(?:t\.me|telegram\.me)\//i;
const DOMAIN_LIKE =
  /\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(?:com|net|org|ru|vn|io|app|me|co|dev|xyz|info|biz|tv|cc|link|site|online|store|shop|blog|page|pro|tech|space|world|click|top|work|live|cloud|email|guru|digital|media|news|studio|fitness|health|today|one|ai|ly|gg|tk|ml|ga|cf|pw|su|by|kz|ua|de|fr|uk|us|eu|asia|tel|mobi)\b/i;

export function containsEmbeddedLink(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return (
    URL_PROTOCOL.test(trimmed) ||
    WWW_PREFIX.test(trimmed) ||
    MESSENGER_PATH.test(trimmed) ||
    DOMAIN_LIKE.test(trimmed)
  );
}
