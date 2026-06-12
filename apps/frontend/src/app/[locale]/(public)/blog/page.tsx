import type { Metadata } from 'next';
import { getDictionary } from '@/i18n/dictionaries';
import { BLOG_LOCALE, getAllPosts } from '@/lib/blog';
import { buildStaticPageMetadata } from '@/seo';
import { LegalPageHeader } from '@/components/legal/LegalPageHeader';
import { BlogPostCard } from '@/components/blog/blogPostCard';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticPageMetadata('blog', BLOG_LOCALE);
}

export default async function BlogIndexPage() {
  const posts = getAllPosts();
  const dict = await getDictionary(BLOG_LOCALE, ['public/blog']);
  const blog = dict.blog ?? {};

  return (
    <div className="min-h-screen bg-white font-wix-madefor-display text-[#3F3F3F]">
      <LegalPageHeader locale={BLOG_LOCALE} hideLanguageSwitcher />
      <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6" role="main">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-[#3F3F3F] sm:text-5xl">
            {blog.title ?? 'Blog'}
          </h1>
          <p className="mt-4 text-lg text-[#5A5A5A]">{blog.subtitle ?? ''}</p>
        </div>

        {posts.length > 0 ? (
          <div className="mx-auto mt-10 grid max-w-5xl justify-items-center gap-4 sm:grid-cols-2 sm:justify-items-stretch lg:grid-cols-3">
            {posts.map((post) => (
              <BlogPostCard
                key={post.slug}
                post={post}
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
