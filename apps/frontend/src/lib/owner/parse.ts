import type {
  OnboardingStep,
  OwnerClientBlock,
  OwnerSessionEnrollment,
  OwnerStudioClient,
  OwnerTrainingSession,
  Studio,
  StudioOnboardingChecklist,
  StudioReview,
  StaffMember,
  Subscription,
  Training,
  TrainingCategory,
  NotificationInboxItem,
  StudioAnalytics,
} from './types';

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export function unwrapData<T>(body: unknown): T | null {
  const rec = asRecord(body);
  if (!rec) return null;
  if ('data' in rec) return (rec.data as T) ?? null;
  return body as T;
}

export function unwrapList(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  const rec = asRecord(body);
  if (!rec) return [];
  if (Array.isArray(rec.data)) return rec.data;
  return [];
}

export function parseStudio(json: Record<string, unknown>): Studio {
  const photos = Array.isArray(json.photos)
    ? json.photos.map((p) => String(p)).filter(Boolean)
    : null;
  const gallery = Array.isArray(json.photoGallery)
    ? json.photoGallery
        .filter((g) => g && typeof g === 'object')
        .map((g) => {
          const m = g as Record<string, unknown>;
          return {
            id: m.id?.toString(),
            url: String(m.url ?? ''),
            sortOrder:
              typeof m.sortOrder === 'number' ? m.sortOrder : undefined,
          };
        })
        .filter((g) => g.url)
    : null;

  return {
    id: String(json.id ?? ''),
    name: json.name as string | null | undefined,
    description: json.description as string | null | undefined,
    address: json.address as string | null | undefined,
    phone: json.phone as string | null | undefined,
    email: json.email as string | null | undefined,
    website: json.website as string | null | undefined,
    instagram: json.instagram as string | null | undefined,
    logoUrl: json.logoUrl as string | null | undefined,
    photos,
    photoGallery: gallery,
    workingHours: asRecord(json.workingHours),
    reminderSettings: asRecord(json.reminderSettings),
    slug: json.slug as string | null | undefined,
    status: (json.status as Studio['status']) ?? 'DRAFT',
    autoConfirmBookings: json.autoConfirmBookings as boolean | null | undefined,
    latitude:
      typeof json.latitude === 'number'
        ? json.latitude
        : Number(json.latitude) || null,
    longitude:
      typeof json.longitude === 'number'
        ? json.longitude
        : Number(json.longitude) || null,
    rating:
      typeof json.rating === 'number'
        ? json.rating
        : Number(json.rating) || null,
    createdAt: json.createdAt as string | null | undefined,
  };
}

function parseStep(raw: unknown, required: boolean): OnboardingStep {
  const m = asRecord(raw);
  if (!m) return { required, completed: false };
  return {
    required: m.required === true || required,
    completed: m.completed === true,
  };
}

export function parseOnboardingChecklist(
  json: Record<string, unknown>,
): StudioOnboardingChecklist {
  const steps = asRecord(json.steps) ?? {};
  const missingRaw = json.missingRequiredSteps;
  const missing: string[] = [];
  if (Array.isArray(missingRaw)) {
    for (const item of missingRaw) {
      const v = item?.toString();
      if (v) missing.push(v);
    }
  }
  return {
    studioId: String(json.studioId ?? ''),
    status: String(json.status ?? ''),
    requiredCompleted: json.requiredCompleted === true,
    canPublish: json.canPublish === true,
    missingRequiredSteps: missing,
    hasTraining: parseStep(steps.hasTraining, true),
    hasPhoto: parseStep(steps.hasPhoto, true),
    hasLogo: parseStep(steps.hasLogo, false),
    hasDescription: parseStep(steps.hasDescription, false),
    contactsConfigured: parseStep(steps.contactsConfigured, false),
  };
}

export function parseOwnerSession(
  json: Record<string, unknown>,
): OwnerTrainingSession {
  const training = asRecord(json.training);
  const trainer = asRecord(json.trainer);
  const attendance = asRecord(json.attendanceSummary);
  const trainerIdRaw = trainer?.id;

  return {
    sessionId: String(json.sessionId ?? ''),
    trainingId: String(json.trainingId ?? training?.id ?? ''),
    startsAt: String(json.startsAt ?? ''),
    endsAt: String(json.endsAt ?? ''),
    status: String(json.status ?? 'ACTIVE'),
    capacity: Number(json.capacity ?? 0),
    enrolledCount: Number(json.enrolledCount ?? 0),
    attendedCount: Number(attendance?.attended ?? json.enrolledCount ?? 0) || 0,
    trainingName: String(training?.name ?? 'Training'),
    trainingPrice:
      typeof training?.price === 'number'
        ? training.price
        : Number(training?.price ?? training?.amount) || null,
    trainingDurationMinutes:
      typeof training?.duration === 'number'
        ? training.duration
        : Number(training?.duration) || null,
    trainingDisplayColorHex: training?.displayColor?.toString() ?? null,
    trainingLanguage: training?.language?.toString() ?? null,
    trainerName: String(trainer?.name ?? '—'),
    trainerId:
      trainerIdRaw == null || String(trainerIdRaw).trim() === ''
        ? null
        : String(trainerIdRaw),
    locationId: json.locationId?.toString() ?? null,
    locationName: json.locationName?.toString() ?? null,
    waitlistCount: Number(json.waitlistCount ?? 0),
  };
}

export function parseOwnerClient(
  json: Record<string, unknown>,
): OwnerStudioClient {
  return {
    userId: String(json.userId ?? ''),
    name: json.name as string | null | undefined,
    email: json.email as string | null | undefined,
    phone: json.phone as string | null | undefined,
    isGuest: json.isGuest === true,
    visitsCount: Number(json.visitsCount ?? 0),
    lastVisit: json.lastVisit as string | null | undefined,
    notes: json.notes as string | null | undefined,
    source: json.source as string | null | undefined,
  };
}

export function parseClientBlock(
  json: Record<string, unknown>,
): OwnerClientBlock {
  return {
    userId: json.userId?.toString() ?? null,
    email: json.email?.toString() ?? null,
    phone: json.phone?.toString() ?? null,
  };
}

export function parseEnrollment(
  json: Record<string, unknown>,
): OwnerSessionEnrollment {
  return {
    enrollmentId: String(json.enrollmentId ?? json.id ?? ''),
    userId: String(json.userId ?? ''),
    clientName: json.clientName as string | null | undefined,
    clientEmail: json.clientEmail as string | null | undefined,
    clientPhone: json.clientPhone as string | null | undefined,
    status: String(json.status ?? 'ENROLLED'),
    createdAt: json.createdAt as string | null | undefined,
  };
}

function categoryLabel(m: Record<string, unknown>): string {
  const ru = m.nameRu ?? m.name_ru;
  const en = m.nameEn ?? m.name_en;
  const vn = m.nameVn ?? m.name_vn;
  if (typeof ru === 'string' && ru) return ru;
  if (typeof en === 'string' && en) return en;
  if (typeof vn === 'string' && vn) return vn;
  return '';
}

export function parseTraining(json: Record<string, unknown>): Training {
  const cat = asRecord(json.trainingCategory) ?? asRecord(json.serviceCategory);
  const staff = Array.isArray(json.staff) ? json.staff : [];
  const trainerNames = staff
    .map((s) => {
      const m = asRecord(s);
      return m?.name?.toString() ?? '';
    })
    .filter(Boolean);

  return {
    id: String(json.id ?? ''),
    name: String(json.name ?? ''),
    description: json.description as string | null | undefined,
    price:
      typeof json.price === 'number' ? json.price : Number(json.price) || null,
    duration:
      typeof json.duration === 'number'
        ? json.duration
        : Number(json.duration) || null,
    studioId: json.studioId?.toString() ?? null,
    trainingCategoryId:
      Number(json.trainingCategoryId ?? json.serviceCategoryId) || undefined,
    categoryName: cat ? categoryLabel(cat) : null,
    displayColor: json.displayColor?.toString() ?? null,
    trainerNames,
    language: json.language?.toString() ?? null,
  };
}

export function parseTrainingCategory(
  json: Record<string, unknown>,
): TrainingCategory {
  return {
    id: Number(json.id ?? 0),
    nameEn: String(json.nameEn ?? json.name_en ?? ''),
    nameRu: (json.nameRu ?? json.name_ru) as string | null | undefined,
    nameVn: (json.nameVn ?? json.name_vn) as string | null | undefined,
  };
}

export function parseStaffMember(json: Record<string, unknown>): StaffMember {
  return {
    id: String(json.id ?? ''),
    name: String(json.name ?? ''),
    email: json.email as string | null | undefined,
    phone: json.phone as string | null | undefined,
    accessLevel: json.accessLevel as string | null | undefined,
    studioId: json.studioId?.toString() ?? null,
  };
}

export function parseSubscription(json: Record<string, unknown>): Subscription {
  return {
    id: String(json.id ?? ''),
    type: String(json.type ?? ''),
    status: String(json.status ?? ''),
    currentPeriodEnd: json.currentPeriodEnd as string | null | undefined,
  };
}

export function parseAnalytics(json: Record<string, unknown>): StudioAnalytics {
  return {
    totalBookings: Number(json.totalBookings ?? json.bookings ?? 0),
    totalClients: Number(json.totalClients ?? json.clients ?? 0),
    completionRate:
      typeof json.completionRate === 'number'
        ? json.completionRate
        : Number(json.completionRate) || null,
    totalRevenue:
      typeof json.totalRevenue === 'number'
        ? json.totalRevenue
        : Number(json.totalRevenue) || null,
  };
}

export function parseNotification(
  json: Record<string, unknown>,
): NotificationInboxItem {
  return {
    id: String(json.id ?? ''),
    type: String(json.type ?? ''),
    title: json.title as string | null | undefined,
    body: json.body as string | null | undefined,
    read: json.read === true,
    createdAt: String(json.createdAt ?? ''),
    payload: asRecord(json.payload),
  };
}

export function parseReview(json: Record<string, unknown>): StudioReview {
  return {
    id: String(json.id ?? ''),
    rating: Number(json.rating ?? 0),
    comment: json.comment as string | null | undefined,
    clientName: json.clientName as string | null | undefined,
    createdAt: String(json.createdAt ?? ''),
  };
}
