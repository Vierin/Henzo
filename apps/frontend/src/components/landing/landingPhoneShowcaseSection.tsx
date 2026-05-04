'use client';

import { StudioPhoneFrame } from '@/components/landing/studioPhoneFrame';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLayoutEffect, useRef } from 'react';

/** Под hero с отрицательным margin — телефон слегка перекрывает карточку; скролл слегка увеличивает масштаб. */
export function LandingPhoneShowcaseSection() {
	const sectionRef = useRef<HTMLElement>(null);
	const phoneRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const section = sectionRef.current;
		const phone = phoneRef.current;
		if (!section || !phone) {
			return;
		}

		gsap.registerPlugin(ScrollTrigger);

		const tween = gsap.fromTo(
			phone,
			{ scale: 0.97, yPercent: 0 },
			{
				scale: 1.045,
				yPercent: 40,
				ease: 'none',
				scrollTrigger: {
					trigger: section,
					start: 'top 92%',
					end: 'top 18%',
					scrub: 1,
					invalidateOnRefresh: true,
				},
			},
		);

		return () => {
			tween.scrollTrigger?.kill();
			tween.kill();
		};
	}, []);

	return (
		<section
			ref={sectionRef}
			className="relative z-[12] -mt-[70svh] h-screen flex flex-col items-center"
			aria-label="App preview"
		>
			<div className="flex w-full max-w-6xl flex-col items-center justify-start px-4 pb-3 pt-0 sm:px-6">
				<div
					ref={phoneRef}
					className="origin-top will-change-transform [transform:translateZ(0)]"
				>
					<StudioPhoneFrame className="w-[min(78vw,300px)] sm:w-[300px] md:w-[min(46vw,320px)]" />
				</div>
			</div>
		</section>
	);
}
