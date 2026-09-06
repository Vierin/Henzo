/**
 * Public web auth (client + business). Verifier in localStorage.
 * Admin uses `@/lib/supabase` (cookie PKCE + server callback) separately.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, publicEnv } from '@/lib/public-env';

let publicClient: SupabaseClient | null = null;

export function getPublicSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  if (typeof window === 'undefined') {
    throw new Error('getPublicSupabase() is browser-only');
  }

  if (publicClient) return publicClient;

  publicClient = createClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      auth: {
        flowType: 'pkce',
        // IMPORTANT: must be false — auto-detect would exchange the code once
        // on client init, then our callback exchange fails (empty verifier).
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
        storage: window.localStorage,
        storageKey: 'henzo-public-auth',
      },
    },
  );

  return publicClient;
}
