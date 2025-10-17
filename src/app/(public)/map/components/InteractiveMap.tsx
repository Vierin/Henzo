'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Salon } from '@/types';
import { useFeaturedSalons } from '@/hooks/useSalonPreview';
import dynamic from 'next/dynamic';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';
import './MapStyles.css';

// Import Leaflet dynamically to avoid SSR issues
let L: any = null;

// Dynamically import Leaflet components to avoid SSR issues
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
	zoom: number;
	onMarkerClick: (salon: Salon) => void;
	selectedSalon: Salon | null;
	onMapBoundsChange?: (bounds: {
		north: number;
		south: number;
		east: number;
		west: number;
	}) => void;
}

export default function InteractiveMap({
	center,
	zoom,
	onMarkerClick,
	selectedSalon,
	onMapBoundsChange,
}: InteractiveMapProps) {
	const [currentZoom, setCurrentZoom] = useState(zoom);
	const [mapInstance, setMapInstance] = useState<any>(null);
	const [leafletLoaded, setLeafletLoaded] = useState(false);
	const { data: salons = [], isLoading: isSalonsLoading } =
		useFeaturedSalons(20);
	const lastBoundsRef = useRef<string | null>(null);

	// Initialize Leaflet
	useEffect(() => {
		if (typeof window !== 'undefined') {
			// Always reinitialize to ensure L is available
			L = require('leaflet');

			// Fix for default markers in Leaflet with Next.js
			delete (L.Icon.Default.prototype as any)._getIconUrl;
			L.Icon.Default.mergeOptions({
				iconRetinaUrl:
					'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
				iconUrl:
					'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
				shadowUrl:
					'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
			});

			setLeafletLoaded(true);
			console.log('Leaflet initialized, L available:', !!L);
		}
	}, []);

	// Filter salons that have coordinates (from geocoding cache)
	const displaySalons = useMemo(
		() =>
			(salons as any[]).filter((salon) => salon.latitude && salon.longitude),
		[salons]
	);

	// Create custom pin icon function with useCallback
	const createCustomIcon = useCallback(
		(salon: Salon) => {
			if (!L) {
				return null;
			}

			try {
				const isSelected = selectedSalon?.id === salon.id;
				const color = isSelected ? '#e04a4a' : '#ff5b5b';

				return L.divIcon({
					className: 'custom-pin-marker',
					html: `
						<svg width="29" height="37" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));">
							<path d="M18 0C8.059 0 0 8.059 0 18C0 27 18 46 18 46C18 46 36 27 36 18C36 8.059 27.941 0 18 0Z" fill="${color}"/>
							<circle cx="18" cy="17" r="7" fill="white"/>
						</svg>
					`,
					iconSize: [29, 37],
					iconAnchor: [14.5, 37],
					popupAnchor: [0, -37],
				});
			} catch (error) {
				console.error('Error creating custom icon:', error);
				return null;
			}
		},
		[L, selectedSalon]
	);

	// Memoize markers to prevent recreating on every render
	const salonMarkers = useMemo(() => {
		if (!leafletLoaded || !L) return null;

		return displaySalons.map((salon: any) => {
			if (!salon.latitude || !salon.longitude) {
				return null;
			}

			const customIcon = createCustomIcon(salon);
			if (!customIcon) {
				return null;
			}

			return (
				<Marker
					key={salon.id}
					position={[salon.latitude, salon.longitude]}
					icon={customIcon}
					eventHandlers={{
						click: () => {
							onMarkerClick(salon);
						},
					}}
				/>
			);
		});
	}, [leafletLoaded, L, displaySalons, onMarkerClick, createCustomIcon]);

	// Update map center when center prop changes
	useEffect(() => {
		if (mapInstance && center) {
			mapInstance.setView([center.lat, center.lng], zoom);
		}
	}, [center, zoom, mapInstance]);

	// Track map bounds changes
	const updateBounds = useCallback(() => {
		if (!mapInstance || !onMapBoundsChange) return;

		const bounds = mapInstance.getBounds();
		const boundsData = {
			north: bounds.getNorth(),
			south: bounds.getSouth(),
			east: bounds.getEast(),
			west: bounds.getWest(),
		};

		// Serialize bounds to string for comparison
		const boundsString = JSON.stringify({
			north: boundsData.north.toFixed(6),
			south: boundsData.south.toFixed(6),
			east: boundsData.east.toFixed(6),
			west: boundsData.west.toFixed(6),
		});

		// Only update if bounds actually changed
		if (lastBoundsRef.current !== boundsString) {
			lastBoundsRef.current = boundsString;
			onMapBoundsChange(boundsData);
		}
	}, [mapInstance, onMapBoundsChange]);

	useEffect(() => {
		if (mapInstance && onMapBoundsChange) {
			// Update bounds on move and zoom
			mapInstance.on('moveend', updateBounds);
			mapInstance.on('zoomend', updateBounds);

			// Initial bounds
			updateBounds();

			return () => {
				mapInstance.off('moveend', updateBounds);
				mapInstance.off('zoomend', updateBounds);
			};
		}
	}, [mapInstance, onMapBoundsChange, updateBounds]);

	return (
		<div className="relative w-full h-full">
			{/* Loading overlay */}
			{isSalonsLoading && (
				<div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
					<div className="flex flex-col items-center gap-4">
						<div className="relative">
							<div className="w-16 h-16 border-4 border-gray-200 border-t-[#ff5b5b] rounded-full animate-spin"></div>
						</div>
						<p className="text-gray-600 font-medium">Loading salons...</p>
					</div>
				</div>
			)}

			<MapContainer
				center={[center.lat, center.lng]}
				zoom={zoom}
				style={{ height: '100%', width: '100%' }}
				ref={setMapInstance}
				className="z-0"
			>
				{/* Gray styled tile layer */}
				<TileLayer
					url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
					subdomains="abcd"
					maxZoom={19}
				/>

				{/* Salon markers */}
				{salonMarkers}
			</MapContainer>
		</div>
	);
}
