'use client';

import { useTranslation } from '@/contexts/LanguageContext';
import { useCallback, useEffect, useMemo, useState } from 'react';

const BASE = 'homepage.studio.statementBeforeSpotlight';

const ROTATE_MS = 3000;
const ROTATOR_STAGGER_MS = 20;

const LINE_EM = 1.2;

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
  const longestWord = useMemo(
    () =>
      safeWords.reduce(
        (best, word) => (word.length > best.length ? word : best),
        '',
      ),
    [wordsKey],
  );

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

  const lineStyle = {
    height: `${LINE_EM}em`,
    minHeight: `${LINE_EM}em`,
  } as const;

  const showIndex = reduceMotion
    ? 0
    : Math.min(index, Math.max(0, loopWords.length - 1));
  const currentWord = loopWords[showIndex] ?? loopWords[0] ?? '';

  return (
    <span
      className={`inline-grid shrink-0 align-baseline ${maskClassName ?? ''}`}
      style={lineStyle}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Invisible sizer: column width = longest phrase, no clipping */}
      <span
        className="invisible col-start-1 row-start-1 whitespace-nowrap font-normal leading-none"
        style={lineStyle}
        aria-hidden
      >
        {longestWord}
      </span>
      <span className="sr-only">{currentWord}</span>
      <span
        className="col-start-1 row-start-1 overflow-hidden"
        style={{ ...lineStyle, maxHeight: `${LINE_EM}em` }}
        aria-hidden
      >
        <span
          className={`inline-flex flex-col ${noTransition ? '' : 'transition-transform duration-700 ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none'}`}
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
              className="flex shrink-0 items-center justify-start whitespace-nowrap font-normal leading-none text-[#FF6B4A]"
              style={lineStyle}
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
        <p className="inline-flex max-w-full flex-nowrap items-baseline justify-center font-normal leading-none text-[8vw] sm:text-[4vw]">
          <span className="shrink-0 text-[#3F3F3F]">{phrase1Lead}</span>
          <span className="shrink-0" aria-hidden>
            &nbsp;
          </span>
          <PhraseAccentRotator words={rotating1} />
        </p>
        <p className="inline-flex max-w-full flex-nowrap items-baseline justify-center font-normal leading-none text-[8vw] sm:text-[4vw]">
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
