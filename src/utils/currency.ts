/**
 * Format Vietnamese Dong (VND) currency
 * Simplifies large numbers: 50,000 ₫ → 50K ₫, 1,000,000 ₫ → 1M ₫
 */
export function formatVND(amount: number): string {
	if (amount >= 1_000_000) {
		const millions = amount / 1_000_000;
		return `${millions % 1 === 0 ? millions : millions.toFixed(1)}M ₫`;
	}
	
	if (amount >= 1_000) {
		const thousands = amount / 1_000;
		return `${thousands % 1 === 0 ? thousands : thousands.toFixed(1)}K ₫`;
	}
	
	return `${amount} ₫`;
}

/**
 * Format VND with thousand separators for display
 * Used in forms and detailed views
 */
export function formatVNDFull(amount: number): string {
	return `${amount.toLocaleString('vi-VN')} ₫`;
}

/**
 * Parse input to number, removing any non-digit characters
 */
export function parseVNDInput(value: string): number {
	return parseInt(value.replace(/\D/g, '') || '0', 10);
}

