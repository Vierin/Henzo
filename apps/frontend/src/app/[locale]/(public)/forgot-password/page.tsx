import type { Metadata } from 'next';
import { ClientForgotPasswordPageClient } from '@/components/auth/clientForgotPasswordPageClient';
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
        ? 'Сброс пароля — Henzo'
        : locale === 'vi'
          ? 'Quên mật khẩu — Henzo'
          : 'Forgot password — Henzo',
    robots: { index: false, follow: false },
  };
}

export default function ClientForgotPasswordPage() {
  return <ClientForgotPasswordPageClient />;
}
