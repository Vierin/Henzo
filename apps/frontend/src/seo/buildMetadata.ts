import type { Metadata } from 'next';
import type { Locale } from '@/i18n/routing';
import { isLocale } from '@/i18n/routing';
import {
  PAGE_OG_IMAGES,
  PAGE_PATHS,
  PUBLIC_PAGE_COPY,
  type PublicPageId,
} from './copy';

const OG_LOCALE: Record<Locale, string> = {
  en: 'en_US',
  ru: 'ru_RU',
  vi: 'vi_VN',
};

export function siteBaseUrl(): string {
  return process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app';
}

export function resolveLocale(raw: string | undefined): Locale {
  if (raw && isLocale(raw)) return raw;
  return 'en';
}

function normalizePathAfterLocale(pathAfterLocale: string): string {
  if (!pathAfterLocale || pathAfterLocale === '/') return '';
  return pathAfterLocale.startsWith('/')
    ? pathAfterLocale
    : `/${pathAfterLocale}`;
}

/** Full pathname including locale, e.g. `/en/studio/foo` or `/vi`. */
export function localizedPath(locale: Locale, pathAfterLocale: string): string {
  const p = normalizePathAfterLocale(pathAfterLocale);
  return p ? `/${locale}${p}` : `/${locale}`;
}

export function hreflangLanguages(
  pathAfterLocale: string,
): NonNullable<Metadata['alternates']>['languages'] {
  const p = normalizePathAfterLocale(pathAfterLocale);
  return {
    'en-US': `/en${p}`,
    'ru-RU': `/ru${p}`,
    'vi-VN': `/vi${p}`,
  };
}

function absAssetUrl(path: string): string {
  const base = siteBaseUrl().replace(/\/$/, '');
  if (path.startsWith('http')) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildStaticPageMetadata(
  pageId: PublicPageId,
  locale: Locale,
  extra?: Metadata,
): Metadata {
  const copy = PUBLIC_PAGE_COPY[pageId][locale];
  const pathAfterLocale = PAGE_PATHS[pageId];
  const canonical = localizedPath(locale, pathAfterLocale);
  const ogImage = PAGE_OG_IMAGES[pageId];
  const imageUrl = absAssetUrl(ogImage);

  const base: Metadata = {
    title: copy.title,
    description: copy.description,
    metadataBase: new URL(siteBaseUrl()),
    keywords: copy.keywords,
    alternates: {
      canonical,
      languages: hreflangLanguages(pathAfterLocale),
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: canonical,
      siteName: 'Henzo',
      locale: OG_LOCALE[locale],
      type: 'website',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: copy.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.title,
      description: copy.description,
      images: [imageUrl],
      creator: '@henzo',
    },
  };

  return extra ? { ...base, ...extra } : base;
}

export type DynamicPageMetaInput = {
  /** Path after locale, e.g. `/studio/my-studio` or `/category/hair`. */
  pathAfterLocale: string;
  title: string;
  description: string;
  keywords?: string[];
  /** Relative (/path) or absolute image URLs for OG/Twitter. */
  images?: string[];
  type?: 'website' | 'article';
};

export function buildDynamicPageMetadata(
  locale: Locale,
  input: DynamicPageMetaInput,
): Metadata {
  const {
    pathAfterLocale,
    title,
    description,
    keywords,
    images,
    type = 'website',
  } = input;
  const canonical = localizedPath(locale, pathAfterLocale);
  const strip = normalizePathAfterLocale(pathAfterLocale);

  const ogImages =
    images && images.length > 0
      ? images.map((img) => ({
          url: absAssetUrl(img),
          width: 1200,
          height: 630,
          alt: title,
        }))
      : [
          {
            url: absAssetUrl('/og-image.jpg'),
            width: 1200,
            height: 630,
            alt: title,
          },
        ];

  return {
    title,
    description,
    metadataBase: new URL(siteBaseUrl()),
    keywords: keywords?.length ? keywords : undefined,
    alternates: {
      canonical,
      languages: hreflangLanguages(strip),
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Henzo',
      locale: OG_LOCALE[locale],
      type,
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImages.map((i) => i.url),
      creator: '@henzo',
    },
  };
}
