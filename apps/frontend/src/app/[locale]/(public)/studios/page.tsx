import type { Metadata } from 'next';
import { StudiosListClient } from '@/components/studios/studiosListClient';
import { fetchStudiosSearch } from '@/lib/client/fetch-studios-search';
import { fetchHomeTrainingCategories } from '@/lib/client/fetch-training-categories';
import { buildDynamicPageMetadata, resolveLocale } from '@/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  return buildDynamicPageMetadata(locale, {
    pathAfterLocale: '/studios',
    title: 'Studios near you — Henzo',
    description: 'Browse fitness studios and book classes nearby on Henzo.',
  });
}

export default async function StudiosPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await params;
  const sp = await searchParams;
  const search = typeof sp.search === 'string' ? sp.search : undefined;
  const category = typeof sp.category === 'string' ? sp.category : undefined;
  const page = typeof sp.page === 'string' ? Number(sp.page) || 1 : 1;

  const [result, categories] = await Promise.all([
    fetchStudiosSearch({ search, category, page, limit: 24 }),
    fetchHomeTrainingCategories(),
  ]);

  return (
    <StudiosListClient
      initialStudios={result.items}
      initialTotal={result.total}
      initialCategories={categories}
      title="Studios"
    />
  );
}
