import type { Metadata } from 'next';
import { BusinessLandingView } from '@/components/landing/businessLandingView';
import { HomeJsonLd } from '@/components/blog/homeJsonLd';
import { buildStaticPageMetadata, resolveLocale } from '@/seo';
import type { Locale } from '@/i18n/routing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  return buildStaticPageMetadata('business', resolveLocale(raw));
}

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw) as Locale;

  return (
    <>
      <HomeJsonLd locale={locale} />
      <BusinessLandingView locale={locale} />
    </>
  );
}
