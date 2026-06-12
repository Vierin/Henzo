import 'server-only';

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { locales, type Locale } from '@/i18n/routing';

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
  locale: Locale;
  publishedAt: string;
};

const CONTENT_DIR = path.join(process.cwd(), 'src/content/blog');

function readingTimeMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function parsePostFile(
  filePath: string,
  fallbackSlug: string,
): BlogPost | null {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);

  const title = typeof data.title === 'string' ? data.title : '';
  const description =
    typeof data.description === 'string' ? data.description : '';
  const publishedAt =
    typeof data.publishedAt === 'string' ? data.publishedAt : '';
  const slug =
    typeof data.slug === 'string' && data.slug.length > 0
      ? data.slug
      : fallbackSlug;

  if (!title || !publishedAt) {
    return null;
  }

  return {
    slug,
    title,
    description,
    publishedAt,
    coverImage:
      typeof data.coverImage === 'string' ? data.coverImage : undefined,
    tags: Array.isArray(data.tags)
      ? data.tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
    content,
    readingTimeMinutes: readingTimeMinutes(content),
  };
}

export function getAllPosts(locale: Locale): BlogPost[] {
  const dir = path.join(CONTENT_DIR, locale);
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const fallbackSlug = file.replace(/\.md$/, '');
      return parsePostFile(path.join(dir, file), fallbackSlug);
    })
    .filter((post): post is BlogPost => post !== null)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
}

export function getPostBySlug(locale: Locale, slug: string): BlogPost | null {
  return getAllPosts(locale).find((post) => post.slug === slug) ?? null;
}

export function getAllPostParams(): Array<{ locale: Locale; slug: string }> {
  const params: Array<{ locale: Locale; slug: string }> = [];

  for (const locale of locales) {
    for (const post of getAllPosts(locale)) {
      params.push({ locale, slug: post.slug });
    }
  }

  return params;
}

export function getBlogSitemapEntries(): BlogSitemapEntry[] {
  const entries: BlogSitemapEntry[] = [];

  for (const locale of locales) {
    for (const post of getAllPosts(locale)) {
      entries.push({
        slug: post.slug,
        locale,
        publishedAt: post.publishedAt,
      });
    }
  }

  return entries;
}

export function postExistsInLocale(locale: Locale, slug: string): boolean {
  return getPostBySlug(locale, slug) !== null;
}
