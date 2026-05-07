'use client';

import { StudioPhoneFrame } from '@/components/landing/studioPhoneFrame';
import { LandingEntryNotificationCard } from '@/components/landing/landingEntryNotificationCard';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLayoutEffect, useRef } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';

export function LandingPhoneShowcaseSection() {
	const t = useTranslation();
	const sectionRef = useRef<HTMLElement>(null);
	const phoneRef = useRef<HTMLDivElement>(null);
	const circlesRef = useRef<HTMLImageElement>(null);
	const card1Ref = useRef<HTMLDivElement>(null);
	const card2Ref = useRef<HTMLDivElement>(null);
	const entryTitle = String(t('homepage.studio.hero.entryNotificationTitle'));
	const entryText = String(t('homepage.studio.hero.entryNotificationText'));
	const entryTitle2 = String(t('homepage.studio.hero.entryNotification2Title'));
	const entryText2 = String(t('homepage.studio.hero.entryNotification2Text'));

	useLayoutEffect(() => {
		const section = sectionRef.current;
		const phone = phoneRef.current;
		const circlesEl = circlesRef.current;
		const card1 = card1Ref.current;
		const card2 = card2Ref.current;
		if (!section || !phone || !circlesEl || !card1 || !card2) return;

		gsap.registerPlugin(ScrollTrigger);
		const isWebKit =
			typeof navigator !== 'undefined' &&
			/Safari/i.test(navigator.userAgent) &&
			!/(Chrome|Chromium|Edg)/i.test(navigator.userAgent);
		const circlesSrc = isWebKit
			? '/images/circles-safari.webp'
			: '/images/circles.webp';
		if (circlesEl.getAttribute('src') !== circlesSrc) {
			circlesEl.setAttribute('src', circlesSrc);
		}

		const ctx = gsap.context(() => {
			gsap.set([phone, circlesEl], {
				willChange: 'transform, opacity',
				backfaceVisibility: 'hidden',
				transformPerspective: 1000,
			});

			const makeCardLoop = (cardWrap: HTMLDivElement, delaySec: number) => {
				const main = cardWrap.querySelector<HTMLElement>('[data-entry-main]');
				const near = cardWrap.querySelector<HTMLElement>('[data-entry-shadow-near]');
				const far = cardWrap.querySelector<HTMLElement>('[data-entry-shadow-far]');
				if (!main || !near || !far) {
					return;
				}

				gsap.set(main, {
					opacity: 0,
					scale: 0.7,
					yPercent: 40,
					transformOrigin: 'bottom center',
				});
				gsap.set(near, { opacity: 0, scale: 0.86, y: 32 });
				gsap.set(far, { opacity: 0, scale: 0.8, y: 40 });

				const tl = gsap.timeline({ repeat: -1, delay: delaySec });
				tl.to(main, {
					opacity: 1,
					scale: 1,
					yPercent: 0,
					duration: 0.4,
					ease: 'power2.out',
				});
				tl.to(
					near,
					{
						opacity: 1,
						scale: 0.98,
						y: 0,
						duration: 0.15,
						ease: 'power2.out',
					},
					0.1,
				);
				tl.to(
					far,
					{
						opacity: 1,
						scale: 0.96,
						y: 0,
						duration: 0.15,
						ease: 'power2.out',
					},
					0.2,
				);
				tl.to(
					[near, far],
					{
						opacity: 0,
						duration: 0.25,
						ease: 'power1.in',
					},
					'+=0.15',
				);
				tl.to({}, { duration: 1.7 });
				tl.to(main, { opacity: 0, duration: 0.45, ease: 'power1.in' });
				tl.set(main, { opacity: 0, scale: 0.7, yPercent: 40 });
				tl.set(near, { opacity: 0, scale: 0.86, y: 32 });
				tl.set(far, { opacity: 0, scale: 0.8, y: 40 });
			};

			makeCardLoop(card1, 0);
			makeCardLoop(card2, 2);

			// Телефон: движение вниз
			gsap.fromTo(
				phone,
				{ scale: 1, yPercent: 0, force3D: true },
				{
					scale: 0.9,
					yPercent: 70,
					ease: 'none',
					force3D: true,
					scrollTrigger: {
						trigger: section,
						markers: false,
						start: 'top 25%',
						end: 'bottom bottom',
						scrub: 0.6,
						invalidateOnRefresh: true,
					},
				},
			);

			// Кружки: появление
			gsap.fromTo(
				circlesEl,
				isWebKit
					? { scale: 0.94, y: 36, autoAlpha: 0 }
					: { scale: 0.85, rotate: 120, autoAlpha: 0 },
				{
					scale: 1,
					rotate: 0,
					y: 0,
					autoAlpha: 1,
					ease: 'none',
					force3D: !isWebKit,
					scrollTrigger: {
						trigger: section,
						markers: false,
						start: 'center 70%',
						end: 'bottom 70%',
						scrub: 0.6,
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
					ref={card1Ref}
					className="pointer-events-none absolute left-[max(1rem,2vw)] top-[5%] z-20 hidden w-[min(350px,50vw)] lg:block"
				>
					<LandingEntryNotificationCard
						title={entryTitle}
						text={entryText}
						time="14:00"
						iconSrc="/images/icon-rocket.png"
						iconAlt="Reservation icon"
					/>
				</div>
				<div
					ref={card2Ref}
					className="pointer-events-none absolute left-[max(3rem,4vw)] top-[25%] z-20 hidden w-[min(350px,50vw)] lg:block"
				>
					<LandingEntryNotificationCard
						title={entryTitle2}
						text={entryText2}
						time="19:35"
						iconSrc="/images/icon-star.png"
						iconAlt="Review icon"
					/>
				</div>
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
