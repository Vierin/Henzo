'use client';

import { StudioPhoneFrame } from '@/components/landing/studioPhoneFrame';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLayoutEffect, useRef } from 'react';

export function LandingPhoneShowcaseSection() {
	const sectionRef = useRef<HTMLElement>(null);
	const phoneRef = useRef<HTMLDivElement>(null);
	const circlesRef = useRef<HTMLImageElement>(null);

	useLayoutEffect(() => {
		const section = sectionRef.current;
		const phone = phoneRef.current;
		const circlesEl = circlesRef.current;
		if (!section || !phone || !circlesEl) return;

		gsap.registerPlugin(ScrollTrigger);

		const ctx = gsap.context(() => {
			// Телефон: движение вниз
			gsap.fromTo(
				phone,
				{ scale: 1, y: 0, force3D: true },
				{
					scale: 0.9,
					y: () => window.innerHeight * 0.6,
					ease: 'none',
					force3D: true,
					scrollTrigger: {
						trigger: section,
						markers: false,
						start: 'top 25%',
						end: 'bottom bottom',
						scrub: true,
						invalidateOnRefresh: true,
					},
				},
			);

			// Кружки: появление
			gsap.fromTo(
				circlesEl,
				{ scale: 0.85, rotate: 120, autoAlpha: 0 },
				{
					scale: 1,
					rotate: 0,
					autoAlpha: 1,
					ease: 'none',
					force3D: true,
					scrollTrigger: {
						trigger: section,
						markers: false,
						start: 'center 70%',
						end: 'bottom 70%',
						scrub: true,
						invalidateOnRefresh: true,
					},
				},
			);
		}, section);

		// Пересчитываем ScrollTrigger при ресайзе
		const handleResize = () => {
			ScrollTrigger.refresh();
		};

		window.addEventListener('resize', handleResize);

		return () => {
			ctx.revert();
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	return (
		<section
			ref={sectionRef}
			className="relative z-[12] -mt-[55svh] h-[170svh] flex flex-col items-center overflow-hidden pointer-events-none"
			aria-label="App preview"
		>
			<div className="pointer-events-none absolute inset-x-0 bottom-[-10%] z-0 w-full">
				<img
					ref={circlesRef}
					src="/images/circles.webp"
					alt=""
					aria-hidden="true"
					className="h-auto w-full origin-center"
					draggable={false}
				/>
			</div>
			<div className="relative z-10 flex w-full max-w-6xl flex-col items-center justify-start px-4 pb-3 pt-0 sm:px-6">
				<div
					ref={phoneRef}
					className="will-change-transform [transform:translateZ(0)]"
				>
					<StudioPhoneFrame />
				</div>
			</div>
		</section>
	);
}
