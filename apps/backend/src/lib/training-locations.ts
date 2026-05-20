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
  const raw = (reminderSettings as Record<string, unknown>).trainingLocations;
  if (!Array.isArray(raw)) return count;
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const addr = String((entry as TrainingLocationJson).address ?? '').trim();
    if (addr.length > 0) count += 1;
  }
  return count;
}

export function humanizeStudioSlug(
  slug: string | null | undefined,
): string | null {
  const raw = slug?.trim();
  if (!raw) return null;
  return raw
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function listExtraTrainingLocationNames(
  reminderSettings: unknown,
): string[] {
  const out: string[] = [];
  if (!reminderSettings || typeof reminderSettings !== 'object') {
    return out;
  }
  const raw = (reminderSettings as Record<string, unknown>).trainingLocations;
  if (!Array.isArray(raw)) return out;
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const name = String((entry as TrainingLocationJson).name ?? '').trim();
    if (name.length > 0) out.push(name);
  }
  return out;
}

/** Brand label for discovery cards (not a branch location name). */
export function resolveStudioBrandNameForDiscovery(studio: {
  name: string | null;
  slug?: string | null;
  reminderSettings?: unknown;
}): string {
  const name = studio.name?.trim() ?? '';
  const fromSlug = humanizeStudioSlug(studio.slug);
  const locCount = countTrainingLocations(studio.reminderSettings);

  if (locCount <= 1) {
    return name || fromSlug || 'Studio';
  }

  const extraNames = listExtraTrainingLocationNames(studio.reminderSettings);
  if (name.length > 0 && extraNames.includes(name)) {
    return fromSlug ?? name;
  }
  return name || fromSlug || 'Studio';
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
  const raw = (reminderSettings as Record<string, unknown>).trainingLocations;
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
