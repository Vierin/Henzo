import type { Metadata } from 'next';
import { BusinessRegisterLanding } from '@/components/business/businessAppAuthLanding';
import { buildDynamicPageMetadata, resolveLocale } from '@/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  return buildDynamicPageMetadata(resolveLocale(raw), {
    pathAfterLocale: '/business/register',
    title: 'Register your studio — Henzo',
    description: 'Create your studio account in the Henzo mobile app.',
  });
}

export default function BusinessRegisterPage() {
  return <BusinessRegisterLanding />;
}
