import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Henzo Studio',
  robots: { index: false, follow: false },
};

export default function OwnerRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
