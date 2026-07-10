export type StudioStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

export interface StudioPhotoAsset {
  id?: string;
  url: string;
  sortOrder?: number;
}

export interface Studio {
  id: string;
  name?: string | null;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  instagram?: string | null;
  logoUrl?: string | null;
  photos?: string[] | null;
  photoGallery?: StudioPhotoAsset[] | null;
  workingHours?: Record<string, unknown> | null;
  reminderSettings?: Record<string, unknown> | null;
  slug?: string | null;
  status: StudioStatus;
  autoConfirmBookings?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  createdAt?: string | null;
}

export interface OnboardingStep {
  required: boolean;
  completed: boolean;
}

export interface StudioOnboardingChecklist {
  studioId: string;
  status: string;
  requiredCompleted: boolean;
  canPublish: boolean;
  missingRequiredSteps: string[];
  hasTraining: OnboardingStep;
  hasPhoto: OnboardingStep;
  hasLogo: OnboardingStep;
  hasDescription: OnboardingStep;
  contactsConfigured: OnboardingStep;
}

export interface OwnerTrainingSession {
  sessionId: string;
  trainingId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  capacity: number;
  enrolledCount: number;
  attendedCount: number;
  trainingName: string;
  trainingPrice?: number | null;
  trainingDurationMinutes?: number | null;
  trainingDisplayColorHex?: string | null;
  trainingLanguage?: string | null;
  trainerName: string;
  trainerId?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  waitlistCount: number;
}

export interface OwnerSessionEnrollment {
  enrollmentId: string;
  userId: string;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  status: string;
  createdAt?: string | null;
}

export interface OwnerStudioClient {
  userId: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  isGuest: boolean;
  visitsCount: number;
  lastVisit?: string | null;
  notes?: string | null;
  source?: string | null;
}

export interface OwnerClientBlock {
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface TrainingCategory {
  id: number;
  nameEn: string;
  nameRu?: string | null;
  nameVn?: string | null;
}

export interface Training {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  duration?: number | null;
  studioId?: string | null;
  trainingCategoryId?: number | null;
  categoryName?: string | null;
  displayColor?: string | null;
  trainerNames?: string[];
  language?: string | null;
}

export interface StaffMember {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  accessLevel?: string | null;
  studioId?: string | null;
}

export interface OwnerBooking {
  id: string;
  status: string;
  startsAt?: string | null;
  clientName?: string | null;
  trainingName?: string | null;
}

export interface Subscription {
  id: string;
  type: string;
  status: string;
  currentPeriodEnd?: string | null;
}

export interface StudioAnalytics {
  totalBookings: number;
  totalClients: number;
  completionRate?: number | null;
  totalRevenue?: number | null;
}

export interface NotificationInboxItem {
  id: string;
  type: string;
  title?: string | null;
  body?: string | null;
  read: boolean;
  createdAt: string;
  payload?: Record<string, unknown> | null;
}

export interface StudioReview {
  id: string;
  rating: number;
  comment?: string | null;
  clientName?: string | null;
  createdAt: string;
}
