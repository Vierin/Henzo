'use client';

import { ChaoticUnderline } from '@/components/landing/chaoticUnderline';
import {
	AppleStoreIcon,
	GooglePlayIcon,
} from '@/components/landing/storeIcons';
import { StudioPhoneFrame } from '@/components/landing/studioPhoneFrame';
import { appStoreUrl, playStoreUrl } from '@/constants/appStores';
import { useTranslation } from '@/contexts/LanguageContext';
import gsap from 'gsap';
import { useLayoutEffect, useRef } from 'react';

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

function renderTitleLine2WithHandsUnderline(titleLine2: string) {
	const match = titleLine2.match(/\bhands[.!?]?/i);
	if (!match || match.index === undefined) {
		return <span className="block text-[#C6FF3A]">{titleLine2}</span>;
	}

	const before = titleLine2.slice(0, match.index);
	const target = titleLine2.slice(match.index, match.index + match[0].length);
	const after = titleLine2.slice(match.index + match[0].length);

	return (
		<span className="block text-[#C6FF3A]">
			{before}
			<span className="relative inline-block px-0.5">
				{target}
				<ChaoticUnderline
					color="#FFFFFF"
					className="pointer-events-none absolute -bottom-[4%] left-[2%] w-[103%]"
				/>
			</span>
			{after}
		</span>
	);
}

export function LandingCtaSection() {
	const sectionRef = useRef<HTMLElement>(null);
	const {
		titleLine1,
		titleLine2,
		description,
		storeAppStore,
		storeGooglePlay,
	} = useCtaBannerCopy();

	return (
		<section
			ref={sectionRef}
			className="bg-[#F9F4F0] px-3 sm:px-6 py-6 sm:py-12 sm:h-screen"
		>
			<div className="mx-auto max-w-7xl overflow-hidden h-full rounded-[1.75rem] bg-[#4A39A8] flex items-center justify-center">
				<div className="relative grid min-h-[430px] gap-8 px-5  sm:px-8 md:grid-cols-[1.1fr_0.9fr] md:items-center md:px-12 py-10">
					<div className="circle-image pointer-events-none absolute w-[160%] top-[35%] left-[-30%] sm:left-auto sm:right-[-6%] sm:top-0 z-0 sm:w-[60%]">
						<img
							src="/images/circles.webp"
							alt=""
							aria-hidden="true"
							className="h-auto w-full origin-center"
							draggable={false}
						/>
					</div>

					<div className="relative z-10 top-[25%] sm:top-0">
						<h2 className="text-[2.4rem] sm:text-[4rem] leading-[0.98] tracking-[-0.02em] text-white">
							<span className="block">{titleLine1}</span>
							{renderTitleLine2WithHandsUnderline(titleLine2)}
						</h2>
						<p className="mt-10 max-w-[30ch] text-[1.2rem] sm:text-[1.8rem]  leading-[1.2] text-white/90">
							{description}
						</p>

						<div className="mt-8 flex flex-wrap items-center gap-4">
							<a
								href={appStoreUrl}
								target="_blank"
								rel="noreferrer"
								aria-label="App Store"
								className="inline-flex h-[46px] min-w-[120px] sm:min-w-[146px] items-center justify-center gap-2 rounded-full bg-white px-5 text-[0.95rem] font-medium text-[#1D1D1F] shadow-[0_8px_24px_-14px_rgba(0,0,0,0.65)] transition hover:bg-[#F5F7FA]"
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

					<div className="relative z-10 flex justify-center md:justify-end bottom-[-25%] sm:bottom-0">
						<StudioPhoneFrame className="w-[min(58vw,220px)] md:w-[min(32vw,250px)]" />
					</div>
				</div>
			</div>
		</section>
	);
}
