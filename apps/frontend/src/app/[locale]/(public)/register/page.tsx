import type { Metadata } from 'next';
import { ClientRegisterPageClient } from '@/components/auth/clientRegisterPageClient';
import { resolveLocale } from '@/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  return {
    title:
      locale === 'ru'
        ? 'Регистрация — Henzo'
        : locale === 'vi'
          ? 'Đăng ký — Henzo'
          : 'Sign up — Henzo',
    robots: { index: false, follow: false },
  };
}

export default function ClientRegisterPage() {
  return <ClientRegisterPageClient />;
}
