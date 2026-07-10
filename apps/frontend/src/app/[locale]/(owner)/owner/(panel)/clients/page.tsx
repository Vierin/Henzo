'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  fetchClientBlocklist,
  fetchCurrentStudio,
  fetchOwnerStudioClients,
  createOwnerStudioClient,
  searchOwnerStudioClients,
} from '@/lib/owner/api';
import type { OwnerStudioClient } from '@/lib/owner/types';

type Filter = 'all' | 'sleepers' | 'blocked';

export default function OwnerClientsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) ?? 'en';
  const [clients, setClients] = useState<OwnerStudioClient[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await fetchCurrentStudio();
      const [list, blocks] = await Promise.all([
        fetchOwnerStudioClients(),
        fetchClientBlocklist(),
      ]);
      setClients(list);
      const ids = new Set<string>();
      for (const b of blocks) {
        if (b.userId) ids.add(b.userId);
      }
      setBlockedIds(ids);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = clients;
    if (filter === 'blocked') {
      list = list.filter((c) => blockedIds.has(c.userId));
    } else if (filter === 'sleepers') {
      list = list.filter((c) => c.visitsCount <= 1);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.includes(q),
      );
    }
    return list;
  }, [clients, filter, blockedIds, query]);

  const onSearch = async () => {
    const q = query.trim();
    if (!q) return;
    const hits = await searchOwnerStudioClients(q);
    if (hits.length) {
      setClients((prev) => {
        const map = new Map(prev.map((c) => [c.userId, c]));
        for (const h of hits) map.set(h.userId, h);
        return Array.from(map.values());
      });
    }
  };

  const onAddClient = async () => {
    setSaving(true);
    try {
      await createOwnerStudioClient({
        name: addName.trim(),
        email: addEmail.trim() || undefined,
        phone: addPhone.trim() || undefined,
      });
      setShowAdd(false);
      setAddName('');
      setAddEmail('');
      setAddPhone('');
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#3F3F3F]">Clients</h1>
          <p className="text-sm text-zinc-500">{clients.length} total</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="rounded-full bg-[#3F3287] px-4 py-2 text-sm font-medium text-white"
        >
          Add client
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(['all', 'sleepers', 'blocked'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-sm capitalize ${
              filter === f
                ? 'bg-[#EDE9F6] text-[#3F3287]'
                : 'bg-white text-zinc-600 ring-1 ring-zinc-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients…"
          className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void onSearch()}
          className="rounded-xl border border-zinc-200 px-4 py-2 text-sm"
        >
          Search
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-zinc-500">No clients found.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((c) => (
            <li key={c.userId}>
              <button
                type="button"
                onClick={() =>
                  router.push(`/${locale}/owner/clients/${c.userId}`)
                }
                className="flex w-full items-center justify-between rounded-xl border border-zinc-100 bg-white px-4 py-3 text-left hover:border-[#3F3287]/30"
              >
                <div>
                  <p className="font-medium text-[#3F3F3F]">
                    {c.name ?? c.email ?? 'Guest'}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {c.visitsCount} visits
                    {blockedIds.has(c.userId) ? ' · Blocked' : ''}
                  </p>
                </div>
                <span className="text-zinc-400">→</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showAdd ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h2 className="text-lg font-semibold">Add client</h2>
            <input
              className="mt-4 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              placeholder="Name"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
            />
            <input
              className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              placeholder="Email"
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
            />
            <input
              className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              placeholder="Phone"
              value={addPhone}
              onChange={(e) => setAddPhone(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex-1 rounded-full border border-zinc-200 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!addName.trim() || saving}
                onClick={() => void onAddClient()}
                className="flex-1 rounded-full bg-[#3F3287] py-2 text-sm text-white disabled:opacity-60"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
