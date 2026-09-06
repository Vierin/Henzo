import type { Metadata } from 'next';
import { ClientLoginPageClient } from '@/components/auth/clientLoginPageClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Log in — Henzo',
    robots: { index: false, follow: false },
  };
}

export default function ClientLoginPage() {
  return <ClientLoginPageClient />;
}
