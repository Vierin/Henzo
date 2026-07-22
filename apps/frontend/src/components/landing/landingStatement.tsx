'use client';

import { useTranslation } from '@/contexts/LanguageContext';
import { useCallback, useEffect, useState } from 'react';

const BASE = 'homepage.studio.statementBeforeSpotlight';

const ROTATE_MS = 3000;
const ROTATOR_STAGGER_MS = 20;
/** Room for ascenders + descenders inside the clip mask. */
const LINE_EM = 1.25;

function PhraseAccentRotator({
  words,
  maskClassName,
  phaseOffsetMs = 0,
}: {
  words: string[];
  /** e.g. wider min-width when rotating long phrases */
  maskClassName?: string;
  /** Delay before the first tick (same period `ROTATE_MS` afterwards) */
  phaseOffsetMs?: number;
}) {
  const safeWords = words.length > 0 ? words : [''];
  const n = safeWords.length;
  const loopWords = n > 1 ? [...safeWords, safeWords[0]] : safeWords;
  const wordsKey = safeWords.join('\u0001');

  const [index, setIndex] = useState(0);
  const [noTransition, setNoTransition] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    setIndex(0);
    setNoTransition(false);
  }, [wordsKey]);

  useEffect(() => {
    if (n <= 1 || reduceMotion) {
      return;
    }
    const tick = () => {
      setIndex((i) => {
        if (i < n) {
          return i + 1;
        }
        return i;
      });
    };
    let intervalId: number | undefined;
    let timeoutId: number | undefined;
    if (phaseOffsetMs > 0) {
      timeoutId = window.setTimeout(() => {
        intervalId = window.setInterval(tick, ROTATE_MS) as unknown as number;
      }, phaseOffsetMs) as unknown as number;
    } else {
      intervalId = window.setInterval(tick, ROTATE_MS) as unknown as number;
    }
    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [n, reduceMotion, wordsKey, phaseOffsetMs]);

  const stepPct = loopWords.length > 0 ? 100 / loopWords.length : 0;
  const transformPct = -(index * stepPct);

  const onTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLSpanElement>) => {
      if (e.propertyName !== 'transform') {
        return;
      }
      if (reduceMotion || n <= 1 || index !== n) {
        return;
      }
      setNoTransition(true);
      setIndex(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setNoTransition(false);
        });
      });
    },
    [index, n, reduceMotion],
  );

  const showIndex = reduceMotion
    ? 0
    : Math.min(index, Math.max(0, loopWords.length - 1));
  const currentWord = loopWords[showIndex] ?? loopWords[0] ?? '';

  return (
    <span
      className={`relative inline-grid shrink-0 text-left ${maskClassName ?? ''}`}
      style={{ lineHeight: LINE_EM }}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* All phrases in one cell → width = widest glyph run (not string.length). */}
      {safeWords.map((w) => (
        <span
          key={`size-${w}`}
          className="invisible col-start-1 row-start-1 whitespace-nowrap pr-[0.2em]"
          aria-hidden
        >
          {w}
        </span>
      ))}
      <span className="sr-only">{currentWord}</span>
      <span className="absolute inset-0 overflow-hidden" aria-hidden>
        <span
          className={`flex w-full flex-col items-start text-left ${noTransition ? '' : 'transition-transform duration-700 ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none'}`}
          style={{
            transform: reduceMotion
              ? 'translateY(0%)'
              : `translateY(${transformPct}%)`,
          }}
          onTransitionEnd={onTransitionEnd}
        >
          {(reduceMotion ? loopWords.slice(0, 1) : loopWords).map((w, i) => (
            <span
              key={`${i}-${w}`}
              className="block w-full shrink-0 whitespace-nowrap text-left font-normal text-[#FF6B4A]"
              style={{ height: `${LINE_EM}em`, lineHeight: LINE_EM }}
            >
              {w}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

export function LandingStatement() {
  const t = useTranslation();

  const phrase1Lead = String(t(`${BASE}.phrase1Lead`));
  const phrase2Lead = String(t(`${BASE}.phrase2Lead`));

  const rawRotating1 = t(`${BASE}.phrase1AccentRotating`);
  const rotating1 = Array.isArray(rawRotating1)
    ? rawRotating1.filter((x): x is string => typeof x === 'string')
    : [];

  const rawRotating2 = t(`${BASE}.phrase2AccentRotating`);
  const rotating2 = Array.isArray(rawRotating2)
    ? rawRotating2.filter((x): x is string => typeof x === 'string')
    : [];

  const titleText = `${phrase1Lead} ${rotating1.join(' / ')} ${phrase2Lead} ${rotating2.join(' / ')}`;

  return (
    <section
      className="relative z-[11] flex h-[80svh] items-center justify-center bg-[#FDF6F0]"
      aria-labelledby="landing-statement-before-spotlight-heading"
    >
      <h2 id="landing-statement-before-spotlight-heading" className="sr-only">
        {titleText}
      </h2>
      <div className="mx-auto flex w-full max-w-4xl flex-col flex-wrap items-baseline justify-center gap-6 px-4 text-center sm:flex-row sm:items-start sm:justify-start sm:gap-12 md:gap-8 xl:max-w-5xl min-[1800px]:max-w-7xl min-[1800px]:gap-16">
        <p
          className="inline-flex max-w-full flex-nowrap items-baseline justify-center font-normal text-[8vw] sm:text-[4vw]"
          style={{ lineHeight: LINE_EM }}
        >
          <span className="shrink-0 text-[#3F3F3F]">{phrase1Lead}</span>
          <span className="shrink-0" aria-hidden>
            &nbsp;
          </span>
          <PhraseAccentRotator words={rotating1} />
        </p>
        <p
          className="inline-flex max-w-full flex-nowrap items-baseline justify-center font-normal text-[8vw] sm:text-[4vw]"
          style={{ lineHeight: LINE_EM }}
        >
          <span className="shrink-0 text-[#3F3F3F]">{phrase2Lead}</span>
          <span className="shrink-0" aria-hidden>
            &nbsp;
          </span>
          <PhraseAccentRotator
            words={rotating2}
            maskClassName="min-w-[min(50vw,16ch)]"
            phaseOffsetMs={ROTATOR_STAGGER_MS}
          />
        </p>
      </div>
    </section>
  );
}
