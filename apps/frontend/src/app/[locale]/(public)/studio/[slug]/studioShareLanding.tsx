'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { AppOpenLanding } from '@/components/public/appOpenLanding';
import { useTranslation } from '@/contexts/LanguageContext';
import { buildStudioDeepLink } from '@/lib/appOpenFallback';

export function StudioShareLanding() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const t = useTranslation();

  const slugOrId = (params.slug ?? '').trim();
  const studioName = searchParams.get('name')?.trim() ?? '';

  const hasValidLink = slugOrId.length > 0;
  const deepLink = hasValidLink
    ? buildStudioDeepLink(slugOrId)
    : 'henzo://studio';

  const title = studioName
    ? t('appOpen.studioShare.titleNamed').replace('{name}', studioName)
    : t('appOpen.studioShare.titleGeneric');

  return (
    <AppOpenLanding
      title={title}
      description={t('appOpen.studioShare.description')}
      deepLink={deepLink}
      autoOpenOnMobile={hasValidLink}
      icon="studio"
    />
  );
}
