import { Suspense } from 'react';
import OwnerSubscriptionPageClient from './ownerSubscriptionPageClient';

export default function OwnerSubscriptionPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <OwnerSubscriptionPageClient />
    </Suspense>
  );
}
