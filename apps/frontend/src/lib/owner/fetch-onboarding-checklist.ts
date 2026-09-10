import { apiClient } from '@/lib/api-client';
import type { OnboardingChecklist } from './types';

type ChecklistResponse = {
  success?: boolean;
  data?: OnboardingChecklist | null;
  needsSetup?: boolean;
};

export async function fetchOnboardingChecklist(): Promise<OnboardingChecklist | null> {
  const res = await apiClient.get<ChecklistResponse>(
    '/studios/current/onboarding-checklist',
  );
  return res.data ?? null;
}

export async function publishStudio(studioId: string): Promise<void> {
  await apiClient.patch(`/studios/${studioId}/publish`, {});
}
