import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StudiosListClient } from '@/components/studios/studiosListClient';
import { fetchStudiosSearch } from '@/lib/client/fetch-studios-search';
import { fetchTrainingCategories } from '@/lib/client/fetch-training-categories';
import { trainingCategoryLabel } from '@/lib/client/training-category';
import { isLocale } from '@/i18n/routing';
import { buildDynamicPageMetadata, resolveLocale } from '@/seo';
import type { Locale } from '@/i18n/routing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = resolveLocale(raw);
  const label = slug.replace(/-/g, ' ');
  return buildDynamicPageMetadata(locale, {
    pathAfterLocale: `/category/${slug}`,
    title: `${label} classes — Henzo`,
    description: `Find ${label} studios and classes on Henzo.`,
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw) || !slug?.trim()) notFound();
  const locale = resolveLocale(raw) as Locale;

  const categories = await fetchTrainingCategories();
  const category = categories.find((c) => c.slug === slug) ?? null;
  const title = category
    ? trainingCategoryLabel(category, locale)
    : slug.replace(/-/g, ' ');

  const result = await fetchStudiosSearch({
    category: category?.slug ?? slug,
    limit: 24,
  });

  return (
    <StudiosListClient
      initialStudios={result.items}
      initialTotal={result.total}
      initialCategories={categories}
      title={title}
      categorySlug={slug}
    />
  );
}
