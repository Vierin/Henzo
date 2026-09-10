'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, MapPin, Navigation, X } from 'lucide-react';
import {
  DEFAULT_MAP_CENTER,
  fetchOwnerAddressSuggestions,
  reverseGeocodeOwnerAddress,
  type OwnerAddressSuggestion,
} from '@/lib/owner/mapbox-address';
import { ownerTheme } from '@/lib/owner/owner-theme';

const OwnerAddressMapPicker = dynamic(
  () =>
    import('@/components/owner/ownerAddressMapPicker').then(
      (m) => m.OwnerAddressMapPicker,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[220px] items-center justify-center rounded-[14px]"
        style={{ backgroundColor: ownerTheme.bgSoft }}
      >
        <Loader2
          className="h-5 w-5 animate-spin"
          style={{ color: ownerTheme.textSecondary }}
        />
      </div>
    ),
  },
);

export type OwnerAddressPickerResult = {
  locationName: string;
  address: string;
  lat: number;
  lon: number;
};

const LOCATION_NAME_MAX = 60;

export function OwnerAddressPickerModal({
  open,
  initialLocationName,
  initialAddress,
  initialLat,
  initialLon,
  onClose,
  onSelect,
}: {
  open: boolean;
  initialLocationName?: string;
  initialAddress?: string;
  initialLat?: number | null;
  initialLon?: number | null;
  onClose: () => void;
  onSelect: (result: OwnerAddressPickerResult) => void;
}) {
  const [locationName, setLocationName] = useState('');
  const [search, setSearch] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<OwnerAddressSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLocationName((initialLocationName ?? '').slice(0, LOCATION_NAME_MAX));
    setSearch(initialAddress ?? '');
    setLat(
      typeof initialLat === 'number' && Number.isFinite(initialLat)
        ? initialLat
        : null,
    );
    setLon(
      typeof initialLon === 'number' && Number.isFinite(initialLon)
        ? initialLon
        : null,
    );
    setSuggestions([]);
    setShowSuggestions(false);
    setError(null);
  }, [open, initialLocationName, initialAddress, initialLat, initialLon]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const q = search.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const list = await fetchOwnerAddressSuggestions(q);
        setSuggestions(list);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, open]);

  const mapEnabled = useMemo(() => {
    if (lat != null && lon != null) return true;
    return locationName.trim().length > 0 && search.trim().length > 3;
  }, [lat, lon, locationName, search]);

  const mapLat = lat ?? DEFAULT_MAP_CENTER.lat;
  const mapLon = lon ?? DEFAULT_MAP_CENTER.lon;

  const canSelect =
    locationName.trim().length > 0 &&
    search.trim().length > 0 &&
    lat != null &&
    lon != null &&
    !reverseLoading;

  async function applyCoords(
    nextLat: number,
    nextLon: number,
    address?: string,
  ) {
    setLat(nextLat);
    setLon(nextLon);
    if (address?.trim()) {
      setSearch(address.trim());
      setShowSuggestions(false);
      return;
    }
    setReverseLoading(true);
    try {
      const rev = await reverseGeocodeOwnerAddress(nextLat, nextLon);
      if (rev?.address) setSearch(rev.address);
    } catch {
      /* keep search */
    } finally {
      setReverseLoading(false);
    }
  }

  async function onPickSuggestion(s: OwnerAddressSuggestion) {
    setShowSuggestions(false);
    setSuggestions([]);
    setSearch(s.address);
    await applyCoords(s.lat, s.lon, s.address);
  }

  async function onMapPick(coords: { lat: number; lon: number }) {
    await applyCoords(coords.lat, coords.lon);
  }

  async function detectCurrentLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not available');
      return;
    }
    setGpsLoading(true);
    setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      });
      await applyCoords(pos.coords.latitude, pos.coords.longitude);
    } catch {
      setError('Could not get current location');
    } finally {
      setGpsLoading(false);
    }
  }

  function handleSelect() {
    if (!canSelect || lat == null || lon == null) {
      setError('Enter location name and pick an address on the map');
      return;
    }
    onSelect({
      locationName: locationName.trim(),
      address: search.trim(),
      lat,
      lon,
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-[20px] bg-white shadow-xl sm:rounded-[20px]"
        role="dialog"
        aria-modal="true"
        aria-label="Select address"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#F1E4DB] px-5 py-4">
          <h2 className="text-lg font-bold" style={{ color: ownerTheme.text }}>
            Select address
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1"
            style={{ color: ownerTheme.textSecondary }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <label className="block">
            <span
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide"
              style={{ color: ownerTheme.textSecondary }}
            >
              Location name
            </span>
            <input
              value={locationName}
              maxLength={LOCATION_NAME_MAX}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Main studio"
              className="w-full rounded-[14px] bg-[#FCF3EC] px-3.5 py-3 text-[15px] outline-none"
              style={{ color: ownerTheme.text }}
            />
          </label>

          <div className="mt-4 flex items-center justify-between gap-2">
            <span
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: ownerTheme.textSecondary }}
            >
              Address
            </span>
            <button
              type="button"
              disabled={gpsLoading}
              onClick={() => void detectCurrentLocation()}
              className="inline-flex items-center gap-1.5 text-sm font-semibold disabled:opacity-50"
              style={{ color: ownerTheme.accent }}
            >
              {gpsLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Navigation className="h-3.5 w-3.5" />
              )}
              Use current location
            </button>
          </div>

          <div className="relative z-[1100] mt-1.5">
            <MapPin
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: ownerTheme.accent }}
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search address"
              className="w-full rounded-[14px] bg-[#FCF3EC] py-3 pl-10 pr-10 text-[15px] outline-none"
              style={{ color: ownerTheme.text }}
              autoComplete="off"
            />
            {loadingSuggestions || reverseLoading ? (
              <Loader2
                className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin"
                style={{ color: ownerTheme.textSecondary }}
              />
            ) : null}

            {showSuggestions && suggestions.length > 0 ? (
              <ul className="absolute left-0 right-0 z-[1100] mt-1 max-h-48 overflow-y-auto rounded-[14px] border border-[#F1E4DB] bg-white py-1 shadow-lg">
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="w-full px-3.5 py-2.5 text-left text-sm hover:bg-[#FFFCF9]"
                      style={{ color: ownerTheme.text }}
                      onClick={() => void onPickSuggestion(s)}
                    >
                      {s.address}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="relative z-0 mt-4">
            {mapEnabled ? (
              <OwnerAddressMapPicker
                latitude={mapLat}
                longitude={mapLon}
                onPick={(c) => void onMapPick(c)}
              />
            ) : (
              <div
                className="flex h-[220px] flex-col items-center justify-center rounded-[14px] px-6 text-center"
                style={{ backgroundColor: ownerTheme.bgSoft }}
              >
                <MapPin
                  className="mb-2 h-6 w-6"
                  style={{ color: ownerTheme.textSecondary }}
                />
                <p
                  className="text-sm"
                  style={{ color: ownerTheme.textSecondary }}
                >
                  Enter a location name and search for an address to unlock the
                  map, or use current location.
                </p>
              </div>
            )}
          </div>

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="flex gap-2 border-t border-[#F1E4DB] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[14px] bg-[#FCF3EC] py-3 text-sm font-semibold"
            style={{ color: ownerTheme.text }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSelect}
            onClick={handleSelect}
            className="flex-1 rounded-[14px] py-3 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: ownerTheme.accent }}
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
}
