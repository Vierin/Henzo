import Image from 'next/image';
import Link from 'next/link';
import { BLOG_LOCALE, type BlogPost } from '@/lib/blog';
import { withLocale } from '@/i18n/routing';

type BlogPostCardProps = {
  post: BlogPost;
  readMoreLabel: string;
  minReadLabel: string;
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(iso));
}

export function BlogPostCard({
  post,
  readMoreLabel,
  minReadLabel,
}: BlogPostCardProps) {
  const href = withLocale(`/blog/${post.slug}`, BLOG_LOCALE);

  return (
    <article className="group flex h-full max-w-7xl flex-col overflow-hidden rounded-xl border border-[#eadfd7] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:max-w-none">
      {post.coverImage ? (
        <div className="relative aspect-[2/1] overflow-hidden bg-[#F9F4F0]">
          <Image
            src={post.coverImage}
            alt=""
            fill
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, 30vw"
          />
        </div>
      ) : (
        <div className="aspect-[2/1] bg-gradient-to-br from-[#F9F4F0] to-[#eadfd7]/60" />
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-[#7A7A7A]">
          <time dateTime={post.publishedAt}>
            {formatDate(post.publishedAt)}
          </time>
          <span aria-hidden>·</span>
          <span>
            {post.readingTimeMinutes} {minReadLabel}
          </span>
        </div>
        <h2 className="text-base font-semibold leading-snug text-[#3F3F3F]">
          <Link href={href} className="transition hover:text-[#E86D4F]">
            {post.title}
          </Link>
        </h2>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-[#5A5A5A]">
          {post.description}
        </p>
        <Link
          href={href}
          className="mt-3 inline-flex items-center text-xs font-semibold text-[#E86D4F] transition hover:text-[#d85e42]"
        >
          {readMoreLabel}
        </Link>
      </div>
    </article>
  );
}
