'use client';

import { useLayoutEffect } from 'react';
import { consumeLocaleNavigationScrollReset } from '@/utils/viewport';

/** Resets scroll/ScrollTrigger after hard locale switches on the landing page. */
export function LandingScrollReset() {
  useLayoutEffect(() => {
    consumeLocaleNavigationScrollReset();
  }, []);

  return null;
}
