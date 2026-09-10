'use client';

import { useSearchParams } from 'next/navigation';
import { AppOpenLanding } from '@/components/public/appOpenLanding';
import { PublicClassDetailView } from '@/components/public/publicClassDetailView';
import { useTranslation } from '@/contexts/LanguageContext';
import { extractLocaleFromPath, type Locale } from '@/i18n/routing';
import { usePathname } from 'next/navigation';

export function ClassShareLanding() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const t = useTranslation();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const studioId = searchParams.get('studioId')?.trim() ?? '';
  const sessionId = searchParams.get('sessionId')?.trim() ?? '';
  const startsAt = searchParams.get('startsAt')?.trim() ?? '';

  const hasValidLink =
    studioId.length > 0 && sessionId.length > 0 && startsAt.length > 0;

  if (hasValidLink) {
    return (
      <PublicClassDetailView
        studioId={studioId}
        sessionId={sessionId}
        startsAtHint={startsAt}
        locale={locale}
      />
    );
  }

  const deepLink = 'henzo://class';

  return (
    <AppOpenLanding
      title={t('appOpen.classInvite.title')}
      description={t('appOpen.classInvite.description')}
      deepLink={deepLink}
      autoOpenOnMobile={false}
      icon="class"
    />
  );
}
