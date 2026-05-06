'use client';

import { ChaoticUnderline } from '@/components/landing/chaoticUnderline';
import { StudioPhoneFrame } from '@/components/landing/studioPhoneFrame';
import { useTranslation } from '@/contexts/LanguageContext';
import { useMemo } from 'react';

const scriptClass =
	"font-[family-name:'Shadows Into Light Two',cursive] text-[1.65rem] leading-none font-semibold text-[#D9534F] sm:text-[1.85rem]";

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
			className="bg-[#F9F4F0] px-5 py-12 md:px-10 md:py-16"
			aria-labelledby="quick-start-heading"
		>
			<div className="mx-auto max-w-5xl">
				<h2
					id="quick-start-heading"
					className="text-center text-[#3F3F3F] [&_span]:tracking-tight"
				>
					<span className="block text-[4.9rem] leading-tight">{line1}</span>
					<span className="mt-2 block text-lg font-normal sm:text-xl md:mt-3 md:text-2xl">
						{line2Before}
						<span className="relative inline-block px-0.5">
							{line2Accent}
							<ChaoticUnderline className="pointer-events-none absolute -bottom-0.5 left-0 w-[108%] -translate-x-[4%]" />
						</span>
					</span>
				</h2>

				<div className="mt-12 flex flex-col items-center gap-10 lg:hidden">
					{steps.map((s) => (
						<div key={s.label} className="max-w-md text-left">
							<p className={scriptClass}>{s.label}</p>
							<p className="mt-2 text-base leading-snug text-[#3F3F3F]">
								{s.text}
							</p>
						</div>
					))}
					<StudioPhoneFrame className="w-[min(72vw,260px)] sm:w-[280px]" />
				</div>

				<div className="relative mx-auto mt-14 hidden min-h-[520px] max-w-[920px] lg:block">
					<div className="absolute left-1/2 top-1/2 z-[2] w-[280px] -translate-x-1/2 -translate-y-[46%]">
						<StudioPhoneFrame className="w-[280px]" />
					</div>

					<div className="absolute left-0 top-[2%] max-w-[min(240px,28vw)] text-left">
						<p className={scriptClass}>{steps[0]?.label}</p>
						<p className="mt-1.5 text-[15px] leading-snug text-[#3F3F3F]">
							{steps[0]?.text}
						</p>
						<img
							src="/quickstart-arrow-1.svg"
							alt=""
							aria-hidden
							className="pointer-events-none absolute -right-[4.5rem] top-[52%] hidden h-[120px] w-[140px] lg:block"
						/>
					</div>

					<div className="absolute right-0 top-[34%] max-w-[min(280px,30vw)] text-left">
						<p className={scriptClass}>{steps[1]?.label}</p>
						<p className="mt-1.5 text-[15px] leading-snug text-[#3F3F3F]">
							{steps[1]?.text}
						</p>
						<img
							src="/quickstart-arrow-2.svg"
							alt=""
							aria-hidden
							className="pointer-events-none absolute -left-[5.5rem] top-[40%] hidden h-[100px] w-[120px] lg:block"
						/>
					</div>

					<div className="absolute bottom-[6%] left-0 max-w-[min(260px,28vw)] text-left">
						<p className={scriptClass}>{steps[2]?.label}</p>
						<p className="mt-1.5 text-[15px] leading-snug text-[#3F3F3F]">
							{steps[2]?.text}
						</p>
						<img
							src="/quickstart-arrow-3.svg"
							alt=""
							aria-hidden
							className="pointer-events-none absolute -right-[4rem] bottom-[72%] hidden h-[110px] w-[130px] lg:block"
						/>
					</div>
				</div>
			</div>
		</section>
	);
}
