'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MARKER_ICON = L.divIcon({
  className: 'admin-map-marker !border-0 !bg-transparent',
  html: `<span style="
    display:block;
    width:18px;
    height:18px;
    border-radius:9999px;
    background:#3F3287;
    border:2px solid #fff;
    box-shadow:0 1px 4px rgba(0,0,0,.35);
  "></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export function AdminAddressMapPicker({
  latitude,
  longitude,
  onPick,
}: {
  latitude: number;
  longitude: number;
  onPick: (coords: { lat: number; lon: number }) => void;
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
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(map);

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

    // Leaflet needs a tick after mount in modals/dialogs.
    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Init once; lat/lon sync handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      className="h-[240px] w-full overflow-hidden rounded-lg [&_.admin-map-marker]:!border-0 [&_.admin-map-marker]:!bg-transparent"
    />
  );
}
