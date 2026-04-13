'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Salon } from '@/types';
import dynamic from 'next/dynamic';
import SalonMarkerCluster from './SalonMarkerCluster';
import { useTranslation } from '@/contexts/LanguageContext';
import type { MapBounds } from '@/utils/mapUtils';

import 'leaflet/dist/leaflet.css';
import './MapStyles.css';

let L: typeof import('leaflet') | null = null;

const MapContainer = dynamic(
	() => import('react-leaflet').then((mod) => mod.MapContainer),
	{ ssr: false }
);

const TileLayer = dynamic(
	() => import('react-leaflet').then((mod) => mod.TileLayer),
	{ ssr: false }
);

const Marker = dynamic(
	() => import('react-leaflet').then((mod) => mod.Marker),
	{ ssr: false }
);

interface InteractiveMapProps {
	center: { lat: number; lng: number };
	userLocation?: { lat: number; lng: number } | null;
	zoom: number;
	onMarkerClick: (salon: Salon) => void;
	selectedSalon: Salon | null;
	onMapBoundsChange?: (bounds: MapBounds) => void;
	salons: Salon[];
	isLoadingSalons?: boolean;
}

export default function InteractiveMap({
	center,
	userLocation = null,
	zoom,
	onMarkerClick,
	selectedSalon,
	onMapBoundsChange,
	salons,
	isLoadingSalons = false,
}: InteractiveMapProps) {
	const t = useTranslation();
	const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
	const [leafletLoaded, setLeafletLoaded] = useState(false);
	const lastBoundsRef = useRef<string | null>(null);
	const latestBoundsRef = useRef<MapBounds | null>(null);
	const boundsDebounceRef = useRef<number | null>(null);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		import('leaflet').then((leaflet) => {
			L = leaflet.default || leaflet;
			delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
				._getIconUrl;
			L.Icon.Default.mergeOptions({
				iconRetinaUrl:
					'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
				iconUrl:
					'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
				shadowUrl:
					'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
			});
			setLeafletLoaded(true);
		});
	}, []);

	const salonsWithCoords = salons.filter(
		(s) => s.latitude != null && s.longitude != null
	);

	const emitBounds = useCallback(() => {
		if (!latestBoundsRef.current || !onMapBoundsChange) return;
		const boundsData = latestBoundsRef.current;
		const boundsString = JSON.stringify({
			north: boundsData.north.toFixed(6),
			south: boundsData.south.toFixed(6),
			east: boundsData.east.toFixed(6),
			west: boundsData.west.toFixed(6),
		});
		if (lastBoundsRef.current !== boundsString) {
			lastBoundsRef.current = boundsString;
			onMapBoundsChange(boundsData);
		}
	}, [onMapBoundsChange]);

	const updateBounds = useCallback(() => {
		if (!mapInstance || !onMapBoundsChange) return;
		const bounds = mapInstance.getBounds();
		latestBoundsRef.current = {
			north: bounds.getNorth(),
			south: bounds.getSouth(),
			east: bounds.getEast(),
			west: bounds.getWest(),
		};
		if (boundsDebounceRef.current !== null) {
			clearTimeout(boundsDebounceRef.current);
		}
		boundsDebounceRef.current = window.setTimeout(() => {
			boundsDebounceRef.current = null;
			emitBounds();
		}, 380);
	}, [mapInstance, onMapBoundsChange, emitBounds]);

	useEffect(() => {
		if (mapInstance && onMapBoundsChange) {
			mapInstance.on('moveend', updateBounds);
			mapInstance.on('zoomend', updateBounds);
			updateBounds();
			return () => {
				mapInstance.off('moveend', updateBounds);
				mapInstance.off('zoomend', updateBounds);
			};
		}
	}, [mapInstance, onMapBoundsChange, updateBounds]);

	useEffect(() => {
		return () => {
			if (boundsDebounceRef.current !== null) {
				clearTimeout(boundsDebounceRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (mapInstance && center) {
			mapInstance.setView([center.lat, center.lng], zoom);
		}
	}, [center, zoom, mapInstance]);

	const userMarker =
		leafletLoaded && L && userLocation ? (
			<Marker
				key="user-location"
				position={[userLocation.lat, userLocation.lng]}
				icon={L.divIcon({
					className: 'user-location-marker',
					html: '<div class="user-location-dot"></div>',
					iconSize: [18, 18],
					iconAnchor: [9, 9],
				})}
			/>
		) : null;

	return (
		<div className="relative w-full h-full">
			{isLoadingSalons && (
				<div className="absolute top-3 right-3 z-[500] rounded-md bg-white/90 px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-md backdrop-blur-sm">
					{t.map.loadingSalons}
				</div>
			)}

			<MapContainer
				center={[center.lat, center.lng]}
				zoom={zoom}
				style={{ height: '100%', width: '100%' }}
				ref={setMapInstance}
				className="z-0"
			>
				<TileLayer
					url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
					subdomains="abcd"
					maxZoom={19}
				/>

				{leafletLoaded && (
					<SalonMarkerCluster
						salons={salonsWithCoords}
						selectedSalon={selectedSalon}
						onMarkerClick={onMarkerClick}
					/>
				)}
				{userMarker}
			</MapContainer>
		</div>
	);
}
