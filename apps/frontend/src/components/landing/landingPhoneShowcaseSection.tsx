'use client';

import { StudioPhoneFrame } from '@/components/landing/studioPhoneFrame';
import { LandingEntryNotificationCard } from '@/components/landing/landingEntryNotificationCard';
import { getStableViewportHeight } from '@/utils/viewport';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLayoutEffect, useRef } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';

function phoneMotion(isMobile: boolean) {
  const h = isMobile
    ? getStableViewportHeight() || window.innerHeight
    : window.innerHeight;
  return isMobile
    ? {
        startY: Math.round(h * -0.17),
        endY: Math.round(h * -0.6),
      }
    : { startY: h * -0.06, endY: h * 0.42 };
}

export function LandingPhoneShowcaseSection() {
  const t = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const phoneFrameRef = useRef<HTMLDivElement>(null);
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
    const phoneFrame = phoneFrameRef.current;
    const circlesEl = circlesRef.current;
    const card1 = card1Ref.current;
    const card2 = card2Ref.current;
    if (!section || !phone || !phoneFrame || !circlesEl || !card1 || !card2)
      return;

    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

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
      gsap.set(phoneFrame, {
        y: 0,
        force3D: true,
      });

      const makeCardLoop = (cardWrap: HTMLDivElement, delaySec: number) => {
        const main = cardWrap.querySelector<HTMLElement>('[data-entry-main]');
        const near = cardWrap.querySelector<HTMLElement>(
          '[data-entry-shadow-near]',
        );
        const far = cardWrap.querySelector<HTMLElement>(
          '[data-entry-shadow-far]',
        );
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

      const phoneScrollTrigger = {
        trigger: section,
        start: 'top 55%',
        end: 'bottom bottom',
        scrub: true,
        fastScrollEnd: true,
        invalidateOnRefresh: true,
      };

      const mm = gsap.matchMedia();

      mm.add('(min-width: 768px)', () => {
        const { startY, endY } = phoneMotion(false);
        gsap.fromTo(
          phoneFrame,
          { y: startY },
          {
            y: endY,
            ease: 'none',
            scrollTrigger: phoneScrollTrigger,
          },
        );
      });

      mm.add('(max-width: 767px)', () => {
        let { startY, endY } = phoneMotion(true);

        gsap.set(phoneFrame, { y: startY, force3D: true });

        ScrollTrigger.create({
          trigger: section,
          start: 'top 55%',
          end: 'bottom bottom',
          pin: phone,
          pinSpacing: false,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: () => {
            ({ startY, endY } = phoneMotion(true));
          },
          onUpdate: (self: ScrollTrigger) => {
            const y = Math.round(startY + (endY - startY) * self.progress);
            gsap.set(phoneFrame, { y, force3D: true });
          },
        });
      });

      gsap.fromTo(
        circlesEl,
        { scale: 0.92, y: 24, autoAlpha: 0 },
        {
          scale: 1,
          y: 0,
          autoAlpha: 1,
          ease: 'none',
          force3D: true,
          scrollTrigger: {
            trigger: section,
            start: 'center 70%',
            end: 'bottom 70%',
            scrub: true,
            fastScrollEnd: true,
            invalidateOnRefresh: true,
          },
        },
      );

      return () => {
        mm.revert();
      };
    }, section);

    let orientationRefreshTimer: ReturnType<typeof setTimeout> | null = null;
    const handleOrientationChange = () => {
      if (orientationRefreshTimer !== null) {
        clearTimeout(orientationRefreshTimer);
      }
      orientationRefreshTimer = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 400);
    };

    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      ctx.revert();
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (orientationRefreshTimer !== null) {
        clearTimeout(orientationRefreshTimer);
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative z-[12] -mt-[65svh] sm:-mt-[55svh] h-[170svh] pointer-events-none"
      aria-label="App preview"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 bottom-[5%] left-1/2 z-0 w-[200vw] -translate-x-1/2 sm:bottom-[-25%] sm:w-full">
          <img
            ref={circlesRef}
            src="/images/circles.webp"
            alt=""
            aria-hidden="true"
            className="h-auto w-full origin-center will-change-transform transform-gpu"
            draggable={false}
          />
        </div>
      </div>
      <div className="relative z-10 mx-auto h-full w-full max-w-6xl px-4 sm:px-6">
        <div
          ref={card1Ref}
          className="pointer-events-none absolute left-[max(1rem,2vw)] top-[1%] z-20 hidden w-[min(350px,50vw)] sm:top-[5%] lg:block"
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
          className="pointer-events-none absolute left-[max(2rem,3vw)] top-[15%] z-20 hidden w-[min(350px,50vw)] lg:block"
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
          className="relative top-0 z-10 flex h-[100svh] w-full items-center justify-center md:sticky"
        >
          <div
            ref={phoneFrameRef}
            className="origin-center md:will-change-transform md:transform-gpu md:[backface-visibility:hidden]"
          >
            <StudioPhoneFrame />
          </div>
        </div>
      </div>
    </section>
  );
}
