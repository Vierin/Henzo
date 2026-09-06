export type OwnerStudio = {
  id: string;
  name: string;
  slug?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  status?: string | null;
  timezone?: string | null;
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
};

export type OwnerStaffMember = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  accessLevel?: string | null;
  studioId: string;
};

export type OwnerStudioClient = {
  studioClientId: string;
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
