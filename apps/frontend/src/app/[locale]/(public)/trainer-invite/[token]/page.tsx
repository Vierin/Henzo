'use client';

import { useParams } from 'next/navigation';
import { AppOpenLanding } from '@/components/public/appOpenLanding';
import { buildTrainerInviteDeepLink } from '@/lib/appOpenFallback';

export default function TrainerInvitePage() {
  const { token } = useParams<{ token: string }>();

  return (
    <AppOpenLanding
      title="You've been invited!"
      description="You've been added as a trainer on Henzo. Open the app to complete your registration."
      deepLink={buildTrainerInviteDeepLink(token)}
      icon="invite"
      footer={
        <p className="text-xs text-gray-400">
          This invitation expires in 7 days.
        </p>
      }
    />
  );
}
