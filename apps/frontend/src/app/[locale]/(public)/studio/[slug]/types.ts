export type PublicStudioService = {
  id: string;
  name: string;
  nameEn?: string | null;
  nameVi?: string | null;
  nameRu?: string | null;
  duration?: number | null;
  price?: number | null;
  trainingCategory?: {
    id: string;
    nameEn?: string | null;
    nameVn?: string | null;
    nameRu?: string | null;
  } | null;
};

export type PublicStudioPayload = {
  id: string;
  name: string;
  slug: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  descriptionVi?: string | null;
  descriptionRu?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  photos: string[];
  latitude?: number | null;
  longitude?: number | null;
  workingHours?: unknown;
  avgRating?: number;
  reviewCount?: number;
  services: PublicStudioService[];
};
