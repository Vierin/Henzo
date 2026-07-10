'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchNotificationsInbox,
  markNotificationsRead,
} from '@/lib/owner/api';
import type { NotificationInboxItem } from '@/lib/owner/types';

export default function OwnerNotificationsPage() {
  const [items, setItems] = useState<NotificationInboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchNotificationsInbox());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (id: string) => {
    await markNotificationsRead([id]);
    await load();
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#3F3F3F]">Messages</h1>
      <p className="mt-1 text-sm text-zinc-500">Notifications inbox</p>
      {loading ? (
        <p className="mt-6 text-sm text-zinc-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">No notifications.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border px-4 py-3 ${
                n.read
                  ? 'border-zinc-100 bg-white'
                  : 'border-[#EDE9F6] bg-[#F8F6FF]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-[#3F3F3F]">
                    {n.title ?? n.type}
                  </p>
                  {n.body ? (
                    <p className="mt-1 text-sm text-zinc-500">{n.body}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-zinc-400">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!n.read ? (
                  <button
                    type="button"
                    onClick={() => void markRead(n.id)}
                    className="shrink-0 text-xs text-[#3F3287]"
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
