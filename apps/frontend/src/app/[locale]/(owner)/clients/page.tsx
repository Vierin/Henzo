'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';
import {
  fetchStudioClients,
  searchStudioClients,
} from '@/lib/owner/fetch-clients';

export default function ClientsPage() {
  const { studio } = useOwnerStudio();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const listQuery = useQuery({
    queryKey: ['owner-clients'],
    queryFn: fetchStudioClients,
    enabled: Boolean(studio?.id) && debounced.length < 2,
  });

  const searchQuery = useQuery({
    queryKey: ['owner-clients-search', debounced],
    queryFn: () => searchStudioClients(debounced),
    enabled: Boolean(studio?.id) && debounced.length >= 2,
  });

  const clients =
    debounced.length >= 2 ? (searchQuery.data ?? []) : (listQuery.data ?? []);
  const isLoading =
    debounced.length >= 2 ? searchQuery.isLoading : listQuery.isLoading;
  const isError =
    debounced.length >= 2 ? searchQuery.isError : listQuery.isError;

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
        <p className="text-sm text-gray-500 mt-1">Studio roster</p>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, email, phone…"
        className="w-full max-w-md rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5b5b]/40"
      />

      <div className="bg-white rounded-xl border border-gray-100">
        {isLoading ? (
          <p className="p-5 text-sm text-gray-500">Loading…</p>
        ) : isError ? (
          <p className="p-5 text-sm text-red-600">Failed to load clients</p>
        ) : clients.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">No clients found</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {clients.map((c) => (
              <li
                key={c.studioClientId || c.userId}
                className="px-5 py-4 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    {c.name || c.email || 'Client'}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {[c.email, c.phone].filter(Boolean).join(' · ') ||
                      (c.isGuest ? 'Guest' : '—')}
                  </div>
                </div>
                <div className="text-xs text-gray-400 text-right">
                  {typeof c.visitsCount === 'number'
                    ? `${c.visitsCount} visits`
                    : null}
                  {c.lastVisit ? (
                    <div>
                      Last: {new Date(c.lastVisit).toLocaleDateString()}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
