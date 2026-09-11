'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, MapPin, Navigation, Search } from 'lucide-react';
import { useClientLocation } from '@/contexts/ClientLocationContext';
import {
  QUICK_CITIES,
  type ClientLocation,
} from '@/lib/client/client-location';
import {
  fetchCityAutocomplete,
  reverseGeocodeCity,
  type CitySuggestion,
} from '@/lib/client/mapbox-public';

type Props = {
  fallbackLabel?: string;
  className?: string;
  /** Compact trigger for hero search bar (no pill border). */
  variant?: 'default' | 'hero';
};

export function ClientLocationPicker({
  fallbackLabel = 'Set location',
  className = '',
  variant = 'default',
}: Props) {
  const { location, setLocation, label, isHydrated } = useClientLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const display = isHydrated ? label(fallbackLabel) : fallbackLabel;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      fetchCityAutocomplete(q)
        .then((list) => {
          if (!cancelled) {
            setSuggestions(list);
            setSearching(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSuggestions([]);
            setSearching(false);
          }
        });
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  const apply = (next: ClientLocation) => {
    setLocation(next);
    setOpen(false);
    setQuery('');
    setSuggestions([]);
    setError(null);
  };

  const detectGps = async () => {
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser');
      return;
    }
    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60_000,
        });
      });
      const { latitude: lat, longitude: lng } = pos.coords;
      const reverse = await reverseGeocodeCity(lat, lng);
      apply({
        city: reverse?.city || 'Current location',
        country: reverse?.country ?? null,
        lat,
        lng,
      });
    } catch {
      setError(
        'Could not detect your location. Allow location access or search a city.',
      );
    } finally {
      setLocating(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          variant === 'hero'
            ? 'flex max-w-full items-center gap-1.5 rounded-xl px-1 py-1 text-left text-sm font-semibold text-[#3F3F3F] transition hover:bg-[#F9F4F0]'
            : 'flex h-10 max-w-full items-center gap-1.5 rounded-full border border-[#E8E0D8] bg-white/80 px-2.5 text-sm font-medium text-[#3F3F3F] transition hover:border-[#E86D4F]/30 sm:px-3'
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={display}
      >
        <MapPin className="h-4 w-4 shrink-0 text-[#E86D4F]" aria-hidden />
        <span
          className={
            variant === 'hero'
              ? 'max-w-[8rem] truncate sm:max-w-[11rem]'
              : 'max-w-[7.5rem] truncate sm:max-w-[10rem]'
          }
        >
          {display}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#878787] transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Choose location"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-[#E8E0D8] bg-white shadow-xl"
        >
          <div className="border-b border-[#F0EAE4] p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#878787]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search city…"
                className="w-full rounded-xl border border-[#E8E0D8] bg-[#F9F4F0] py-2.5 pl-9 pr-9 text-sm text-[#3F3F3F] outline-none focus:border-[#E86D4F]/50"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#C4B8AE] transition hover:bg-[#E86D4F]/10 hover:text-[#E86D4F]"
                  aria-label="Clear"
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="h-3.5 w-3.5"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M4 4l8 8M12 4L4 12"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => void detectGps()}
              disabled={locating}
              className="mt-2 flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-left text-sm font-semibold text-[#4D39A8] hover:bg-[#F5F2FF] disabled:opacity-60"
            >
              {locating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              {locating ? 'Detecting…' : 'Use current location'}
            </button>
            {error ? (
              <p className="mt-1 px-1 text-xs text-red-600" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            {searching ? (
              <p className="px-2 py-3 text-sm text-[#878787]">Searching…</p>
            ) : query.trim().length >= 2 ? (
              suggestions.length === 0 ? (
                <p className="px-2 py-3 text-sm text-[#878787]">
                  No cities found
                </p>
              ) : (
                <ul>
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() =>
                          apply({
                            city: s.city,
                            country: s.country,
                            lat: s.lat,
                            lng: s.lng,
                          })
                        }
                        className="flex w-full flex-col rounded-xl px-3 py-2.5 text-left hover:bg-[#F9F4F0]"
                      >
                        <span className="text-sm font-semibold text-[#3F3F3F]">
                          {s.city}
                        </span>
                        <span className="truncate text-xs text-[#878787]">
                          {s.label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <>
                <p className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-[#878787]">
                  Popular
                </p>
                <ul>
                  {QUICK_CITIES.map((c) => {
                    const active =
                      c.city === location.city &&
                      Math.abs(c.lat - location.lat) < 0.01;
                    return (
                      <li key={`${c.city}-${c.lat}`}>
                        <button
                          type="button"
                          onClick={() => apply(c)}
                          className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-[#F9F4F0] ${
                            active
                              ? 'font-semibold text-[#E86D4F]'
                              : 'text-[#3F3F3F]'
                          }`}
                        >
                          <MapPin className="h-3.5 w-3.5 shrink-0 opacity-60" />
                          {c.city}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
