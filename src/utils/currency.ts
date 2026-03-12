/**
 * Format Vietnamese Dong (VND) currency — full format with thousand separator, e.g. 750.000 VND
 */
export function formatVND(amount: number): string {
	return `${amount.toLocaleString('vi-VN')} VND`;
}

/**
 * Format VND with thousand separators for display
 * Used in forms and detailed views
 */
export function formatVNDFull(amount: number): string {
	return `${amount.toLocaleString('vi-VN')} VND`;
}

/**
 * Compact VND format for tight UI (e.g. dashboard stats): 1.5M, 390k, 750
 * Avoids ellipsis on small cards.
 */
export function formatVNDCompact(amount: number): string {
	const abs = Math.abs(amount);
	if (abs >= 1_000_000) {
		const v = amount / 1_000_000;
		return `${v % 1 === 0 ? v : v.toFixed(1)}M`;
	}
	if (abs >= 1_000) {
		const v = amount / 1_000;
		return `${v % 1 === 0 ? v : v.toFixed(1)}k`;
	}
	return String(Math.round(amount));
}

/**
 * Parse input to number, removing any non-digit characters
 */
export function parseVNDInput(value: string): number {
	return parseInt(value.replace(/\D/g, '') || '0', 10);
}
