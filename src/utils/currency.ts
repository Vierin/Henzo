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
 * Parse input to number, removing any non-digit characters
 */
export function parseVNDInput(value: string): number {
	return parseInt(value.replace(/\D/g, '') || '0', 10);
}
