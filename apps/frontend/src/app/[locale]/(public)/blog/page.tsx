import type { Metadata } from 'next';
import { getDictionary } from '@/i18n/dictionaries';
import { isLocale, type Locale } from '@/i18n/routing';
import { getAllPosts } from '@/lib/blog';
import { buildStaticPageMetadata, resolveLocale } from '@/seo';
import { LegalPageHeader } from '@/components/legal/LegalPageHeader';
import { BlogPostCard } from '@/components/blog/blogPostCard';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  return buildStaticPageMetadata('blog', resolveLocale(raw));
}

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? (raw as Locale) : 'en';
  const posts = getAllPosts(locale);
  const dict = await getDictionary(locale, ['public/blog']);
  const blog = dict.blog ?? {};

  return (
    <div className="min-h-screen bg-[#F9F4F0]">
      <LegalPageHeader locale={locale} />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-[#3F3F3F] sm:text-5xl">
            {blog.title ?? 'Blog'}
          </h1>
          <p className="mt-4 text-lg text-[#5A5A5A]">{blog.subtitle ?? ''}</p>
        </div>

        {posts.length > 0 ? (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogPostCard
                key={post.slug}
                post={post}
                locale={locale}
                readMoreLabel={blog.readMore ?? 'Read article'}
                minReadLabel={blog.minRead ?? 'min read'}
              />
            ))}
          </div>
        ) : (
          <p className="mt-12 text-center text-[#5A5A5A]">
            {blog.subtitle ?? ''}
          </p>
        )}
      </main>
    </div>
  );
}
