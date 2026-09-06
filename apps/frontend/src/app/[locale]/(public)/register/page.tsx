import type { Metadata } from 'next';
import { ClientRegisterPageClient } from '@/components/auth/clientRegisterPageClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Sign up — Henzo',
    robots: { index: false, follow: false },
  };
}

export default function ClientRegisterPage() {
  return <ClientRegisterPageClient />;
}
