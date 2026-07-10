import type { Metadata } from 'next';
import { ClientHomeHero } from '@/components/clientHome/clientHomeHero';
import { fetchTrainingCategories } from '@/lib/client/fetch-training-categories';
import { ClientHomePopularStudiosSection } from '@/components/clientHome/clientHomePopularStudiosSection';
import { ClientHomeNearbyClassesSection } from '@/components/clientHome/clientHomeNearbyClassesSection';
import {
  ClientHomeAppPromoSection,
  ClientHomeBusinessPromoSection,
} from '@/components/clientHome/clientHomePromoSections';
import { HomeJsonLd } from '@/components/blog/homeJsonLd';
import { buildStaticPageMetadata, resolveLocale } from '@/seo';
import type { Locale } from '@/i18n/routing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  return buildStaticPageMetadata('home', resolveLocale(raw));
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw) as Locale;
  const categories = await fetchTrainingCategories();

  return (
    <>
      <HomeJsonLd locale={locale} />
      <div className="min-h-screen overflow-x-clip font-wix-madefor-display text-[#3F3F3F]">
        <main className="w-full">
          <ClientHomeHero categories={categories} locale={locale} />
          <ClientHomePopularStudiosSection locale={locale} />
          <ClientHomeNearbyClassesSection locale={locale} />
          <ClientHomeAppPromoSection />
          <ClientHomeBusinessPromoSection />
        </main>
      </div>
    </>
  );
}
