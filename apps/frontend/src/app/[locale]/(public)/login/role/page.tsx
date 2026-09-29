import type { Metadata } from 'next';
import { LoginRolePageClient } from '@/components/auth/loginRolePageClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Choose your role — Henzo',
    robots: { index: false, follow: false },
  };
}

export default function LoginRolePage() {
  return <LoginRolePageClient />;
}
