import type { Metadata } from 'next';
import { getDictionary } from '@/i18n/dictionaries';
import { BLOG_LOCALE, getAllPosts } from '@/lib/blog';
import { buildStaticPageMetadata } from '@/seo';
import { LegalPageHeader } from '@/components/legal/LegalPageHeader';
import { BlogIndexContent } from '@/components/blog/blogIndexContent';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticPageMetadata('blog', BLOG_LOCALE);
}

export default async function BlogIndexPage() {
  const posts = getAllPosts();
  const dict = await getDictionary(BLOG_LOCALE, ['public/blog']);
  const blog = dict.blog ?? {};

  const hero = {
    badge: blog.badge ?? 'Blog',
    titleBefore: blog.heroTitleBefore ?? 'Insights to Grow your ',
    titleAccent: blog.heroTitleAccent ?? 'Studio',
    titleAfter: blog.heroTitleAfter ?? '.',
    subtitle:
      blog.heroSubtitle ??
      blog.subtitle ??
      'Tips, strategies, and inspiration to help you run a more successful studio.',
  };

  return (
    <div className="min-h-screen bg-white font-wix-madefor-display text-[#3F3F3F]">
      <LegalPageHeader locale={BLOG_LOCALE} hideLanguageSwitcher />
      <main role="main">
        <BlogIndexContent
          posts={posts}
          hero={hero}
          readMoreLabel={blog.readMore ?? 'Read article'}
          minReadLabel={blog.minRead ?? 'min read'}
          emptyLabel={blog.subtitle ?? ''}
        />
      </main>
    </div>
  );
}
