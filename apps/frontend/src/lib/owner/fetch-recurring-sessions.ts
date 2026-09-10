import { apiClient } from '@/lib/api-client';

export type RecurringSlot = {
  day: number;
  startTime: string;
};

export type CreateRecurringSessionsBody = {
  studioId: string;
  trainingId: string;
  capacity: number;
  trainerId?: string;
  locationId?: string;
  daysOfWeek?: number[];
  startTime?: string;
  slots?: RecurringSlot[];
  weeksCount?: number;
  startsFromDate: string;
  endsOnDate: string;
  timezone?: string;
};

export type RecurringCreationResult = {
  createdCount: number;
  skippedCount: number;
};

export async function createRecurringTrainingSessions(
  body: CreateRecurringSessionsBody,
): Promise<RecurringCreationResult> {
  const raw = await apiClient.post<
    | RecurringCreationResult
    | { data?: RecurringCreationResult; createdCount?: number }
  >('/fitness/training-sessions/recurring', {
    timezone: 'Asia/Ho_Chi_Minh',
    ...body,
  });

  const data =
    raw && typeof raw === 'object' && 'data' in raw && raw.data
      ? raw.data
      : (raw as RecurringCreationResult);

  return {
    createdCount: Number(data?.createdCount ?? 0),
    skippedCount: Number(data?.skippedCount ?? 0),
  };
}
