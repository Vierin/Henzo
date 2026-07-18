import type { Locale } from '@/i18n/routing';

/** Blog content is English-only for now. */
export const BLOG_LOCALE = 'en' as const satisfies Locale;

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  coverImage?: string;
  tags: string[];
  content: string;
  readingTimeMinutes: number;
};

export type BlogSitemapEntry = {
  slug: string;
  publishedAt: string;
};
