'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  createTrainer,
  deleteTrainer,
  fetchCurrentStudio,
  fetchTrainers,
  inviteTrainer,
} from '@/lib/owner/api';
import type { StaffMember } from '@/lib/owner/types';

export default function OwnerStaffPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';
  const [studioId, setStudioId] = useState('');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const studio = await fetchCurrentStudio();
      if (!studio?.id) return;
      setStudioId(studio.id);
      setStaff(await fetchTrainers(studio.id));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!studioId) return;
    setSaving(true);
    try {
      await createTrainer({
        studioId,
        name: name.trim(),
        email: email.trim() || undefined,
        accessLevel: 'EMPLOYEE',
      });
      setShowAdd(false);
      setName('');
      setEmail('');
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#3F3F3F]">Staff</h1>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="rounded-full bg-[#3F3287] px-4 py-2 text-sm text-white"
        >
          Add staff
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {staff.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white px-4 py-3"
            >
              <div>
                <p className="font-medium">{m.name}</p>
                <p className="text-xs text-zinc-500">
                  {m.email ?? m.accessLevel}
                </p>
              </div>
              <div className="flex gap-2">
                {m.email ? (
                  <button
                    type="button"
                    onClick={() => void inviteTrainer(m.id)}
                    className="text-sm text-[#3F3287]"
                  >
                    Invite
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void deleteTrainer(m.id).then(load)}
                  className="text-sm text-red-600"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {showAdd ? (
        <form
          onSubmit={onAdd}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h2 className="text-lg font-semibold">Add staff member</h2>
            <input
              required
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-4 w-full rounded-xl border border-zinc-200 px-3 py-2"
            />
            <input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex-1 rounded-full border py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-full bg-[#3F3287] py-2 text-sm text-white"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      ) : null}
    </>
  );
}
