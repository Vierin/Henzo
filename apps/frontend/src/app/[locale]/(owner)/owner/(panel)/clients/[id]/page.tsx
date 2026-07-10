'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  blockClient,
  fetchClientBlocklist,
  fetchOwnerStudioClients,
  unblockClient,
} from '@/lib/owner/api';
import type { OwnerStudioClient } from '@/lib/owner/types';

export default function OwnerClientDetailPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';
  const clientId = params?.id as string;
  const [client, setClient] = useState<OwnerStudioClient | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, blocks] = await Promise.all([
        fetchOwnerStudioClients(),
        fetchClientBlocklist(),
      ]);
      setClient(list.find((c) => c.userId === clientId) ?? null);
      setBlocked(blocks.some((b) => b.userId === clientId));
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleBlock = async () => {
    setActing(true);
    try {
      if (blocked) {
        await unblockClient(clientId);
      } else {
        await blockClient(clientId);
      }
      await load();
    } finally {
      setActing(false);
    }
  };

  if (loading) return <p className="text-sm text-zinc-500">Loading…</p>;
  if (!client) {
    return (
      <div>
        <Link
          href={`/${locale}/owner/clients`}
          className="text-sm text-[#3F3287]"
        >
          ← Back to clients
        </Link>
        <p className="mt-4 text-sm text-zinc-500">Client not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <Link
        href={`/${locale}/owner/clients`}
        className="text-sm text-[#3F3287] hover:underline"
      >
        ← Back to clients
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-[#3F3F3F]">
        {client.name ?? client.email ?? 'Client'}
      </h1>
      <dl className="mt-6 space-y-3 text-sm">
        {client.email ? (
          <div>
            <dt className="text-zinc-500">Email</dt>
            <dd>{client.email}</dd>
          </div>
        ) : null}
        {client.phone ? (
          <div>
            <dt className="text-zinc-500">Phone</dt>
            <dd>{client.phone}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-zinc-500">Visits</dt>
          <dd>{client.visitsCount}</dd>
        </div>
        {client.lastVisit ? (
          <div>
            <dt className="text-zinc-500">Last visit</dt>
            <dd>{new Date(client.lastVisit).toLocaleDateString(locale)}</dd>
          </div>
        ) : null}
        {client.notes ? (
          <div>
            <dt className="text-zinc-500">Notes</dt>
            <dd>{client.notes}</dd>
          </div>
        ) : null}
      </dl>
      <button
        type="button"
        disabled={acting}
        onClick={() => void toggleBlock()}
        className={`mt-8 rounded-full px-5 py-2.5 text-sm font-medium ${
          blocked
            ? 'border border-zinc-200 text-zinc-700'
            : 'border border-red-200 text-red-600'
        }`}
      >
        {blocked ? 'Unblock client' : 'Block client'}
      </button>
    </div>
  );
}
