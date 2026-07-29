'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { AppOpenLanding } from '@/components/public/appOpenLanding';
import { StudioClaimConfirmLanding } from '@/components/public/studioClaimConfirmLanding';
import { buildStudioClaimDeepLink } from '@/lib/appOpenFallback';
import { useTranslation } from '@/contexts/LanguageContext';

function StudioClaimContent() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const action = searchParams.get('action') || 'manage';
  const t = useTranslation();

  if (action === 'confirm') {
    return <StudioClaimConfirmLanding token={token} />;
  }

  return (
    <AppOpenLanding
      title={t('appOpen.studioClaim.title')}
      description={t('appOpen.studioClaim.description')}
      deepLink={buildStudioClaimDeepLink(token, 'manage')}
      icon="invite"
      footer={
        <p className="text-xs text-gray-400">
          {t('appOpen.studioClaim.expiry')}
        </p>
      }
    />
  );
}

export default function StudioClaimPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      }
    >
      <StudioClaimContent />
    </Suspense>
  );
}
