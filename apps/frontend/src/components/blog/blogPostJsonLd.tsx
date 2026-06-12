import type { BlogPost } from '@/lib/blog';
import type { Locale } from '@/i18n/routing';
import { localizedPath, siteBaseUrl } from '@/seo';

type BlogPostJsonLdProps = {
  post: BlogPost;
  locale: Locale;
};

export function BlogPostJsonLd({ post, locale }: BlogPostJsonLdProps) {
  const base = siteBaseUrl().replace(/\/$/, '');
  const postUrl = `${base}${localizedPath(locale, `/blog/${post.slug}`)}`;
  const blogUrl = `${base}${localizedPath(locale, '/blog')}`;
  const image = post.coverImage
    ? post.coverImage.startsWith('http')
      ? post.coverImage
      : `${base}${post.coverImage}`
    : `${base}/og-image.jpg`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.description,
        datePublished: post.publishedAt,
        dateModified: post.publishedAt,
        image: [image],
        author: {
          '@type': 'Organization',
          name: 'Henzo',
          url: base,
        },
        publisher: {
          '@type': 'Organization',
          name: 'Henzo',
          logo: {
            '@type': 'ImageObject',
            url: `${base}/logo.png`,
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': postUrl,
        },
        url: postUrl,
        inLanguage: locale,
        keywords: post.tags.join(', '),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Henzo',
            item: `${base}${localizedPath(locale, '')}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Blog',
            item: blogUrl,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: post.title,
            item: postUrl,
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
