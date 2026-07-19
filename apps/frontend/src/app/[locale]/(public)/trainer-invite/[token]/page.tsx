'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { AppOpenLanding } from '@/components/public/appOpenLanding';
import { buildTrainerInviteDeepLink } from '@/lib/appOpenFallback';
import { useTranslation } from '@/contexts/LanguageContext';

function TrainerInviteContent() {
  const { token } = useParams<{ token: string }>();
  const t = useTranslation();

  return (
    <AppOpenLanding
      title={t('appOpen.trainerInvite.title')}
      description={t('appOpen.trainerInvite.description')}
      deepLink={buildTrainerInviteDeepLink(token)}
      icon="invite"
      footer={
        <p className="text-xs text-gray-400">
          {t('appOpen.trainerInvite.expiry')}
        </p>
      }
    />
  );
}

export default function TrainerInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      }
    >
      <TrainerInviteContent />
    </Suspense>
  );
}
