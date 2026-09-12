'use client';

import { FormEvent, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';
import {
  defaultCurrencyForLocale,
  STUDIO_CURRENCIES,
  type StudioCurrency,
  parseStudioCurrency,
} from '@/lib/format-money';

const CURRENCY_OPTIONS = STUDIO_CURRENCIES.map((code) => ({
  value: code,
  label:
    code === 'EUR'
      ? '€  Euro (EUR)'
      : code === 'PLN'
        ? 'zł  Polish zloty (PLN)'
        : code === 'USD'
          ? '$  US dollar (USD)'
          : '₫  Vietnamese dong (VND)',
}));

export default function CompleteSetupPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const { createStudio } = useOwnerStudio();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState<StudioCurrency>(() =>
    defaultCurrencyForLocale(locale),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Studio name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createStudio({
        name: name.trim(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        currency,
      });
      router.replace(withLocale('/owner-dashboard', locale));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create studio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Set up your studio
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Create your studio to open the business panel.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Studio name *
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border-0 bg-white px-3 py-2 text-sm focus:outline-none"
              placeholder="Henzo Studio"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Currency</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(parseStudioCurrency(e.target.value))}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#F15942]"
            >
              {CURRENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Address</span>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-lg border-0 bg-white px-3 py-2 text-sm focus:outline-none"
              placeholder="Street, city"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Phone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border-0 bg-white px-3 py-2 text-sm focus:outline-none"
              placeholder="+84..."
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-[#F15942] text-white font-medium py-2.5 hover:bg-[#D94C37] disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Continue to dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
