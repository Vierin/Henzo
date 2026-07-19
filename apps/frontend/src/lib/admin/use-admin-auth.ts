'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { extractLocaleFromPath, withLocale } from '@/i18n/routing';
import { verifyAdminSession } from './api';

export function useAdminAuth(options?: { requireAdmin?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = extractLocaleFromPath(pathname) ?? 'en';
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setIsAdmin(false);
        return false;
      }
      await verifyAdminSession();
      setIsAdmin(true);
      return true;
    } catch (e) {
      setIsAdmin(false);
      setError(e instanceof Error ? e.message : 'Auth check failed');
      const status = (e as { status?: number })?.status;
      if (status === 401 || status === 403) {
        await supabase.auth.signOut({ scope: 'local' });
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [options?.requireAdmin]);

  useEffect(() => {
    void check();
  }, [check]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push(withLocale('/admin/login', locale));
  };

  return { loading, isAdmin, error, check, signOut };
}
