/**
 * Server-only API client for RSC / server components.
 * Does not attach auth (no Supabase session). Use for public endpoints only.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.henzo.app';

export type ServerApiGetOptions = {
  /** Seconds for Next.js Data Cache; `false` = no store (always fresh). Default 3600. */
  revalidate?: number | false;
};

export async function serverApiGet<T>(
  path: string,
  options?: ServerApiGetOptions,
): Promise<T | null> {
  const rev = options?.revalidate;
  try {
    const init: RequestInit & {
      next?: { revalidate: number };
      cache?: RequestCache;
    } = {
      headers: { 'Content-Type': 'application/json' },
    };
    if (rev === false) {
      init.cache = 'no-store';
    } else {
      init.next = { revalidate: typeof rev === 'number' ? rev : 3600 };
    }

    const res = await fetch(`${BASE_URL}${path}`, init);
    if (!res.ok) return null;
    const data = await res.json();
    return data as T;
  } catch {
    return null;
  }
}
