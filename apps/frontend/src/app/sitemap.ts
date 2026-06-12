import { MetadataRoute } from 'next';
import { getBlogSitemapEntries } from '@/lib/blog';

type StudioSlugEntry = {
  slug: string;
  updatedAt: string;
};

const locales = ['en', 'ru', 'vi'] as const;

function withLocale(path: string, locale: (typeof locales)[number]) {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl()}/${locale}${clean === '/' ? '' : clean}`;
}

function baseUrl() {
  return process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app';
}

function alternatesFor(path: string) {
  return {
    languages: {
      'en-US': withLocale(path, 'en'),
      'ru-RU': withLocale(path, 'ru'),
      'vi-VN': withLocale(path, 'vi'),
    },
  } as const;
}

async function fetchStudioSlugs(): Promise<StudioSlugEntry[]> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  try {
    const res = await fetch(`${apiBase}/studios/public/slugs`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return [];
    }
    const data = (await res.json()) as StudioSlugEntry[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = [
    { path: '/', changeFrequency: 'daily' as const, priority: 1 },
    { path: '/about', changeFrequency: 'monthly' as const, priority: 0.6 },
    { path: '/contact', changeFrequency: 'monthly' as const, priority: 0.6 },
    { path: '/blog', changeFrequency: 'weekly' as const, priority: 0.7 },
    {
      path: '/terms-of-service',
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      path: '/privacy-policy',
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
  ];

  const staticPages = staticPaths.flatMap((item) =>
    locales.map((locale) => ({
      url: withLocale(item.path, locale),
      lastModified: new Date(),
      changeFrequency: item.changeFrequency,
      priority: item.priority,
      alternates: alternatesFor(item.path),
    })),
  );

  const studioSlugs = await fetchStudioSlugs();
  const studioPages = studioSlugs.flatMap((studio) =>
    locales.map((locale) => ({
      url: withLocale(`/studio/${studio.slug}`, locale),
      lastModified: new Date(studio.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
      alternates: alternatesFor(`/studio/${studio.slug}`),
    })),
  );

  const blogPosts = getBlogSitemapEntries();
  const blogPages = blogPosts.map((post) => ({
    url: withLocale(`/blog/${post.slug}`, post.locale),
    lastModified: new Date(post.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
    alternates: alternatesFor(`/blog/${post.slug}`),
  }));

  return [...staticPages, ...studioPages, ...blogPages];
}
