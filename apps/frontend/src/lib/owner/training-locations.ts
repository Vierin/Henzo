import type { OwnerStudio } from './types';

export type TrainingLocationItem = {
  id: string;
  name: string;
  address: string;
  isDefault: boolean;
  latitude?: number | null;
  longitude?: number | null;
};

/** @deprecated use TrainingLocationItem — kept for add-training selects */
export type TrainingLocationOption = {
  id: string;
  name: string;
  address: string;
  label: string;
  isDefault?: boolean;
};

function asNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function listTrainingLocations(
  studio: OwnerStudio | null | undefined,
  mainStudioName = 'Main studio',
): TrainingLocationItem[] {
  if (!studio) return [];

  const settings = studio.reminderSettings;
  const storedName =
    typeof settings?.defaultLocationName === 'string' &&
    settings.defaultLocationName.trim()
      ? settings.defaultLocationName.trim()
      : null;

  const items: TrainingLocationItem[] = [
    {
      id: 'default',
      name: storedName || studio.name?.trim() || mainStudioName,
      address: studio.address?.trim() || '',
      isDefault: true,
      latitude: asNum(studio.latitude),
      longitude: asNum(studio.longitude),
    },
  ];

  const raw = settings?.trainingLocations;
  if (!Array.isArray(raw)) return items;

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const loc = entry as Record<string, unknown>;
    const id = String(loc.id ?? '').trim();
    if (!id || id === 'default') continue;
    const address = String(loc.address ?? '').trim();
    if (!address) continue;
    items.push({
      id,
      name: String(loc.name ?? '').trim() || id,
      address,
      isDefault: false,
      latitude: asNum(loc.latitude),
      longitude: asNum(loc.longitude),
    });
  }
  return items;
}

export function extraLocationsToJson(
  all: TrainingLocationItem[],
): Record<string, unknown>[] {
  return all
    .filter((l) => !l.isDefault && l.address.trim())
    .map((l) => ({
      id: l.id,
      name: l.name,
      address: l.address,
      isDefault: false,
      ...(l.latitude != null ? { latitude: l.latitude } : {}),
      ...(l.longitude != null ? { longitude: l.longitude } : {}),
    }));
}

export function studioTrainingLocations(
  studio: OwnerStudio | null | undefined,
): TrainingLocationOption[] {
  return listTrainingLocations(studio).map((l) => ({
    id: l.id,
    name: l.name,
    address: l.address,
    label: l.address || l.name,
    isDefault: l.isDefault,
  }));
}

export function swapDefaultTrainingLocation(args: {
  locations: TrainingLocationItem[];
  newDefaultId: string;
  mainStudioName: string;
  currentAddress: string;
  currentLat: number | null;
  currentLon: number | null;
}): {
  primaryName: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  locations: TrainingLocationItem[];
} | null {
  const { locations, newDefaultId, mainStudioName } = args;
  if (newDefaultId === 'default') return null;
  const picked = locations.find((l) => l.id === newDefaultId);
  if (!picked || picked.isDefault) return null;

  const currentDefault = locations.find((l) => l.isDefault);
  const demotedName =
    currentDefault?.name.trim() || mainStudioName || 'Main studio';
  const oldAddress = args.currentAddress.trim();

  const demoted: TrainingLocationItem | null = oldAddress
    ? {
        id: `loc_${Date.now()}`,
        name: demotedName,
        address: oldAddress,
        isDefault: false,
        latitude: args.currentLat,
        longitude: args.currentLon,
      }
    : null;

  const extras = locations.filter((l) => !l.isDefault && l.id !== newDefaultId);
  if (demoted) extras.push(demoted);

  const primaryName = picked.name.trim() || mainStudioName;
  const locationsNext: TrainingLocationItem[] = [
    {
      id: 'default',
      name: primaryName,
      address: picked.address,
      isDefault: true,
      latitude: picked.latitude ?? null,
      longitude: picked.longitude ?? null,
    },
    ...extras,
  ];

  return {
    primaryName,
    address: picked.address,
    latitude: picked.latitude ?? null,
    longitude: picked.longitude ?? null,
    locations: locationsNext,
  };
}

export function newLocationId(): string {
  return `loc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
