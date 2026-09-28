import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/routing';

/** Legacy URL — one login form for clients and studio owners. */
export default async function BusinessLoginRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : 'en') as Locale;
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (key === 'intent') continue;
    if (typeof value === 'string' && value) q.set(key, value);
  }
  const qs = q.toString();
  redirect(`/${locale}/login${qs ? `?${qs}` : ''}`);
}
