type TrainingLocationJson = {
  id?: string;
  name?: string;
  address?: string;
};

export function countTrainingLocations(reminderSettings: unknown): number {
  let count = 1;
  if (!reminderSettings || typeof reminderSettings !== 'object') {
    return count;
  }
  const raw = (reminderSettings as Record<string, unknown>)
    .trainingLocations;
  if (!Array.isArray(raw)) return count;
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const addr = String((entry as TrainingLocationJson).address ?? '').trim();
    if (addr.length > 0) count += 1;
  }
  return count;
}

export function resolveTrainingLocationName(
  reminderSettings: unknown,
  locationId: string | null | undefined,
  mainStudioName: string,
): string | null {
  const id = locationId?.trim();
  if (!id) return null;

  if (id === 'default') {
    const main = mainStudioName.trim();
    return main.length > 0 ? main : null;
  }

  if (!reminderSettings || typeof reminderSettings !== 'object') {
    return null;
  }
  const raw = (reminderSettings as Record<string, unknown>)
    .trainingLocations;
  if (!Array.isArray(raw)) return null;

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const loc = entry as TrainingLocationJson;
    if (loc.id !== id) continue;
    const name = String(loc.name ?? '').trim();
    return name.length > 0 ? name : null;
  }
  return null;
}
