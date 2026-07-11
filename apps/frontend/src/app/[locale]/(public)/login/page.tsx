import type { Metadata } from 'next';
import { ClientLoginPageClient } from '@/components/auth/clientLoginPageClient';
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
        ? 'Вход — Henzo'
        : locale === 'vi'
          ? 'Đăng nhập — Henzo'
          : 'Log in — Henzo',
    robots: { index: false, follow: false },
  };
}

export default function ClientLoginPage() {
  return <ClientLoginPageClient />;
}
