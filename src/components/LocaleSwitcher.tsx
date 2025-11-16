'use client';

import { usePathname, useRouter } from 'next/navigation';
import { localizedPath } from '@/i18n/link';
import type { Locale } from '@/i18n/routing';

export default function LocaleSwitcher() {
	const router = useRouter();
	const pathname = usePathname();
	// derive current from pathname, fallback en
	const current = (pathname.split('/')[1] as Locale) || 'en';

	function onChange(next: Locale) {
		const href = localizedPath(pathname, next);
		router.push(href);
	}

	return (
		<select
			className="border rounded px-2 py-1 text-sm"
			value={current}
			onChange={(e) => onChange(e.target.value as Locale)}
			aria-label="Change language"
		>
			<option value="en">English</option>
			<option value="ru">Русский</option>
			<option value="vi">Tiếng Việt</option>
		</select>
	);
}
