import type { Metadata } from 'next';
import OwnerProviders from '@/components/owner/ownerProviders';

export const metadata: Metadata = {
  title: 'Henzo Business',
  robots: { index: false, follow: false },
};

export default function OwnerGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OwnerProviders>{children}</OwnerProviders>;
}
