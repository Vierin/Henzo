import type { Metadata } from 'next';
import { BusinessRegisterPageClient } from '@/components/auth/businessRegisterPageClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Business sign up — Henzo',
    robots: { index: false, follow: false },
  };
}

export default function BusinessRegisterPage() {
  return <BusinessRegisterPageClient />;
}
