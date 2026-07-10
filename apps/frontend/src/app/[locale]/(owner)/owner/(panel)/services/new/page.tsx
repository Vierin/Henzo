import { Suspense } from 'react';
import OwnerNewServicePageClient from './ownerNewServicePageClient';

export default function OwnerNewServicePage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <OwnerNewServicePageClient />
    </Suspense>
  );
}
