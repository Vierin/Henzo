'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OwnerProtectedGate from '@/components/owner/ownerProtectedGate';
import OwnerLayoutShell from '@/components/owner/ownerLayout';
import { OwnerStudioProvider } from '@/contexts/OwnerStudioContext';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export default function OwnerProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <OwnerProtectedGate>
        <OwnerStudioProvider>
          <OwnerLayoutShell>{children}</OwnerLayoutShell>
        </OwnerStudioProvider>
      </OwnerProtectedGate>
    </QueryClientProvider>
  );
}
