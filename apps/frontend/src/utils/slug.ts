/** Vietnamese → Latin map (single pass). */
const vietnameseMap = new Map<string, string>([
  ['đ', 'd'],
  ['Đ', 'D'],
  ['à', 'a'],
  ['á', 'a'],
  ['ạ', 'a'],
  ['ả', 'a'],
  ['ã', 'a'],
  ['À', 'A'],
  ['Á', 'A'],
  ['Ạ', 'A'],
  ['Ả', 'A'],
  ['Ã', 'A'],
  ['è', 'e'],
  ['é', 'e'],
  ['ẹ', 'e'],
  ['ẻ', 'e'],
  ['ẽ', 'e'],
  ['È', 'E'],
  ['É', 'E'],
  ['Ẹ', 'E'],
  ['Ẻ', 'E'],
  ['Ẽ', 'E'],
  ['ì', 'i'],
  ['í', 'i'],
  ['ị', 'i'],
  ['ỉ', 'i'],
  ['ĩ', 'i'],
  ['Ì', 'I'],
  ['Í', 'I'],
  ['Ị', 'I'],
  ['Ỉ', 'I'],
  ['Ĩ', 'I'],
  ['ò', 'o'],
  ['ó', 'o'],
  ['ọ', 'o'],
  ['ỏ', 'o'],
  ['õ', 'o'],
  ['Ò', 'O'],
  ['Ó', 'O'],
  ['Ọ', 'O'],
  ['Ỏ', 'O'],
  ['Õ', 'O'],
  ['ù', 'u'],
  ['ú', 'u'],
  ['ụ', 'u'],
  ['ủ', 'u'],
  ['ũ', 'u'],
  ['Ù', 'U'],
  ['Ú', 'U'],
  ['Ụ', 'U'],
  ['Ủ', 'U'],
  ['Ũ', 'U'],
  ['ỳ', 'y'],
  ['ý', 'y'],
  ['ỵ', 'y'],
  ['ỷ', 'y'],
  ['ỹ', 'y'],
  ['Ỳ', 'Y'],
  ['Ý', 'Y'],
  ['Ỵ', 'Y'],
  ['Ỷ', 'Y'],
  ['Ỹ', 'Y'],
  ['â', 'a'],
  ['ấ', 'a'],
  ['ầ', 'a'],
  ['ẩ', 'a'],
  ['ẫ', 'a'],
  ['ậ', 'a'],
  ['Â', 'A'],
  ['Ấ', 'A'],
  ['Ầ', 'A'],
  ['Ẩ', 'A'],
  ['Ẫ', 'A'],
  ['Ậ', 'A'],
  ['ê', 'e'],
  ['ế', 'e'],
  ['ề', 'e'],
  ['ể', 'e'],
  ['ễ', 'e'],
  ['ệ', 'e'],
  ['Ê', 'E'],
  ['Ế', 'E'],
  ['Ề', 'E'],
  ['Ể', 'E'],
  ['Ễ', 'E'],
  ['Ệ', 'E'],
  ['ô', 'o'],
  ['ố', 'o'],
  ['ồ', 'o'],
  ['ổ', 'o'],
  ['ỗ', 'o'],
  ['ộ', 'o'],
  ['Ô', 'O'],
  ['Ố', 'O'],
  ['Ồ', 'O'],
  ['Ổ', 'O'],
  ['Ỗ', 'O'],
  ['Ộ', 'O'],
  ['ư', 'u'],
  ['ứ', 'u'],
  ['ừ', 'u'],
  ['ử', 'u'],
  ['ữ', 'u'],
  ['ự', 'u'],
  ['Ư', 'U'],
  ['Ứ', 'U'],
  ['Ừ', 'U'],
  ['Ử', 'U'],
  ['Ữ', 'U'],
  ['Ự', 'U'],
  ['ơ', 'o'],
  ['ớ', 'o'],
  ['ờ', 'o'],
  ['ở', 'o'],
  ['ỡ', 'o'],
  ['ợ', 'o'],
  ['Ơ', 'O'],
  ['Ớ', 'O'],
  ['Ờ', 'O'],
  ['Ở', 'O'],
  ['Ỡ', 'O'],
  ['Ợ', 'O'],
]);

function transliterateVietnamese(text: string): string {
  return text
    .split('')
    .map((char) => vietnameseMap.get(char) || char)
    .join('');
}

const slugCache = new Map<string, string>();

/**
 * SEO slug: `{name}-{id}` (same as backend `generateStudioSlug` / full-web salon).
 */
export function generateStudioSlug(name: string, id: string): string {
  const cacheKey = `${name}-${id}`;
  const cached = slugCache.get(cacheKey);
  if (cached) return cached;

  const cleanName = transliterateVietnamese(name)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const slug = cleanName ? `${cleanName}-${id}` : id;

  if (slugCache.size > 1000) {
    const firstKeys = Array.from(slugCache.keys()).slice(0, 100);
    firstKeys.forEach((key) => slugCache.delete(key));
  }
  slugCache.set(cacheKey, slug);
  return slug;
}

/** Prefer stored DB slug; otherwise build `name-id`. */
export function resolveStudioPublicSlug(input: {
  id: string;
  name: string;
  slug?: string | null;
}): string {
  const stored = input.slug?.trim();
  if (stored) return stored;
  return generateStudioSlug(input.name, input.id);
}

/**
 * Extract cuid/id from SEO slug (`above-the-mat-cmrk…` → `cmrk…`).
 */
export function extractStudioIdFromSlug(slug: string): string | null {
  const idMatch = slug.match(/-c[a-z0-9]{19,}$/i);
  if (idMatch) return idMatch[0].substring(1);

  if (/^c[a-z0-9]{19,}$/i.test(slug)) return slug;

  // Legacy UUID
  if (
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(slug)
  ) {
    return slug;
  }

  return null;
}

export function isBareStudioId(slug: string): boolean {
  return (
    /^c[a-z0-9]{19,}$/i.test(slug) ||
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(slug)
  );
}

export function isValidStudioSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/i.test(slug) && slug.length > 0;
}
