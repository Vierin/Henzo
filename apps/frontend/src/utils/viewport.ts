'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let stableViewportHeight = 0;
let stableViewportWidth = 0;
let scrollTriggerRefreshTimer: ReturnType<typeof setTimeout> | null = null;

const LOCALE_NAV_SCROLL_KEY = 'henzo-locale-nav';

/** Debounced global ScrollTrigger.refresh — use after locale/layout shifts. */
export function scheduleScrollTriggerRefresh(delayMs = 300) {
  if (typeof window === 'undefined') {
    return;
  }
  if (scrollTriggerRefreshTimer !== null) {
    clearTimeout(scrollTriggerRefreshTimer);
  }
  scrollTriggerRefreshTimer = setTimeout(() => {
    scrollTriggerRefreshTimer = null;
    ScrollTrigger.refresh();
  }, delayMs);
}

/**
 * Tear down pins/spacers and forget scroll memory before a hard locale navigation.
 * Calling setLanguage() alone re-inits ST mid-page and leaves broken pin state.
 */
export function prepareScrollTriggersForLocaleNavigation() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.getAll().forEach((st) => st.kill());
    ScrollTrigger.clearScrollMemory();
  } catch {
    // GSAP may not be loaded on non-landing routes.
  }

  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }

  try {
    window.sessionStorage.setItem(LOCALE_NAV_SCROLL_KEY, '1');
  } catch {
    // private mode / blocked storage
  }
}

/** After a locale hard-nav, reset scroll + ST memory so pins measure cleanly. */
export function consumeLocaleNavigationScrollReset() {
  if (typeof window === 'undefined') {
    return false;
  }

  let shouldReset = false;
  try {
    shouldReset = window.sessionStorage.getItem(LOCALE_NAV_SCROLL_KEY) === '1';
    if (shouldReset) {
      window.sessionStorage.removeItem(LOCALE_NAV_SCROLL_KEY);
    }
  } catch {
    return false;
  }

  if (!shouldReset) {
    return false;
  }

  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }

  try {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.clearScrollMemory();
  } catch {
    // ignore
  }

  window.scrollTo(0, 0);
  scheduleScrollTriggerRefresh(80);
  scheduleScrollTriggerRefresh(400);
  return true;
}

/**
 * Returns a stable viewport height similar to CSS 100svh.
 * Uses the smallest observed viewport height for current width/orientation,
 * so browser bottom bars don't cause layout jumps.
 */
export function getStableViewportHeight(): number {
  if (typeof window === 'undefined') {
    return 0;
  }

  const currentWidth = window.innerWidth;
  const vvHeight = window.visualViewport?.height ?? window.innerHeight;
  const currentHeight = Math.round(Math.min(window.innerHeight, vvHeight));

  // Reset baseline on orientation / real width change.
  if (
    stableViewportWidth === 0 ||
    Math.abs(currentWidth - stableViewportWidth) > 2
  ) {
    stableViewportWidth = currentWidth;
    stableViewportHeight = currentHeight;
  }

  if (stableViewportHeight === 0) {
    stableViewportHeight = currentHeight;
  } else {
    // Keep the smallest value (small viewport height / 100svh behavior).
    stableViewportHeight = Math.min(stableViewportHeight, currentHeight);
  }

  return stableViewportHeight;
}
