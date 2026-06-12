export const STUDIO_LOCATION_NAME_MAX = 60;
export const STUDIO_DESCRIPTION_MAX = 250;
export const CLIENT_REVIEW_COMMENT_MAX = 500;

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

export function assertValidLocationName(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  if (trimmed.length > STUDIO_LOCATION_NAME_MAX) {
    throw new Error(
      `Location name must be ${STUDIO_LOCATION_NAME_MAX} characters or less`,
    );
  }
  if (containsEmbeddedLink(trimmed)) {
    throw new Error('Links are not allowed in location name');
  }
}

export function assertValidClientReviewComment(comment: string): void {
  const trimmed = comment.trim();
  if (!trimmed) return;
  if (trimmed.length > CLIENT_REVIEW_COMMENT_MAX) {
    throw new Error(
      `Comment must be ${CLIENT_REVIEW_COMMENT_MAX} characters or less`,
    );
  }
}

export function assertValidStudioDescription(description: string): void {
  const trimmed = description.trim();
  if (!trimmed) return;
  if (trimmed.length > STUDIO_DESCRIPTION_MAX) {
    throw new Error(
      `Description must be ${STUDIO_DESCRIPTION_MAX} characters or less`,
    );
  }
  if (containsEmbeddedLink(trimmed)) {
    throw new Error('Links are not allowed in description');
  }
}

export function assertValidReminderSettingsText(
  reminderSettings: unknown,
): void {
  if (!reminderSettings || typeof reminderSettings !== 'object') return;
  const raw = reminderSettings as Record<string, unknown>;

  const defaultName = String(raw.defaultLocationName ?? '').trim();
  if (defaultName) assertValidLocationName(defaultName);

  const locations = raw.trainingLocations;
  if (!Array.isArray(locations)) return;
  for (const entry of locations) {
    if (!entry || typeof entry !== 'object') continue;
    const name = String((entry as Record<string, unknown>).name ?? '').trim();
    if (name) assertValidLocationName(name);
  }
}
