import type { Metadata } from 'next';
import { ClientForgotPasswordPageClient } from '@/components/auth/clientForgotPasswordPageClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Forgot password — Henzo',
    robots: { index: false, follow: false },
  };
}

export default function ClientForgotPasswordPage() {
  return <ClientForgotPasswordPageClient />;
}
