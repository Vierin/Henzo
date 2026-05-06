'use client';

import {
	AppleStoreIcon,
	GooglePlayIcon,
} from '@/components/landing/storeIcons';
import { studioCirclesSvg } from '@/components/landing/studioCirclesSvg';
import { StudioPhoneFrame } from '@/components/landing/studioPhoneFrame';
import { appStoreUrl, playStoreUrl } from '@/constants/appStores';
import { useTranslation } from '@/contexts/LanguageContext';

const BASE = 'homepage.studio.ctaBanner';

type CtaBannerCopy = {
	titleLine1: string;
	titleLine2: string;
	description: string;
	storeAppStore: string;
	storeGooglePlay: string;
};

function useCtaBannerCopy() {
	const t = useTranslation();
	return t(BASE) as unknown as CtaBannerCopy;
}

export function LandingCtaSection() {
	const { titleLine1, titleLine2, description, storeAppStore, storeGooglePlay } =
		useCtaBannerCopy();

	return (
		<section className="bg-[#F9F4F0] px-4 pb-8 pt-6 sm:px-6 md:px-10 md:pb-10">
			<div className="mx-auto max-w-[1220px] overflow-hidden rounded-[1.75rem] bg-[#4A39A8]">
				<div className="relative grid min-h-[430px] gap-8 px-6 py-8 sm:px-8 md:grid-cols-[1.1fr_0.9fr] md:items-center md:px-12 md:py-10">
					<div className="pointer-events-none absolute right-[-18%] top-1/2 z-0 w-[72%] -translate-y-1/2 opacity-70 [&_svg]:h-auto [&_svg]:w-full">
						<div
							className="origin-center"
							dangerouslySetInnerHTML={{ __html: studioCirclesSvg }}
						/>
					</div>

					<div className="relative z-10">
						<h2 className="text-[clamp(2.2rem,4.2vw,4rem)] leading-[0.98] tracking-[-0.02em] text-white">
							<span className="block">{titleLine1}</span>
							<span className="block text-[#C6FF3A]">{titleLine2}</span>
						</h2>
						<p className="mt-5 max-w-[26ch] text-[1.15rem] leading-[1.45] text-white/90">
							{description}
						</p>

						<div className="mt-8 flex flex-wrap items-center gap-4">
							<a
								href={appStoreUrl}
								target="_blank"
								rel="noreferrer"
								aria-label="App Store"
								className="inline-flex h-[46px] min-w-[146px] items-center justify-center gap-2 rounded-full bg-white px-5 text-[0.95rem] font-medium text-[#1D1D1F] shadow-[0_8px_24px_-14px_rgba(0,0,0,0.65)] transition hover:bg-[#F5F7FA]"
							>
								<AppleStoreIcon className="h-5 w-5" />
								{storeAppStore}
							</a>
							<a
								href={playStoreUrl}
								target="_blank"
								rel="noreferrer"
								aria-label="Google Play"
								className="inline-flex h-[46px] min-w-[146px] items-center justify-center gap-2 rounded-full bg-white px-5 text-[0.95rem] font-medium text-[#1D1D1F] shadow-[0_8px_24px_-14px_rgba(0,0,0,0.65)] transition hover:bg-[#F5F7FA]"
							>
								<GooglePlayIcon className="h-5 w-5" />
								{storeGooglePlay}
							</a>
						</div>
					</div>

					<div className="relative z-10 flex justify-center md:justify-end">
						<StudioPhoneFrame className="w-[min(58vw,286px)] md:w-[min(32vw,292px)]" />
					</div>
				</div>
			</div>
		</section>
	);
}
