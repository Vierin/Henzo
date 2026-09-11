'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2, MapPin, Navigation, Search, X } from 'lucide-react';
import { useClientLocation } from '@/contexts/ClientLocationContext';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  QUICK_CITIES,
  type ClientLocation,
} from '@/lib/client/client-location';
import {
  fetchCityAutocomplete,
  reverseGeocodeCity,
  type CitySuggestion,
} from '@/lib/client/mapbox-public';
import { stripLocaleFromPath } from '@/i18n/routing';
import { isRouteMatch, ownerRoutes } from '@/config/routes';

const T = 'homepage.client.locationPrompt';

/** Skip owner/admin/auth shells — location is for client discovery UX. */
function shouldOfferLocationPrompt(pathname: string | null): boolean {
  if (!pathname) return false;
  const path = stripLocaleFromPath(pathname);
  if (path.startsWith('/admin')) return false;
  if (path.startsWith('/auth')) return false;
  if (isRouteMatch(path, ownerRoutes)) return false;
  if (
    path.startsWith('/business/login') ||
    path.startsWith('/business/register')
  ) {
    return false;
  }
  if (path.startsWith('/login') || path.startsWith('/register')) return false;
  if (path.startsWith('/forgot-password')) return false;
  return true;
}

/**
 * First-visit location gate (mobile parity): shown site-wide when no city is saved.
 * Offers GPS or manual city pick; dismissible without saving.
 */
export function ClientLocationPrompt() {
  const t = useTranslation();
  const pathname = usePathname();
  const { isHydrated, hasUserLocation, setLocation } = useClientLocation();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'ask' | 'manual'>('ask');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!isHydrated || hasUserLocation || shownRef.current) return;
    if (!shouldOfferLocationPrompt(pathname)) return;
    shownRef.current = true;
    setOpen(true);
  }, [isHydrated, hasUserLocation, pathname]);

  useEffect(() => {
    if (!open || mode !== 'manual') return;
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open, mode]);

  useEffect(() => {
    if (!open || mode !== 'manual') return;
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
  }, [query, open, mode]);

  if (!open) return null;

  const title = String(t(`${T}.title`) || 'Share your location');
  const body = String(
    t(`${T}.body`) ||
      'To show studios near you, allow location access or choose your city.',
  );
  const useCurrent = String(t(`${T}.useCurrent`) || 'Use current location');
  const enterManual = String(t(`${T}.enterManual`) || 'Enter city manually');
  const detecting = String(t(`${T}.detecting`) || 'Detecting…');
  const searchPlaceholder = String(
    t(`${T}.searchPlaceholder`) || 'Search city…',
  );
  const popularLabel = String(t(`${T}.popular`) || 'Popular');
  const noCities = String(t(`${T}.noCities`) || 'No cities found');
  const searchingLabel = String(t(`${T}.searching`) || 'Searching…');
  const backLabel = String(t(`${T}.back`) || 'Back');
  const unsupported = String(
    t(`${T}.unsupported`) || 'Geolocation is not supported in this browser',
  );
  const detectFailed = String(
    t(`${T}.detectFailed`) ||
      'Could not detect your location. Allow location access or search a city.',
  );

  const close = () => {
    setOpen(false);
    setMode('ask');
    setQuery('');
    setSuggestions([]);
    setError(null);
  };

  const apply = (next: ClientLocation) => {
    setLocation(next);
    close();
  };

  const detectGps = async () => {
    setError(null);
    if (!navigator.geolocation) {
      setError(unsupported);
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
      setError(detectFailed);
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={close}
      />
      <div
        className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col rounded-t-[20px] bg-white shadow-xl sm:rounded-[20px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-location-prompt-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#F1E4DB] px-5 py-4">
          <div className="min-w-0">
            <h2
              id="client-location-prompt-title"
              className="text-lg font-bold text-[#3F3F3F]"
            >
              {mode === 'manual' ? enterManual : title}
            </h2>
            {mode === 'ask' ? (
              <p className="mt-1 text-sm leading-relaxed text-[#878787]">
                {body}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-lg p-1 text-[#878787] transition hover:bg-[#F9F4F0] hover:text-[#3F3F3F]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {mode === 'ask' ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void detectGps()}
                disabled={locating}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E86D4F] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#d85e42] disabled:opacity-60"
              >
                {locating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
                {locating ? detecting : useCurrent}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('manual');
                }}
                disabled={locating}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E8E0D8] px-4 py-3.5 text-sm font-semibold text-[#3F3F3F] transition hover:bg-[#F9F4F0] disabled:opacity-60"
              >
                <MapPin className="h-4 w-4 text-[#E86D4F]" />
                {enterManual}
              </button>
              {error ? (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => {
                  setMode('ask');
                  setQuery('');
                  setSuggestions([]);
                  setError(null);
                }}
                className="mb-3 text-sm font-medium text-[#4D39A8] hover:underline"
              >
                ← {backLabel}
              </button>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#878787]" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-xl border border-[#E8E0D8] bg-[#F9F4F0] py-2.5 pl-9 pr-3 text-sm text-[#3F3F3F] outline-none focus:border-[#E86D4F]/50"
                />
              </div>

              <div className="mt-3 max-h-64 overflow-y-auto">
                {searching ? (
                  <p className="px-1 py-3 text-sm text-[#878787]">
                    {searchingLabel}
                  </p>
                ) : query.trim().length >= 2 ? (
                  suggestions.length === 0 ? (
                    <p className="px-1 py-3 text-sm text-[#878787]">
                      {noCities}
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
                    <p className="px-1 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-[#878787]">
                      {popularLabel}
                    </p>
                    <ul>
                      {QUICK_CITIES.map((c) => (
                        <li key={`${c.city}-${c.lat}`}>
                          <button
                            type="button"
                            onClick={() => apply(c)}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-[#3F3F3F] hover:bg-[#F9F4F0]"
                          >
                            <MapPin className="h-3.5 w-3.5 shrink-0 opacity-60" />
                            {c.city}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
