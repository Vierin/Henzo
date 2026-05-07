'use client';

import { ChaoticUnderline } from '@/components/landing/chaoticUnderline';
import { StudioPhoneFrame } from '@/components/landing/studioPhoneFrame';
import { useTranslation } from '@/contexts/LanguageContext';
import { useMemo } from 'react';

const scriptClass =
	'font-shadows-into-light-two text-[2.5rem] leading-none text-[#D9534F]';

const BASE = 'homepage.studio.quickStart';

type Step = { label: string; text: string };

function parseSteps(raw: unknown): Step[] {
	if (!Array.isArray(raw)) {
		return [];
	}
	return raw.filter(
		(x): x is Step =>
			x !== null &&
			typeof x === 'object' &&
			'label' in x &&
			'text' in x &&
			typeof (x as Step).label === 'string' &&
			typeof (x as Step).text === 'string',
	);
}

export function QuickStartSection() {
	const t = useTranslation();

	const line1 = String(t(`${BASE}.line1`));
	const line2Before = String(t(`${BASE}.line2Before`));
	const line2Accent = String(t(`${BASE}.line2Accent`));

	const rawSteps = t(`${BASE}.steps`);
	const steps = useMemo(() => parseSteps(rawSteps), [rawSteps]);

	return (
		<section
			id="how-it-works"
			className="bg-[#F9F4F0] px-5 py-12 h-screen"
			aria-labelledby="quick-start-heading"
		>
			<div className="mx-auto max-w-[76vw]">
				<h2
					id="quick-start-heading"
					className="text-center text-[#3F3F3F] [&_span]:tracking-tight"
				>
					<span className="block text-[4.9rem] leading-tight">{line1}</span>
					<span className="mt-2 block text-[2.5rem] font-normal">
						{line2Before}
						<span className="relative inline-block px-0.5">
							{line2Accent}
							<ChaoticUnderline className="pointer-events-none absolute -bottom-0.5 left-0 w-[108%] -translate-x-[4%]" />
						</span>
					</span>
				</h2>

				<div className="relative mt-14 hidden min-h-[620px] w-full lg:block">
					<div className="absolute left-1/2 top-1/2 z-[2] w-[30vw] -translate-x-1/2 -translate-y-[46%]">
						<StudioPhoneFrame className="w-[23vw]" />
					</div>

					<div className="absolute left-0 top-[2%] max-w-[min(240px,28vw)] text-left">
						<p className={scriptClass}>{steps[0]?.label}</p>
						<p className="mt-5 text-[1.5em] leading-[1.1] text-[#3F3F3F] font-medium">
							{steps[0]?.text}
						</p>
						<img
							src="/quickstart-arrow-1.svg"
							alt=""
							aria-hidden
							className="pointer-events-none absolute -right-[5rem] top-[120%] hidden h-[120px] w-[140px] lg:block"
						/>
					</div>

					<div className="absolute -right-[5rem] top-[34%] max-w-[min(280px,30vw)] text-left">
						<p className={scriptClass}>{steps[1]?.label}</p>
						<p className="mt-5 text-[1.5em] leading-[1.1] text-[#3F3F3F] font-medium">
							{steps[1]?.text}
						</p>
						<img
							src="/quickstart-arrow-2.svg"
							alt=""
							aria-hidden
							className="pointer-events-none absolute -left-[7.5rem] top-[100%] hidden aspect-square w-[140px] lg:block"
						/>
					</div>

					<div className="absolute bottom-[2%] left-[3%] max-w-[min(260px,28vw)] text-left">
						<p className={scriptClass}>{steps[2]?.label}</p>
						<p className="mt-5 text-[1.5em] leading-[1.1] text-[#3F3F3F] font-medium">
							{steps[2]?.text}
						</p>
						<img
							src="/quickstart-arrow-3.svg"
							alt=""
							aria-hidden
							className="pointer-events-none absolute -right-[2rem] bottom-[72%] hidden aspect-square w-[140px] lg:block"
						/>
					</div>
				</div>
			</div>
		</section>
	);
}
