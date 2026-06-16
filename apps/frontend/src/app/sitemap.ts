import { MetadataRoute } from 'next';
import { getBlogSitemapEntries } from '@/lib/blog';

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = [
    { path: '/', changeFrequency: 'daily' as const, priority: 1 },
    { path: '/about', changeFrequency: 'monthly' as const, priority: 0.6 },
    { path: '/contact', changeFrequency: 'monthly' as const, priority: 0.6 },
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

  const blogIndexPage = {
    url: withLocale('/blog', 'en'),
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  };

  const blogPosts = getBlogSitemapEntries();
  const blogPages = blogPosts.map((post) => ({
    url: withLocale(`/blog/${post.slug}`, 'en'),
    lastModified: new Date(post.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, blogIndexPage, ...blogPages];
}
