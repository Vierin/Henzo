'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { Salon } from '@/types';

const PIN_SVG = (fill: string) =>
	`<svg width="29" height="37" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 8px rgba(0,0,0,0.3))"><path d="M18 0C8.059 0 0 8.059 0 18C0 27 18 46 18 46C18 46 36 27 36 18C36 8.059 27.941 0 18 0Z" fill="${fill}"/><circle cx="18" cy="17" r="7" fill="white"/></svg>`;

let cachedIcons: { default: L.DivIcon; selected: L.DivIcon } | null = null;

function getPinIcons() {
	if (!cachedIcons) {
		cachedIcons = {
			default: L.divIcon({
				className: 'map-salon-pin',
				html: PIN_SVG('#ff5b5b'),
				iconSize: [29, 37],
				iconAnchor: [14.5, 37],
				popupAnchor: [0, -37],
			}),
			selected: L.divIcon({
				className: 'map-salon-pin map-salon-pin--selected',
				html: PIN_SVG('#e04a4a'),
				iconSize: [29, 37],
				iconAnchor: [14.5, 37],
				popupAnchor: [0, -37],
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
 * Imperative MarkerClusterGroup + two cached divIcons (default vs selected).
 */
export default function SalonMarkerCluster({
	salons,
	selectedSalon,
	onMarkerClick,
}: SalonMarkerClusterProps) {
	const map = useMap();
	const clusterRef = useRef<L.MarkerClusterGroup | null>(null);

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
			map.removeLayer(cluster);
			clusterRef.current = null;
		};
	}, [map]);

	useEffect(() => {
		const cluster = clusterRef.current;
		if (!cluster) return;

		const icons = getPinIcons();
		cluster.clearLayers();

		for (const salon of salons) {
			if (salon.latitude == null || salon.longitude == null) continue;
			const icon =
				selectedSalon?.id === salon.id ? icons.selected : icons.default;
			const marker = L.marker([salon.latitude, salon.longitude], { icon });
			marker.on('click', () => onMarkerClick(salon));
			cluster.addLayer(marker);
		}
	}, [salons, selectedSalon, onMarkerClick]);

	return null;
}
