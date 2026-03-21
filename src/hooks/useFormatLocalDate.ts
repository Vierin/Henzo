'use client';

import { useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDateSafe, type FormatDateSafeOptions } from '@/utils/date';

export type UseFormatLocalDateOptions = {
	fallback?: string;
} & FormatDateSafeOptions;

/**
 * Locale-aware long date via {@link formatDateSafe}.
 * @param optionsOrFallback - `{ fallback?, includeWeekday? }` or a string (fallback only, weekday shown)
 */
export function useFormatLocalDate(
	optionsOrFallback: UseFormatLocalDateOptions | string = '—'
) {
	const { language } = useLanguage();

	const fallback =
		typeof optionsOrFallback === 'string'
			? optionsOrFallback
			: (optionsOrFallback.fallback ?? '—');

	const formatOptions = useMemo((): FormatDateSafeOptions | undefined => {
		if (typeof optionsOrFallback === 'string') return undefined;
		const { fallback: _fb, ...rest } = optionsOrFallback;
		return Object.keys(rest).length > 0 ? rest : undefined;
	}, [optionsOrFallback]);

	return useCallback(
		(dateString: string | null | undefined) =>
			formatDateSafe(dateString, fallback, language, formatOptions),
		[language, fallback, formatOptions]
	);
}
