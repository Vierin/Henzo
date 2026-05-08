'use client';

import { ChaoticUnderline } from '@/components/landing/chaoticUnderline';
import { StudioPhoneFrame } from '@/components/landing/studioPhoneFrame';
import { useTranslation } from '@/contexts/LanguageContext';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

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
	const sectionRef = useRef<HTMLElement>(null);
	const desktopWrapRef = useRef<HTMLDivElement>(null);
	const mobilePinRef = useRef<HTMLDivElement>(null);
	const mobileStepRef = useRef<HTMLDivElement>(null);
	const labelRefs = useRef<Array<HTMLSpanElement | null>>([]);
	const bodyRefs = useRef<Array<HTMLParagraphElement | null>>([]);
	const arrowRefs = useRef<Array<HTMLImageElement | null>>([]);
	const [mobileActiveStep, setMobileActiveStep] = useState(0);

	const line1 = String(t(`${BASE}.line1`));
	const line2Before = String(t(`${BASE}.line2Before`));
	const line2Accent = String(t(`${BASE}.line2Accent`));

	const rawSteps = t(`${BASE}.steps`);
	const steps = useMemo(() => parseSteps(rawSteps), [rawSteps]);

	useLayoutEffect(() => {
		if (steps.length === 0) {
			return;
		}
		gsap.registerPlugin(ScrollTrigger);

		const labels = labelRefs.current.filter(
			(el): el is HTMLSpanElement => el !== null,
		);
		const bodies = bodyRefs.current.filter(
			(el): el is HTMLParagraphElement => el !== null,
		);
		const arrows = arrowRefs.current.filter(
			(el): el is HTMLImageElement => el !== null,
		);
		const itemsCount = Math.min(
			labels.length,
			bodies.length,
			arrows.length,
			steps.length,
		);
		if (itemsCount === 0) {
			return;
		}

		const ctx = gsap.context(() => {
			const mm = gsap.matchMedia();

			mm.add('(min-width: 768px)', () => {
				const section = sectionRef.current;
				const desktopWrap = desktopWrapRef.current;
				if (!section || !desktopWrap) {
					return;
				}

				let maxProgress = 0;

				labels.forEach((labelEl, i) => {
					gsap.set(labelEl, {
						width: '0ch',
						autoAlpha: 1,
						display: 'inline-block',
						overflow: 'hidden',
						whiteSpace: 'nowrap',
					});
					const chars = Math.max(steps[i]?.label.length ?? 1, 1);
					labelEl.style.setProperty('--label-chars', `${chars}ch`);
				});

				gsap.set(bodies, { autoAlpha: 0, y: 26 });
				gsap.set(arrows, {
					autoAlpha: 0,
					clipPath: 'inset(0 100% 0 0)',
				});

				const tl = gsap.timeline({
					scrollTrigger: {
						trigger: section,
						start: 'top top',
						end: `+=${Math.max(980, itemsCount * 380)}`,
						pin: true,
						pinSpacing: true,
						anticipatePin: 1,
						scrub: 1,
						onUpdate: (self: ScrollTrigger) => {
							if (self.progress >= maxProgress) {
								maxProgress = self.progress;
								return;
							}
							self.animation?.progress(maxProgress);
						},
						invalidateOnRefresh: true,
					},
				});

				for (let i = 0; i < itemsCount; i += 1) {
					const labelChars = steps[i]?.label.length ?? 10;
					tl.to(labels[i], {
						width: `var(--label-chars)`,
						duration: 0.42,
						ease: `steps(${Math.max(labelChars, 6)})`,
					});
					tl.to(
						bodies[i],
						{
							autoAlpha: 1,
							y: 0,
							duration: 0.36,
							ease: 'power2.out',
						},
						'-=0.09',
					);
					tl.to(
						arrows[i],
						{
							autoAlpha: 1,
							clipPath: 'inset(0 0% 0 0)',
							duration: 0.34,
							ease: 'power2.out',
						},
						'-=0.08',
					);
					if (i !== itemsCount - 1) {
						tl.to({}, { duration: 0.2 });
					}
				}
			});

			mm.add('(max-width: 767px)', () => {
				const section = sectionRef.current;
				const mobilePin = mobilePinRef.current;
				if (!section || !mobilePin) {
					return;
				}
				setMobileActiveStep(0);
				ScrollTrigger.create({
					trigger: section,
					start: 'top top',
					end: `+=${Math.max(820, steps.length * 340)}`,
					pin: true,
					pinSpacing: true,
					scrub: 1,
					invalidateOnRefresh: true,
					anticipatePin: 1,
					onUpdate: (self: ScrollTrigger) => {
						const idx = Math.min(
							steps.length - 1,
							Math.floor(self.progress * steps.length),
						);
						setMobileActiveStep(idx);
					},
				});
			});

			return () => {
				mm.revert();
			};
		}, sectionRef);

		return () => {
			ctx.revert();
		};
	}, [steps]);

	useEffect(() => {
		const stepEl = mobileStepRef.current;
		if (!stepEl || steps.length === 0) {
			return;
		}
		const targets = stepEl.querySelectorAll('[data-mobile-step-animate]');
		if (targets.length === 0) {
			return;
		}
		const tw = gsap.fromTo(
			targets,
			{ opacity: 0, y: 16 },
			{
				opacity: 1,
				y: 0,
				duration: 0.35,
				ease: 'power2.out',
				stagger: 0.06,
			},
		);
		return () => {
			tw.kill();
		};
	}, [mobileActiveStep, steps.length]);

	return (
		<section
			ref={sectionRef}
			id="how-it-works"
			className="bg-[#F9F4F0] px-5 py-12 pb-16"
			aria-labelledby="quick-start-heading"
		>
			<div className="mx-auto max-w-5xl">
				<h2
					id="quick-start-heading"
					className="text-center text-[#3F3F3F] [&_span]:tracking-tight"
				>
					<span className="block text-[2.4rem] sm:text-[4.4rem] leading-tight">{line1}</span>
					<span className="-mt-2 block text-[1.8rem] sm:text-[2.5rem] font-normal">
						{line2Before}
						<span className="relative inline-block px-0.5">
							{line2Accent}
							<ChaoticUnderline className="pointer-events-none absolute -bottom-0.5 left-0 w-[108%] -translate-x-[4%]" />
						</span>
					</span>
				</h2>

				<div
					ref={desktopWrapRef}
					className="relative mt-14 hidden min-h-[620px] w-full md:block"
				>
					<div className="absolute left-1/2 top-1/2 z-[2] w-[30vw] -translate-x-1/2 -translate-y-[46%]">
						<StudioPhoneFrame className="w-[min(23vw,20rem)]" />
					</div>

					<div className="absolute left-0 top-[2%] max-w-[min(240px,28vw)] text-left">
						<p className={scriptClass}>
							<span
								ref={(el) => {
									labelRefs.current[0] = el;
								}}
							>
								{steps[0]?.label}
							</span>
						</p>
						<p
							ref={(el) => {
								bodyRefs.current[0] = el;
							}}
							className="mt-5 text-[1.5em] leading-[1.1] text-[#3F3F3F] font-medium"
						>
							{steps[0]?.text}
						</p>
						<img
							ref={(el) => {
								arrowRefs.current[0] = el;
							}}
							src="/quickstart-arrow-1.svg"
							alt=""
							aria-hidden
							className="pointer-events-none absolute -right-[5rem] top-[120%] hidden h-[120px] w-[140px] md:block"
						/>
					</div>

					<div className="absolute -right-[5rem] top-[34%] max-w-[min(280px,30vw)] text-left">
						<p className={scriptClass}>
							<span
								ref={(el) => {
									labelRefs.current[1] = el;
								}}
							>
								{steps[1]?.label}
							</span>
						</p>
						<p
							ref={(el) => {
								bodyRefs.current[1] = el;
							}}
							className="mt-5 text-[1.5em] leading-[1.1] text-[#3F3F3F] font-medium"
						>
							{steps[1]?.text}
						</p>
						<img
							ref={(el) => {
								arrowRefs.current[1] = el;
							}}
							src="/quickstart-arrow-2.svg"
							alt=""
							aria-hidden
							className="pointer-events-none absolute -left-[7.5rem] top-[100%] hidden aspect-square w-[140px] md:block"
						/>
					</div>

					<div className="absolute bottom-[2%] left-[3%] max-w-[min(260px,28vw)] text-left">
						<p className={scriptClass}>
							<span
								ref={(el) => {
									labelRefs.current[2] = el;
								}}
							>
								{steps[2]?.label}
							</span>
						</p>
						<p
							ref={(el) => {
								bodyRefs.current[2] = el;
							}}
							className="mt-5 text-[1.5em] leading-[1.1] text-[#3F3F3F] font-medium"
						>
							{steps[2]?.text}
						</p>
						<img
							ref={(el) => {
								arrowRefs.current[2] = el;
							}}
							src="/quickstart-arrow-3.svg"
							alt=""
							aria-hidden
							className="pointer-events-none absolute -right-[2rem] bottom-[72%] hidden aspect-square w-[140px] md:block"
						/>
					</div>
				</div>

				<div ref={mobilePinRef} className="mt-10 md:hidden">
					<div className="grid h-[88svh] grid-rows-[auto_1fr] items-start gap-6">
						<div ref={mobileStepRef} className="mx-auto max-w-sm text-center">
							<p
								data-mobile-step-animate
								className="font-shadows-into-light-two text-[2.2rem] leading-none text-[#D9534F]"
							>
								{steps[mobileActiveStep]?.label}
							</p>
							<p
								data-mobile-step-animate
								className="mx-auto mt-4 max-w-[24ch] text-[1.35rem] leading-[1.18] min-h-[6rem] font-medium text-[#3F3F3F]"
							>
								{steps[mobileActiveStep]?.text}
							</p>
							<div className="mt-5 flex justify-center gap-2.5" role="group">
								{steps.map((_, i) => (
									<span
										key={`mobile-step-dot-${i}`}
										className={`h-2.5 w-2.5 rounded-full transition-[transform,opacity] duration-300 ${
											i === mobileActiveStep
												? 'scale-125 opacity-100 bg-[#D9534F]'
												: 'scale-100 opacity-45 bg-[#D9534F]'
										}`}
										aria-hidden
									/>
								))}
							</div>
						</div>
						<div className="flex items-end justify-center">
							<StudioPhoneFrame className="w-[min(72vw,18rem)]" />
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
