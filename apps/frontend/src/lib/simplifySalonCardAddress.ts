/** Segments treated as country for card display (comma-separated geocoder strings). */
const COUNTRY_LOWER = new Set([
	'vietnam',
	'việt nam',
	'viet nam',
	'usa',
	'united states',
	'united kingdom',
	'uk',
	'thailand',
	'singapore',
]);

const POSTAL_RE = /^\d{4,10}$/;

/** Đường / Phố — street prefix common in Vietnamese salon addresses from Maps. */
const VN_STREET_PREFIX_RE = /đường|phố/i;

function looksLikeVietnamAddress(original: string, firstSegment: string): boolean {
	if (/\b(vietnam|việt\s*nam|viet\s+nam)\b/i.test(original)) return true;
	return VN_STREET_PREFIX_RE.test(firstSegment);
}

/**
 * Shortens comma-separated salon addresses for compact UI cards:
 * drops postal codes, trailing country, and (for typical VN layouts) the ward segment
 * between street and district — e.g.
 * "Đường …, Mỹ An, 50500, Ngũ Hành Sơn, Da Nang, Vietnam"
 * → "Đường …, Ngũ Hành Sơn, Da Nang"
 */
export function simplifySalonCardAddress(raw: string | null | undefined): string {
	if (raw == null || raw === '') return '';

	const trimmed = raw.trim();
	if (!trimmed.includes(',')) return trimmed;

	let parts = trimmed
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);

	parts = parts.filter((seg) => {
		if (POSTAL_RE.test(seg)) return false;
		const low = seg.toLowerCase();
		if (COUNTRY_LOWER.has(low)) return false;
		return true;
	});

	const vn = looksLikeVietnamAddress(trimmed.toLowerCase(), parts[0] ?? '');
	// Typical VN: street, ward, district, city (sometimes ward still present after postal/country stripped)
	if (vn && parts.length >= 4) {
		parts.splice(1, 1);
	}

	return parts.join(', ');
}
