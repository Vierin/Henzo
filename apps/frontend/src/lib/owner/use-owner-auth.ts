'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { extractLocaleFromPath } from '@/i18n/routing';
import { fetchCurrentUserRole } from './api';

export function useOwnerAuth(options?: { requireOwner?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setIsOwner(false);
        return false;
      }
      const role = await fetchCurrentUserRole();
      const ok = role === 'OWNER';
      setIsOwner(ok);
      if (!ok && options?.requireOwner) {
        setError('Studio owner access required');
      }
      return ok;
    } catch (e) {
      setIsOwner(false);
      setError(e instanceof Error ? e.message : 'Auth check failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, [options?.requireOwner]);

  useEffect(() => {
    void check();
  }, [check]);

  const signOut = async () => {
    await supabase.auth.signOut();
    const locale =
      typeof window !== 'undefined'
        ? (extractLocaleFromPath(window.location.pathname) ?? 'en')
        : 'en';
    router.push(`/${locale}/owner/login`);
  };

  return { loading, isOwner, error, check, signOut };
}
