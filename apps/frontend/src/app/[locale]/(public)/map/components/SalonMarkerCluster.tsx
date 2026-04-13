'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { Salon } from '@/types';

const PIN_DEFAULT_W = 29;
const PIN_DEFAULT_H = 37;
/** Selected pin: visibly larger + darker fill */
const PIN_SELECTED_W = 34;
const PIN_SELECTED_H = 43;

const PIN_SVG = (
	fill: string,
	opts: { width: number; height: number; shadow: string },
) =>
	`<svg width="${opts.width}" height="${opts.height}" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg" style="filter:${opts.shadow}"><path d="M18 0C8.059 0 0 8.059 0 18C0 27 18 46 18 46C18 46 36 27 36 18C36 8.059 27.941 0 18 0Z" fill="${fill}"/><circle cx="18" cy="17" r="7" fill="white"/></svg>`;

let cachedIcons: { default: L.DivIcon; selected: L.DivIcon } | null = null;

function getPinIcons() {
	if (!cachedIcons) {
		cachedIcons = {
			default: L.divIcon({
				className: 'map-salon-pin',
				html: PIN_SVG('#ff5b5b', {
					width: PIN_DEFAULT_W,
					height: PIN_DEFAULT_H,
					shadow: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
				}),
				iconSize: [PIN_DEFAULT_W, PIN_DEFAULT_H],
				iconAnchor: [PIN_DEFAULT_W / 2, PIN_DEFAULT_H],
				popupAnchor: [0, -PIN_DEFAULT_H],
			}),
			selected: L.divIcon({
				className: 'map-salon-pin map-salon-pin--selected',
				html: PIN_SVG('#ff1717', {
					width: PIN_SELECTED_W,
					height: PIN_SELECTED_H,
					shadow: 'drop-shadow(0 3px 12px rgba(0,0,0,0.45))',
				}),
				iconSize: [PIN_SELECTED_W, PIN_SELECTED_H],
				iconAnchor: [PIN_SELECTED_W / 2, PIN_SELECTED_H],
				popupAnchor: [0, -PIN_SELECTED_H],
			}),
		};
	}
	return cachedIcons;
}

interface SalonMarkerClusterProps {
	salons: Salon[];
	selectedSalon: Salon | null;
	onMarkerClick: (salon: Salon) => void;
}

/**
 * MarkerClusterGroup: маркеры по id добавляются/удаляются без clearLayers;
 * иконка обновляется только при смене выбора.
 */
export default function SalonMarkerCluster({
	salons,
	selectedSalon,
	onMarkerClick,
}: SalonMarkerClusterProps) {
	const map = useMap();
	const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
	const markersRef = useRef<Map<string, L.Marker>>(new Map());
	const salonsByIdRef = useRef<Map<string, Salon>>(new Map());
	const onMarkerClickRef = useRef(onMarkerClick);
	onMarkerClickRef.current = onMarkerClick;

	useEffect(() => {
		salonsByIdRef.current = new Map(salons.map((s) => [s.id, s]));
	}, [salons]);

	useEffect(() => {
		const cluster = L.markerClusterGroup({
			chunkedLoading: true,
			spiderfyOnMaxZoom: true,
			showCoverageOnHover: false,
			maxClusterRadius: 56,
		});
		clusterRef.current = cluster;
		map.addLayer(cluster);
		return () => {
			markersRef.current.clear();
			map.removeLayer(cluster);
			clusterRef.current = null;
		};
	}, [map]);

	useEffect(() => {
		const cluster = clusterRef.current;
		if (!cluster) return;

		const icons = getPinIcons();
		const nextIds = new Set<string>();

		for (const salon of salons) {
			if (salon.latitude == null || salon.longitude == null) continue;
			nextIds.add(salon.id);
		}

		for (const [id, marker] of markersRef.current) {
			if (!nextIds.has(id)) {
				cluster.removeLayer(marker);
				markersRef.current.delete(id);
			}
		}

		for (const salon of salons) {
			if (salon.latitude == null || salon.longitude == null) continue;
			const icon =
				selectedSalon?.id === salon.id ? icons.selected : icons.default;
			let marker = markersRef.current.get(salon.id);
			const zIndexOffset = selectedSalon?.id === salon.id ? 650 : 0;
			if (!marker) {
				marker = L.marker([salon.latitude, salon.longitude], {
					icon,
					zIndexOffset,
				});
				const sid = salon.id;
				marker.on('click', () => {
					const latest = salonsByIdRef.current.get(sid);
					if (latest) onMarkerClickRef.current(latest);
				});
				markersRef.current.set(salon.id, marker);
				cluster.addLayer(marker);
			} else {
				marker.setLatLng([salon.latitude, salon.longitude]);
				marker.setIcon(icon);
				marker.setZIndexOffset(zIndexOffset);
			}
		}
	}, [salons, selectedSalon]);

	return null;
}
