'use client';

import { FormEvent, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';
import { createStaff } from '@/lib/owner/fetch-staff';

export default function NewStaffPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const { studio } = useOwnerStudio();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [accessLevel, setAccessLevel] = useState<'ADMIN' | 'EMPLOYEE'>(
    'EMPLOYEE',
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!studio?.id) {
      setError('Studio not loaded');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createStaff({
        name: name.trim(),
        studioId: studio.id,
        accessLevel,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      router.push(withLocale('/staff', locale));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Add staff</h1>
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-xl border border-gray-100 p-5 space-y-4"
      >
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Name *</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border-0 bg-[#FCF3EC] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border-0 bg-[#FCF3EC] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Phone</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-lg border-0 bg-[#FCF3EC] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Access</span>
          <select
            value={accessLevel}
            onChange={(e) =>
              setAccessLevel(e.target.value as 'ADMIN' | 'EMPLOYEE')
            }
            className="mt-1 w-full rounded-lg border-0 bg-[#FCF3EC] px-3 py-2"
          >
            <option value="EMPLOYEE">Employee</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#F15942] text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => router.push(withLocale('/staff', locale))}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
