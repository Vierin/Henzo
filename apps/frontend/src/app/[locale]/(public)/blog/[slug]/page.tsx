import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BlogMarkdown } from '@/components/blog/blogMarkdown';
import { BlogPostJsonLd } from '@/components/blog/blogPostJsonLd';
import { LegalPageHeader } from '@/components/legal/LegalPageHeader';
import { getDictionary } from '@/i18n/dictionaries';
import { isLocale, withLocale, type Locale } from '@/i18n/routing';
import { getAllPostParams, getPostBySlug } from '@/lib/blog';
import { buildDynamicPageMetadata, resolveLocale } from '@/seo';

function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(iso));
}

export async function generateStaticParams() {
  return getAllPostParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = resolveLocale(raw);
  const post = getPostBySlug(locale, slug);

  if (!post) {
    return { title: 'Blog' };
  }

  return buildDynamicPageMetadata(locale, {
    pathAfterLocale: `/blog/${slug}`,
    title: post.title,
    description: post.description,
    type: 'article',
    ...(post.coverImage ? { images: [post.coverImage] } : {}),
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  const post = getPostBySlug(locale, slug);
  if (!post) {
    notFound();
  }

  const dict = await getDictionary(locale, ['public/blog']);
  const blog = dict.blog ?? {};
  const homePath = withLocale('/', locale);

  return (
    <>
      <BlogPostJsonLd post={post} locale={locale} />
      <div className="min-h-screen bg-[#F9F4F0]">
        <LegalPageHeader locale={locale} />
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <Link
            href={withLocale('/blog', locale)}
            className="inline-flex items-center text-sm font-medium text-[#E86D4F] transition hover:text-[#d85e42]"
          >
            ← {blog.backToList ?? 'Back to blog'}
          </Link>

          <header className="mt-6">
            <div className="flex flex-wrap items-center gap-2 text-sm text-[#7A7A7A]">
              <time dateTime={post.publishedAt}>
                {formatDate(post.publishedAt, locale)}
              </time>
              <span aria-hidden>·</span>
              <span>
                {post.readingTimeMinutes} {blog.minRead ?? 'min read'}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold leading-tight text-[#3F3F3F] sm:text-4xl">
              {post.title}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-[#5A5A5A]">
              {post.description}
            </p>
          </header>

          {post.coverImage ? (
            <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-[#eadfd7]">
              <Image
                src={post.coverImage}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
                priority
              />
            </div>
          ) : null}

          <article className="mt-10">
            <BlogMarkdown content={post.content} />
          </article>

          <section className="mt-14 rounded-2xl border border-[#eadfd7] bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-[#3F3F3F]">
              {blog.ctaTitle ?? 'Ready to simplify studio operations?'}
            </h2>
            <p className="mt-3 text-[#5A5A5A]">
              {blog.ctaText ??
                'Try Henzo and manage scheduling, coaches, and bookings from one mobile app.'}
            </p>
            <Link
              href={`${homePath}#pricing`}
              className="mt-6 inline-flex rounded-full bg-[#E86D4F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d85e42]"
            >
              {blog.ctaButton ?? 'See pricing'}
            </Link>
          </section>
        </main>
      </div>
    </>
  );
}
