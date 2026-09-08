'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ownerTheme } from '@/lib/owner/owner-theme';

const MARKER_ICON = L.divIcon({
  className: 'owner-map-marker !border-0 !bg-transparent',
  html: `<span style="
    display:block;
    width:18px;
    height:18px;
    border-radius:9999px;
    background:${ownerTheme.accent};
    border:2px solid #fff;
    box-shadow:0 1px 4px rgba(0,0,0,.35);
  "></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/**
 * Free raster basemap (no API key).
 * Esri World Street — warmer than raw OSM; Mapbox stays on backend for geocoding.
 *
 * Do NOT put CSS `filter` on Leaflet panes — it creates a containing block and
 * tiles render blank/white.
 */
function basemapLayer(): L.TileLayer {
  return L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    {
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, OpenStreetMap contributors',
      maxZoom: 19,
    },
  );
}

export function OwnerAddressMapPicker({
  latitude,
  longitude,
  onPick,
  className,
}: {
  latitude: number;
  longitude: number;
  onPick: (coords: { lat: number; lon: number }) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      center: [latitude, longitude],
      zoom: 16,
      scrollWheelZoom: true,
    });
    basemapLayer().addTo(map);

    const marker = L.marker([latitude, longitude], {
      draggable: true,
      icon: MARKER_ICON,
      autoPan: true,
    }).addTo(map);

    const emit = (latlng: L.LatLng) => {
      onPickRef.current({ lat: latlng.lat, lon: latlng.lng });
    };

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      emit(e.latlng);
    });
    marker.on('dragend', () => {
      emit(marker.getLatLng());
    });

    mapRef.current = map;
    markerRef.current = marker;

    const refreshSize = () => map.invalidateSize({ animate: false });
    requestAnimationFrame(refreshSize);
    const t1 = window.setTimeout(refreshSize, 50);
    const t2 = window.setTimeout(refreshSize, 250);
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => refreshSize())
        : null;
    ro?.observe(el);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro?.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    const next = L.latLng(latitude, longitude);
    const cur = marker.getLatLng();
    if (
      Math.abs(cur.lat - next.lat) < 1e-8 &&
      Math.abs(cur.lng - next.lng) < 1e-8
    ) {
      return;
    }
    marker.setLatLng(next);
    map.panTo(next);
    map.invalidateSize({ animate: false });
  }, [latitude, longitude]);

  return (
    <div
      className={
        className ??
        'relative h-[220px] w-full overflow-hidden rounded-[14px] bg-[#F8EDE5]'
      }
    >
      <div
        ref={containerRef}
        className="h-full w-full [&_.owner-map-marker]:!border-0 [&_.owner-map-marker]:!bg-transparent"
      />
      {/* Cream wash without CSS filter on Leaflet panes */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[14px]"
        style={{
          backgroundColor: ownerTheme.bg,
          mixBlendMode: 'soft-light',
          opacity: 0.55,
        }}
        aria-hidden
      />
    </div>
  );
}
