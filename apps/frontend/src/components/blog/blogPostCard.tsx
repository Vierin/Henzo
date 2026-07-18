import Image from 'next/image';
import Link from 'next/link';
import { BLOG_LOCALE, type BlogPost } from '@/lib/blog.types';
import { withLocale } from '@/i18n/routing';

type BlogPostCardProps = {
  post: BlogPost;
  readMoreLabel: string;
  minReadLabel: string;
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}

function formatCategory(tags: string[]): string | null {
  const tag = tags[0];
  if (!tag) {
    return null;
  }
  return tag.replace(/[-_]/g, ' ').toUpperCase();
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="2"
        y="3.25"
        width="12"
        height="10.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M5 2.25V4.25M11 2.25V4.25M2 6.5H14"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M8 5.25V8.25L10 10"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4.5 10H15.5M15.5 10L11 5.5M15.5 10L11 14.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BlogPostCard({
  post,
  readMoreLabel,
  minReadLabel,
}: BlogPostCardProps) {
  const href = withLocale(`/blog/${post.slug}`, BLOG_LOCALE);
  const category = formatCategory(post.tags);

  return (
    <article className="group flex h-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-[#E8E8EE] bg-white transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-24px_rgba(63,50,135,0.35)] sm:max-w-none">
      <Link href={href} className="flex h-full flex-col outline-none">
        {post.coverImage ? (
          <div className="relative aspect-[4/3] overflow-hidden bg-[#F9F4F0]">
            <Image
              src={post.coverImage}
              alt=""
              fill
              className="object-cover transition duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, 30vw"
            />
          </div>
        ) : (
          <div className="aspect-[4/3] bg-gradient-to-br from-[#F9F4F0] to-[#eadfd7]/60" />
        )}

        <div className="flex flex-1 flex-col px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
          {category ? (
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.06em] text-[#3F3287]">
              {category}
            </p>
          ) : null}

          <h2 className="mt-2 text-lg font-semibold leading-snug tracking-tight text-[#1F2430] transition group-hover:text-[#3F3287] sm:text-xl">
            {post.title}
          </h2>

          <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-[#6B7280] sm:text-[0.75rem]">
            {post.description}
          </p>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#F0F0F4] pt-4">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#8A8A96]">
              <span className="inline-flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-[#3F3287]" />
                <time dateTime={post.publishedAt}>
                  {formatDate(post.publishedAt)}
                </time>
              </span>
              <span className="text-[#D0D0D8]" aria-hidden>
                |
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon className="h-3.5 w-3.5 shrink-0 text-[#3F3287]" />
                <span>
                  {post.readingTimeMinutes} {minReadLabel}
                </span>
              </span>
            </div>

            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#3F3287] transition group-hover:bg-[#3F3287]/10"
              aria-label={readMoreLabel}
            >
              <ArrowIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
