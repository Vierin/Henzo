'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { AppOpenLanding } from '@/components/public/appOpenLanding';
import { buildStudioDeepLink } from '@/lib/appOpenFallback';

export function StudioShareLanding() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();

  const slugOrId = (params.slug ?? '').trim();
  const studioName = searchParams.get('name')?.trim() ?? '';

  const hasValidLink = slugOrId.length > 0;
  const deepLink = hasValidLink
    ? buildStudioDeepLink(slugOrId)
    : 'henzo://studio';

  const title = studioName
    ? `Join ${studioName} on Henzo`
    : "You're invited to a studio";

  return (
    <AppOpenLanding
      title={title}
      description="Open Henzo to view the studio schedule and book a class."
      deepLink={deepLink}
      autoOpenOnMobile={hasValidLink}
      icon="studio"
    />
  );
}
