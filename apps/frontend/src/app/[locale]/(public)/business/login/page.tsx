import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/routing';

/** Legacy URL — owners use the shared `/login` page. */
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
  q.set('intent', 'business');
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === 'string' && value) q.set(key, value);
  }
  redirect(`/${locale}/login?${q.toString()}`);
}
