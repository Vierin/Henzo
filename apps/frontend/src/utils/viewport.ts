'use client';

import { ScrollTrigger } from 'gsap/ScrollTrigger';

let stableViewportHeight = 0;
let stableViewportWidth = 0;
let scrollTriggerRefreshTimer: ReturnType<typeof setTimeout> | null = null;

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
