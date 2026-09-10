'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ClientProtectedGate from '@/components/clientPanel/clientProtectedGate';
import ClientLayoutShell from '@/components/clientPanel/clientLayout';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export default function ClientProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ClientProtectedGate>
        <ClientLayoutShell>{children}</ClientLayoutShell>
      </ClientProtectedGate>
    </QueryClientProvider>
  );
}
