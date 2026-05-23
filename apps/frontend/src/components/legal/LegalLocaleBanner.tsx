type LegalLocaleBannerProps = {
	locale: string;
};

const localizedTitles: Record<string, string> = {
	ru: 'Полный текст на английском',
	vi: 'Bản đầy đủ bằng tiếng Anh',
};

export function LegalLocaleBanner({ locale }: LegalLocaleBannerProps) {
	if (locale === 'en') return null;

	const title = localizedTitles[locale] ?? 'Full text in English';

	return (
		<div
			className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
			role="note"
		>
			<p className="font-semibold">{title}</p>
			<p className="mt-1">
				The authoritative version of this document is in English. In case of
				any discrepancy between translations and the English text, the English
				version prevails.
			</p>
		</div>
	);
}
