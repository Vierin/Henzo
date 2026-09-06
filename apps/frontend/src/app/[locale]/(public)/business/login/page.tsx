import type { Metadata } from 'next';
import { BusinessLoginLanding } from '@/components/business/businessAppAuthLanding';
import { buildDynamicPageMetadata, resolveLocale } from '@/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  return buildDynamicPageMetadata(resolveLocale(raw), {
    pathAfterLocale: '/business/login',
    title: 'Studio login — Henzo',
    description: 'Open the Henzo app to sign in as a studio owner.',
  });
}

export default function BusinessLoginPage() {
  return <BusinessLoginLanding />;
}
