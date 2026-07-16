import 'server-only';

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import {
  BLOG_LOCALE,
  type BlogPost,
  type BlogSitemapEntry,
} from '@/lib/blog.types';

export type { BlogPost, BlogSitemapEntry };
export { BLOG_LOCALE };

const CONTENT_DIR = path.join(process.cwd(), 'src/content/blog', BLOG_LOCALE);

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

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(CONTENT_DIR)) {
    return [];
  }

  return fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const fallbackSlug = file.replace(/\.md$/, '');
      return parsePostFile(path.join(CONTENT_DIR, file), fallbackSlug);
    })
    .filter((post): post is BlogPost => post !== null)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
}

export function getPostBySlug(slug: string): BlogPost | null {
  return getAllPosts().find((post) => post.slug === slug) ?? null;
}

export function getAllPostParams(): Array<{
  locale: typeof BLOG_LOCALE;
  slug: string;
}> {
  return getAllPosts().map((post) => ({
    locale: BLOG_LOCALE,
    slug: post.slug,
  }));
}

export function getBlogSitemapEntries(): BlogSitemapEntry[] {
  return getAllPosts().map((post) => ({
    slug: post.slug,
    publishedAt: post.publishedAt,
  }));
}
