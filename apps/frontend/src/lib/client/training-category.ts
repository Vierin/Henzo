import type { Locale } from '@/i18n/routing';
import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  Dumbbell,
  Flower2,
  HeartPulse,
  LayoutGrid,
  MoreHorizontal,
  Music2,
  PersonStanding,
  Sparkles,
  Waves,
  Wrench,
} from 'lucide-react';

export interface PublicTrainingCategory {
  id: number;
  nameEn: string;
  nameRu: string;
  nameVn: string;
  chipBgHex: string;
  chipFgHex: string | null;
  slug: string;
}

function slugFromCategoryNameEn(nameEn: string): string {
  return nameEn
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parsePublicTrainingCategory(
  json: Record<string, unknown>,
): PublicTrainingCategory | null {
  const id = Number(json.id);
  const nameEn = String(json.nameEn ?? json.name_en ?? '').trim();
  if (!id || !nameEn) return null;

  return {
    id,
    nameEn,
    nameRu: String(json.nameRu ?? json.name_ru ?? '').trim(),
    nameVn: String(json.nameVn ?? json.name_vn ?? '').trim(),
    chipBgHex: String(json.chipBgHex ?? json.chip_bg_hex ?? '#6B7280').trim(),
    chipFgHex: (json.chipFgHex ?? json.chip_fg_hex)?.toString().trim() ?? null,
    slug: slugFromCategoryNameEn(nameEn),
  };
}

export function parsePublicTrainingCategories(
  raw: unknown,
): PublicTrainingCategory[] {
  const items = Array.isArray(raw)
    ? raw
    : raw &&
        typeof raw === 'object' &&
        Array.isArray((raw as { data?: unknown }).data)
      ? (raw as { data: unknown[] }).data
      : [];

  const parsed = items
    .map((item) =>
      item && typeof item === 'object'
        ? parsePublicTrainingCategory(item as Record<string, unknown>)
        : null,
    )
    .filter((c): c is PublicTrainingCategory => c != null);

  const rest = parsed.filter((c) => c.nameEn.trim().toLowerCase() !== 'other');
  const other = parsed.filter((c) => c.nameEn.trim().toLowerCase() === 'other');

  return [...rest, ...other];
}

export function trainingCategoryLabel(
  category: PublicTrainingCategory,
  locale: Locale,
): string {
  if (locale === 'vi' && category.nameVn) return category.nameVn;
  if (locale === 'ru' && category.nameRu) return category.nameRu;
  return category.nameEn;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  yoga: PersonStanding,
  pilates: Waves,
  stretching: Sparkles,
  strength: Dumbbell,
  meditation: Flower2,
  recovery: HeartPulse,
  dance: Music2,
  workshop: Wrench,
  event: CalendarDays,
  other: LayoutGrid,
};

export function trainingCategoryIcon(
  category: PublicTrainingCategory,
): LucideIcon {
  return CATEGORY_ICONS[category.slug] ?? MoreHorizontal;
}

export function trainingCategoryHref(
  category: PublicTrainingCategory,
  locale: Locale,
): string {
  return `/${locale}?category=${encodeURIComponent(category.slug)}#nearby-classes`;
}
