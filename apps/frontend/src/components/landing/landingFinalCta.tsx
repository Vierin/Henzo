import Link from 'next/link';
import { appStoreUrl, playStoreUrl } from '@/constants/appStores';
import type { Locale } from '@/i18n/routing';
import { withLocale } from '@/i18n/routing';

const coralBtn =
	'bg-[#E86D4F] hover:bg-[#d85e42] shadow-[0_12px_32px_rgba(232,109,79,0.28)]';
const coralBtnGhost =
	'border-[#eadfd7] text-[#3F3F3F] hover:bg-white hover:border-[#E86D4F]/35';

type LandingFinalCtaProps = {
	locale: Locale;
	title: string;
	description: string;
	androidCta: string;
	iosCta: string;
	contactCta: string;
};

export function LandingFinalCta({
	locale,
	title,
	description,
	androidCta,
	iosCta,
	contactCta,
}: LandingFinalCtaProps) {
	return (
		<section className="mt-16 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1e293b] via-[#1a2332] to-[#0f172a] px-8 py-12 text-center shadow-[0_28px_60px_-20px_rgba(15,23,42,0.45)] md:mt-24 md:px-14 md:py-16">
			<h2 className="text-2xl font-semibold leading-tight text-[#F9F4F0] md:text-3xl">
				{title}
			</h2>
			<p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">
				{description}
			</p>
			<div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap">
				<a
					href={playStoreUrl}
					target="_blank"
					rel="noreferrer"
					className={`inline-flex min-h-[48px] items-center justify-center rounded-full px-8 py-3 text-sm font-semibold text-white transition ${coralBtn}`}
				>
					{androidCta}
				</a>
				<a
					href={appStoreUrl}
					target="_blank"
					rel="noreferrer"
					className={`inline-flex min-h-[48px] items-center justify-center rounded-full border-2 bg-[#F9F4F0] px-8 py-3 text-sm font-semibold transition ${coralBtnGhost}`}
				>
					{iosCta}
				</a>
				<Link
					href={withLocale('/contact', locale)}
					className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/35 px-8 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
				>
					{contactCta}
				</Link>
			</div>
		</section>
	);
}
