'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createCurrentStudio,
  fetchCurrentStudio,
} from '@/lib/owner/fetch-current-studio';
import type { OwnerStudio } from '@/lib/owner/types';

type OwnerStudioContextValue = {
  studio: OwnerStudio | null;
  needsSetup: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createStudio: (body: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  }) => Promise<OwnerStudio>;
};

const OwnerStudioContext = createContext<OwnerStudioContextValue | null>(null);

export function OwnerStudioProvider({ children }: { children: ReactNode }) {
  const [studio, setStudio] = useState<OwnerStudio | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchCurrentStudio();
      setStudio(result.studio);
      setNeedsSetup(result.needsSetup);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load studio');
      setStudio(null);
      setNeedsSetup(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createStudio = useCallback(
    async (body: {
      name: string;
      address?: string;
      phone?: string;
      email?: string;
    }) => {
      const created = await createCurrentStudio(body);
      setStudio(created);
      setNeedsSetup(false);
      return created;
    },
    [],
  );

  const value = useMemo(
    () => ({
      studio,
      needsSetup,
      isLoading,
      error,
      refresh,
      createStudio,
    }),
    [studio, needsSetup, isLoading, error, refresh, createStudio],
  );

  return (
    <OwnerStudioContext.Provider value={value}>
      {children}
    </OwnerStudioContext.Provider>
  );
}

export function useOwnerStudio() {
  const ctx = useContext(OwnerStudioContext);
  if (!ctx) {
    throw new Error('useOwnerStudio must be used within OwnerStudioProvider');
  }
  return ctx;
}
