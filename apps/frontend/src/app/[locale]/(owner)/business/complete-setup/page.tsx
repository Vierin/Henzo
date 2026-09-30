'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';
import {
  defaultCurrencyForLocale,
  STUDIO_CURRENCIES,
  type StudioCurrency,
} from '@/lib/format-money';
import {
  fetchOwnerAddressSuggestions,
  type OwnerAddressSuggestion,
} from '@/lib/owner/mapbox-address';

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

const fieldClassName =
  'studio-setup-field mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#F15942] focus:outline-none';

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
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const [suggestions, setSuggestions] = useState<OwnerAddressSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const currencyRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = address.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }
    if (coords) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void fetchOwnerAddressSuggestions(q, { country: 'all' })
        .then((list) => {
          if (cancelled) return;
          setSuggestions(list);
          setSuggestionsOpen(list.length > 0);
        })
        .catch(() => {
          if (cancelled) return;
          setSuggestions([]);
          setSuggestionsOpen(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [address, coords]);

  useEffect(() => {
    if (!currencyOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!currencyRef.current?.contains(event.target as Node)) {
        setCurrencyOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCurrencyOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [currencyOpen]);

  const selectedCurrency = CURRENCY_OPTIONS.find(
    (opt) => opt.value === currency,
  );

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Studio name is required');
      return;
    }
    if (!address.trim()) {
      setError('Address is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createStudio({
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim() || undefined,
        currency,
        ...(coords ? { latitude: coords.lat, longitude: coords.lon } : {}),
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
              className={fieldClassName}
              placeholder="Henzo Studio"
              required
            />
          </label>
          <div className="relative" ref={currencyRef}>
            <span className="text-sm font-medium text-gray-700">Currency</span>
            <button
              type="button"
              className={`${fieldClassName} flex items-center justify-between text-left`}
              aria-haspopup="listbox"
              aria-expanded={currencyOpen}
              onClick={() => setCurrencyOpen((open) => !open)}
            >
              <span>{selectedCurrency?.label}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-gray-500 transition ${currencyOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            {currencyOpen ? (
              <ul
                role="listbox"
                className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
              >
                {CURRENCY_OPTIONS.map((opt) => {
                  const selected = opt.value === currency;
                  return (
                    <li key={opt.value}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`block w-full px-3 py-2 text-left text-sm ${
                          selected
                            ? 'bg-[#FFF1EE] font-medium text-[#F15942]'
                            : 'text-gray-800 hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          setCurrency(opt.value);
                          setCurrencyOpen(false);
                        }}
                      >
                        {opt.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
          <div className="relative">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Address *
              </span>
              <input
                value={address}
                required
                onChange={(e) => {
                  setAddress(e.target.value);
                  setCoords(null);
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setSuggestionsOpen(true);
                }}
                onBlur={() => {
                  window.setTimeout(() => setSuggestionsOpen(false), 150);
                }}
                className={fieldClassName}
                placeholder="Street, city"
                autoComplete="off"
                role="combobox"
                aria-expanded={suggestionsOpen}
                aria-controls="studio-address-suggestions"
                aria-autocomplete="list"
              />
            </label>
            {suggestionsOpen && suggestions.length > 0 ? (
              <ul
                id="studio-address-suggestions"
                role="listbox"
                className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
              >
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={address === s.address}
                      className="block w-full border-b border-gray-100 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setAddress(s.address);
                        setCoords({ lat: s.lat, lon: s.lon });
                        setSuggestionsOpen(false);
                        setSuggestions([]);
                      }}
                    >
                      {s.address}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Phone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={fieldClassName}
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
