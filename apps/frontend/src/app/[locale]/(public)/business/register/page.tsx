import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/routing';

/** Legacy URL — owners use the shared `/login` page. */
export default async function BusinessRegisterRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : 'en') as Locale;
  redirect(`/${locale}/login?intent=business`);
}
