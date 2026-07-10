'use client';

import { OwnerGuard } from '@/components/owner/owner-guard';

export default function OwnerPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OwnerGuard>{children}</OwnerGuard>;
}
