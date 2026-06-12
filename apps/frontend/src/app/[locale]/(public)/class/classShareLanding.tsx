'use client';

import { useSearchParams } from 'next/navigation';
import { AppOpenLanding } from '@/components/public/appOpenLanding';
import { buildClassDeepLink } from '@/lib/appOpenFallback';

export function ClassShareLanding() {
  const searchParams = useSearchParams();
  const studioId = searchParams.get('studioId')?.trim() ?? '';
  const sessionId = searchParams.get('sessionId')?.trim() ?? '';
  const startsAt = searchParams.get('startsAt')?.trim() ?? '';

  const hasValidLink =
    studioId.length > 0 && sessionId.length > 0 && startsAt.length > 0;

  const deepLink = hasValidLink
    ? buildClassDeepLink({ studioId, sessionId, startsAt })
    : 'henzo://class';

  return (
    <AppOpenLanding
      title="You're invited to a class"
      description="Open Henzo to view the class details and book your spot."
      deepLink={deepLink}
      autoOpenOnMobile={hasValidLink}
      icon="class"
    />
  );
}
