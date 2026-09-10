import { apiClient } from '@/lib/api-client';
import type { OwnerStudioClient } from './types';

export async function fetchStudioClients(): Promise<OwnerStudioClient[]> {
  const res = await apiClient.get<OwnerStudioClient[]>(
    '/fitness/owner/studio-clients',
  );
  return Array.isArray(res) ? res : [];
}

export async function searchStudioClients(
  q: string,
): Promise<OwnerStudioClient[]> {
  if (q.trim().length < 2) return [];
  const res = await apiClient.get<OwnerStudioClient[]>(
    `/fitness/owner/studio-clients/search?q=${encodeURIComponent(q.trim())}`,
  );
  return Array.isArray(res) ? res : [];
}

export async function createStudioClient(body: {
  name: string;
  email: string;
  phone?: string;
  notes?: string;
}): Promise<{ userId: string; studioClientId: string }> {
  return apiClient.post('/fitness/owner/studio-clients', body);
}

export type OwnerSessionBookingRow = {
  id: string;
  time: string;
  status: string;
  notes?: string | null;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  service: { name: string; price?: number; duration?: number };
  staff?: { id: string; name: string } | null;
};

export async function fetchOwnerSessionBookings(params?: {
  page?: number;
  limit?: number;
}): Promise<OwnerSessionBookingRow[]> {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  const suffix = q.toString() ? `?${q}` : '';
  const res = await apiClient.get<
    | OwnerSessionBookingRow[]
    | { items?: OwnerSessionBookingRow[]; data?: OwnerSessionBookingRow[] }
  >(`/fitness/session-bookings/owner${suffix}`);
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

const ACTIVE_DAYS = 90;

export type ClientStatus = 'active' | 'inactive' | 'new';

export function clientStatus(
  c: OwnerStudioClient,
  now = new Date(),
): ClientStatus {
  const created = c.rosterCreatedAt ? new Date(c.rosterCreatedAt) : null;
  if (
    created &&
    created.getMonth() === now.getMonth() &&
    created.getFullYear() === now.getFullYear()
  ) {
    return 'new';
  }
  if (!c.lastVisit) return 'inactive';
  const last = new Date(c.lastVisit);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - ACTIVE_DAYS);
  return last >= cutoff ? 'active' : 'inactive';
}

export function clientDisplayName(c: OwnerStudioClient): string {
  return c.name?.trim() || c.email?.split('@')[0] || 'Client';
}

export function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export function relativeDayLabel(
  iso: string | null | undefined,
  locale = 'en',
): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startToday.getTime() - startThat.getTime()) / 86400000,
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 30) return `${diffDays} days ago`;
  return d.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export type ImportClientRow = {
  name: string;
  email: string;
  phone?: string;
  notes?: string;
};

/** Parse CSV with headers name,email[,phone][,notes]. */
export function parseClientsCsv(text: string): {
  rows: ImportClientRow[];
  errors: string[];
} {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { rows: [], errors: ['File is empty'] };

  const split = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else inQ = !inQ;
        continue;
      }
      if (ch === ',' && !inQ) {
        out.push(cur.trim());
        cur = '';
        continue;
      }
      cur += ch;
    }
    out.push(cur.trim());
    return out;
  };

  const header = split(lines[0]!).map((h) =>
    h.toLowerCase().replace(/\s+/g, ''),
  );
  const nameIdx = header.findIndex((h) => h === 'name' || h === 'fullname');
  const emailIdx = header.findIndex((h) => h === 'email' || h === 'почта');
  const phoneIdx = header.findIndex(
    (h) => h === 'phone' || h === 'tel' || h === 'телефон',
  );
  const notesIdx = header.findIndex(
    (h) => h === 'notes' || h === 'note' || h === 'заметки',
  );

  const hasHeader = nameIdx >= 0 || emailIdx >= 0;
  const start = hasHeader ? 1 : 0;
  const ni = hasHeader ? (nameIdx >= 0 ? nameIdx : 0) : 0;
  const ei = hasHeader ? (emailIdx >= 0 ? emailIdx : 1) : 1;
  const pi = hasHeader ? phoneIdx : 2;
  const noteI = hasHeader ? notesIdx : 3;

  const rows: ImportClientRow[] = [];
  const errors: string[] = [];

  for (let i = start; i < lines.length; i++) {
    const cols = split(lines[i]!);
    const name = (cols[ni] ?? '').trim();
    const email = (cols[ei] ?? '').trim();
    const phone = pi >= 0 ? (cols[pi] ?? '').trim() : '';
    const notes = noteI >= 0 ? (cols[noteI] ?? '').trim() : '';
    if (!name && !email) continue;
    if (!email || !email.includes('@')) {
      errors.push(`Row ${i + 1}: invalid email`);
      continue;
    }
    if (!name) {
      errors.push(`Row ${i + 1}: name required`);
      continue;
    }
    rows.push({
      name,
      email,
      phone: phone || undefined,
      notes: notes || undefined,
    });
  }

  return { rows, errors };
}
