import Image from 'next/image';
import Link from 'next/link';
import type { BlogPost } from '@/lib/blog';
import { withLocale, type Locale } from '@/i18n/routing';

type BlogPostCardProps = {
  post: BlogPost;
  locale: Locale;
  readMoreLabel: string;
  minReadLabel: string;
};

function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(iso));
}

export function BlogPostCard({
  post,
  locale,
  readMoreLabel,
  minReadLabel,
}: BlogPostCardProps) {
  const href = withLocale(`/blog/${post.slug}`, locale);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#eadfd7] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {post.coverImage ? (
        <div className="relative aspect-[16/9] overflow-hidden bg-[#F9F4F0]">
          <Image
            src={post.coverImage}
            alt=""
            fill
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
      ) : (
        <div className="aspect-[16/9] bg-gradient-to-br from-[#F9F4F0] to-[#eadfd7]/60" />
      )}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-[#7A7A7A]">
          <time dateTime={post.publishedAt}>
            {formatDate(post.publishedAt, locale)}
          </time>
          <span aria-hidden>·</span>
          <span>
            {post.readingTimeMinutes} {minReadLabel}
          </span>
        </div>
        <h2 className="text-xl font-semibold leading-snug text-[#3F3F3F]">
          <Link href={href} className="transition hover:text-[#E86D4F]">
            {post.title}
          </Link>
        </h2>
        <p className="mt-3 flex-1 text-[0.98rem] leading-relaxed text-[#5A5A5A]">
          {post.description}
        </p>
        <Link
          href={href}
          className="mt-5 inline-flex items-center text-sm font-semibold text-[#E86D4F] transition hover:text-[#d85e42]"
        >
          {readMoreLabel}
        </Link>
      </div>
    </article>
  );
}
