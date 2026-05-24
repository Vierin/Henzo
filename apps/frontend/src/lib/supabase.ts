import { createBrowserClient } from '@supabase/ssr';
import { isSupabaseConfigured, publicEnv } from './public-env';

if (typeof window !== 'undefined' && !isSupabaseConfigured()) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Set apps/frontend/.env, delete apps/frontend/.henzo-next-dev-cache, restart pnpm dev.',
  );
}

export const supabase = createBrowserClient(
  publicEnv.supabaseUrl,
  publicEnv.supabaseAnonKey,
);
