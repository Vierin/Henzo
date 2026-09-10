export type OwnerStudio = {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  address?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  instagram?: string | null;
  logoUrl?: string | null;
  photos?: string[] | null;
  photoGallery?: unknown;
  workingHours?: unknown;
  status?: string | null;
  timezone?: string | null;
  currency?: string | null;
  autoConfirmBookings?: boolean | null;
  reminderSettings?: {
    bookingPeriodDays?: number;
    clientReminders?: ClientReminderRule[];
    defaultLocationName?: string;
    trainingLocations?: unknown;
    socialLinks?: unknown;
    [key: string]: unknown;
  } | null;
};

export type ClientReminderRule = {
  mode?: 'eveningBefore' | 'hoursBefore' | string;
  time?: string;
  hours?: number;
  enabled?: boolean;
};

export type OnboardingChecklist = {
  studioId: string;
  status: string;
  requiredCompleted: boolean;
  canPublish: boolean;
  missingRequiredSteps: string[];
  steps: {
    hasStudioDetails: { required: boolean; completed: boolean };
    hasTraining: { required: boolean; completed: boolean };
    hasPhoto: { required: boolean; completed: boolean };
  };
};

export type OwnerTrainingSession = {
  sessionId: string;
  trainingId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  capacity: number;
  enrolledCount: number;
  waitlistCount: number;
  attendanceSummary?: { attended: number };
  locationId?: string | null;
  locationName?: string | null;
  training: {
    name: string;
    description?: string | null;
    displayColor?: string | null;
    price?: number | null;
    duration?: number | null;
    language?: string | null;
    trainingCategory?: {
      nameEn?: string | null;
      nameVn?: string | null;
      nameRu?: string | null;
    } | null;
  };
  trainer: { id: string | null; name: string };
};

export type OwnerSessionEnrollment = {
  enrollmentId: string;
  userId: string;
  status: string;
  createdAt: string;
  cancelledAt?: string | null;
  user: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    isGuest?: boolean;
    isSyntheticGuest?: boolean;
  };
};

export type OwnerTraining = {
  id: string;
  name: string;
  description?: string | null;
  duration: number;
  price: number;
  studioId: string;
  displayColor?: string | null;
  trainingCategoryId?: number | null;
  language?: string | null;
  Staff?: { id: string; name: string }[] | null;
  trainingCategory?: {
    id: number;
    name_en?: string | null;
    name_vn?: string | null;
    name_ru?: string | null;
    chip_bg_hex?: string | null;
    chip_fg_hex?: string | null;
  } | null;
};

export type OwnerStaffMember = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  accessLevel?: string | null;
  studioId: string;
  userId?: string | null;
  Training?: { id: string; name: string; duration?: number; price?: number }[];
  invite?: { status: string; expiresAt: string } | null;
};

export type OwnerStudioClient = {
  studioClientId?: string | null;
  userId: string;
  source?: string | null;
  notes?: string | null;
  rosterCreatedAt?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  isGuest?: boolean;
  lastVisit?: string | null;
  visitsCount?: number | null;
};
