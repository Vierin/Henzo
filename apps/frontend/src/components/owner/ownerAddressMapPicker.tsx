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
 * CARTO raster basemaps now watermark without `?key=…`.
 * Mobile uses the same public CDN URL (no key in app) — fall back to OSM
 * unless `NEXT_PUBLIC_CARTO_API_KEY` is set.
 */
function basemapLayer(): L.TileLayer {
  const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim();
  if (cartoKey) {
    return L.tileLayer(
      `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`,
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 20,
        subdomains: 'abcd',
      },
    );
  }
  return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  });
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

    requestAnimationFrame(() => map.invalidateSize());
    const t = window.setTimeout(() => map.invalidateSize(), 200);

    return () => {
      window.clearTimeout(t);
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
  }, [latitude, longitude]);

  return (
    <div
      ref={containerRef}
      className={
        className ??
        'h-[220px] w-full overflow-hidden rounded-[14px] [&_.owner-map-marker]:!border-0 [&_.owner-map-marker]:!bg-transparent'
      }
    />
  );
}
