import type { Metadata } from 'next';
import ClientProviders from '@/components/clientPanel/clientProviders';

export const metadata: Metadata = {
  title: 'Henzo',
  robots: { index: false, follow: false },
};

export default function ClientGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientProviders>{children}</ClientProviders>;
}
