/**
 * Server-only API client for RSC / server components.
 * Does not attach auth (no Supabase session). Use for public endpoints only.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function serverApiGet<T>(path: string): Promise<T | null> {
	try {
		const res = await fetch(`${BASE_URL}${path}`, {
			headers: { 'Content-Type': 'application/json' },
			next: { revalidate: 3600 },
		});
		if (!res.ok) return null;
		const data = await res.json();
		return data as T;
	} catch {
		return null;
	}
}
