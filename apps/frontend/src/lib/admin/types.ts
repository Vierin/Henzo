export type ActivityTier =
  | 'active'
  | 'warming'
  | 'sleeping'
  | 'never_used'
  | 'draft';

export type AdminOverview = {
  activeStudios: number;
  onboardingIncomplete: number;
  expiringSubscriptions7d: number;
  publishedStudios: number;
  ownersActive7d: number;
  ownersWarming30d: number;
  ownersSleeping30d: number;
  ownersNeverUsed: number;
  bookingsLast7d: number;
  newStudiosLast30d: number;
  openFeedbackCount: number;
  todayBookings: number;
  failedNotifications24h: number;
  failedPayments24h: number;
  crashFreeRate7d: number | null;
  links: { crashlytics: string; sentry: string };
};

export type AdminStudioRow = {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  email?: string | null;
  createdAt: string;
  lastActivityAt: string | null;
  activityTier: ActivityTier;
  bookingsLast30d: number;
  sessionsLast30d: number;
  clientsCount: number;
  onboardingGaps: string[];
  intendedOwnerEmail?: string | null;
  claimedAt?: string | null;
  isUnclaimed?: boolean;
  /** Owned by SYSTEM_STUDIO_OWNER (ops placeholder), not a real owner. */
  isSystemOwned?: boolean;
  User: { id: string; email: string; name: string | null };
  Subscription: {
    id?: string;
    type: string;
    status: string;
    currentPeriodEnd: string | null;
    manualOverride?: boolean;
  } | null;
};

export type OnboardingChecklist = {
  studioId: string;
  status: string;
  requiredCompleted: boolean;
  canPublish: boolean;
  missingRequiredSteps: string[];
  steps: Record<string, { required: boolean; completed: boolean }>;
};

export type AdminStudioDetail = {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  logoUrl: string | null;
  photos: string[];
  photoGallery: unknown;
  workingHours: unknown;
  reminderSettings: unknown;
  intendedOwnerEmail?: string | null;
  claimedAt?: string | null;
  isUnclaimed?: boolean;
  isSystemOwned?: boolean;
  createdAt: string;
  lastActivityAt: string | null;
  activityTier: ActivityTier;
  bookingsLast30d: number;
  sessionsLast30d: number;
  clientsCount: number;
  User: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
  };
  Subscription: {
    id: string;
    type: string;
    status: string;
    startDate: string;
    currentPeriodEnd: string | null;
    manualOverride: boolean;
    manualOverrideAt: string | null;
    manualOverrideBy: string | null;
  } | null;
  _count: {
    Booking: number;
    TrainingSession: number;
    StudioClients: number;
    Training: number;
    Trainer: number;
  };
  onboardingChecklist: OnboardingChecklist;
};

export type AdminSubscription = {
  id: string;
  studioId: string;
  type: string;
  status: string;
  startDate: string;
  currentPeriodEnd: string | null;
  manualOverride: boolean;
  Studio?: { id: string; name: string; slug: string | null; status: string };
};

export type StudioAnalyticsData = {
  period: { from: string; to: string };
  analyticsTier: string;
  isPro: boolean;
  revenueTotal: number;
  bookingCount: number;
  averagePerBooking: number;
  noshowCount: number;
  attendanceRate: number | null;
  trainingSessionsScheduled: number;
  enrollmentsActive: number;
  clients: {
    total: number;
    regular: number;
    newInPeriod: number;
    inactive: number;
  };
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type AdminSettings = {
  nodeEnv: string;
  ga4Enabled: boolean;
  sentryEnabled: boolean;
  firebasePushEnabled: boolean;
  telegramFeedbackEnabled: boolean;
  links: { crashlytics: string; sentry: string };
  adminAllowedEmailsConfigured: boolean;
};

export type AdminTraining = {
  id: string;
  name: string;
  duration: number;
  price: number;
  trainingCategoryId: number | null;
  description: string | null;
};

export type AdminTrainer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  accessLevel: string;
};

export type AdminBooking = {
  id: string;
  status: string;
  startsAt: string;
  createdAt: string;
  User: { name: string | null; email: string } | null;
  Training: { name: string } | null;
  Trainer: { name: string } | null;
};

export type WeeklyActivityBucket = {
  weekStart: string;
  bookings: number;
  sessions: number;
};

export type StudioActivityResponse = {
  timeline: WeeklyActivityBucket[];
  onboardingGaps: string[];
};

export type AdminStudioClientRow = {
  id: string;
  userId: string;
  source: string;
  notes: string | null;
  rosterCreatedAt: string;
  name: string | null;
  email: string;
  phone: string | null;
  isGuest: boolean;
  visitsCount: number;
  noShowCount: number;
  lastVisitAt: string | null;
  lastNoShowAt: string | null;
};

export type AdminVisitRow = {
  id: string;
  kind: 'booking' | 'enrollment';
  status: string;
  startsAt: string;
  clientId: string;
  clientName: string | null;
  clientEmail: string;
  trainingName: string;
};

export type AdminNoShowClientRow = {
  id: string;
  userId: string;
  studioId: string;
  studioName: string;
  clientName: string | null;
  clientEmail: string;
  clientPhone: string | null;
  noShowCount: number;
  lastNoShowAt: string;
};

export type AdminPaymentEventRow = {
  id: string;
  type: string;
  severity: string;
  message: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  studioId: string | null;
  studioName: string | null;
  ownerEmail: string | null;
  /** web = Stripe checkout; mobile = App Store / Play via RevenueCat; admin = manual */
  channel?: 'web' | 'mobile' | 'admin' | 'unknown' | string;
};

export type AdminBroadcastPayload = {
  channels: 'push' | 'email' | 'both';
  title: string;
  body: string;
  audience:
    | 'all_owners'
    | 'activity_tier'
    | 'onboarding_incomplete'
    | 'studio_ids';
  activityTier?: ActivityTier;
  studioIds?: string[];
  dryRun?: boolean;
};

export type AdminBroadcastResult = {
  dryRun: boolean;
  studioCount: number;
  ownerCount: number;
  pushTokens?: number;
  emailsSent?: number;
  emailsFailed?: number;
};

export type AdminFeedbackRow = {
  id: string;
  name: string;
  email: string;
  message: string;
  platform: string | null;
  source: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
};

export type AdminOwnerRow = {
  id: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerCreatedAt: string;
  studioId: string | null;
  studioName: string | null;
  studioSlug: string | null;
  studioStatus: string | null;
  studioCreatedAt: string | null;
  onboardingGaps: string[];
  onboardingComplete: boolean;
};

export type ClientActivityTier = 'active' | 'warming' | 'sleeping' | 'never';

export type AdminDirectoryClientRow = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  isGuest: boolean;
  createdAt: string;
  bookingsCount: number;
  studiosCount: number;
  lastVisitAt: string | null;
  activityTier: ClientActivityTier;
};

export type AdminDirectoryTrainerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  accessLevel: string;
  userId: string | null;
  hasLinkedUser: boolean;
  studioId: string;
  studioName: string;
};
