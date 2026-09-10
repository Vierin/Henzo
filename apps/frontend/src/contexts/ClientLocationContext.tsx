'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_CLIENT_LOCATION,
  displayLocationLabel,
  readStoredClientLocation,
  writeStoredClientLocation,
  type ClientLocation,
} from '@/lib/client/client-location';

type ClientLocationContextValue = {
  location: ClientLocation;
  /** True after localStorage hydrate. */
  isHydrated: boolean;
  /** True when the user (or a previous visit) saved a city — not the default. */
  hasUserLocation: boolean;
  setLocation: (next: ClientLocation) => void;
  label: (fallback?: string) => string;
};

const ClientLocationContext = createContext<ClientLocationContextValue | null>(
  null,
);

export function ClientLocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<ClientLocation>(
    DEFAULT_CLIENT_LOCATION,
  );
  const [hasUserLocation, setHasUserLocation] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredClientLocation();
    if (stored) {
      setLocationState(stored);
      setHasUserLocation(true);
    }
    setIsHydrated(true);
  }, []);

  const setLocation = useCallback((next: ClientLocation) => {
    const normalized: ClientLocation = {
      city: next.city.trim(),
      country: next.country?.trim() || null,
      lat: next.lat,
      lng: next.lng,
    };
    if (!normalized.city) return;
    writeStoredClientLocation(normalized);
    setLocationState(normalized);
    setHasUserLocation(true);
  }, []);

  const value = useMemo<ClientLocationContextValue>(
    () => ({
      location,
      isHydrated,
      hasUserLocation,
      setLocation,
      label: (fallback = 'Set location') =>
        hasUserLocation ? displayLocationLabel(location, fallback) : fallback,
    }),
    [location, isHydrated, hasUserLocation, setLocation],
  );

  return (
    <ClientLocationContext.Provider value={value}>
      {children}
    </ClientLocationContext.Provider>
  );
}

export function useClientLocation() {
  const ctx = useContext(ClientLocationContext);
  if (!ctx) {
    throw new Error(
      'useClientLocation must be used within ClientLocationProvider',
    );
  }
  return ctx;
}
