import {
  BlogHeroSection,
  type BlogHeroCopy,
} from '@/components/blog/blogHeroSection';
import { BlogPostCard } from '@/components/blog/blogPostCard';
import type { BlogPost } from '@/lib/blog.types';

type BlogIndexContentProps = {
  posts: BlogPost[];
  hero: BlogHeroCopy;
  readMoreLabel: string;
  minReadLabel: string;
  emptyLabel: string;
};

export function BlogIndexContent({
  posts,
  hero,
  readMoreLabel,
  minReadLabel,
  emptyLabel,
}: BlogIndexContentProps) {
  return (
    <>
      <BlogHeroSection copy={hero} />

      <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-12">
        {posts.length > 0 ? (
          <div className="mx-auto grid max-w-5xl justify-items-center gap-4 sm:grid-cols-2 sm:justify-items-stretch lg:grid-cols-3">
            {posts.map((post) => (
              <BlogPostCard
                key={post.slug}
                post={post}
                readMoreLabel={readMoreLabel}
                minReadLabel={minReadLabel}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-[#5A5A5A]">{emptyLabel}</p>
        )}
      </div>
    </>
  );
}
