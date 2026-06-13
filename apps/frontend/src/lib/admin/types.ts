export type ActivityTier =
  | 'active'
  | 'warming'
  | 'sleeping'
  | 'never_used'
  | 'draft';

export type AdminOverview = {
  activeStudios: number;
  publishedStudios: number;
  ownersActive7d: number;
  ownersWarming30d: number;
  ownersSleeping30d: number;
  ownersNeverUsed: number;
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
  createdAt: string;
  lastActivityAt: string | null;
  activityTier: ActivityTier;
  bookingsLast30d: number;
  sessionsLast30d: number;
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
  createdAt: string;
  lastActivityAt: string | null;
  activityTier: ActivityTier;
  bookingsLast30d: number;
  sessionsLast30d: number;
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
