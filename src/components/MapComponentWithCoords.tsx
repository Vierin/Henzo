'use client';

import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@/styles/map.css';

// Fix for default markers in Leaflet with Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
	._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl:
		'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
	iconUrl:
		'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
	shadowUrl:
		'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapComponentWithCoordsProps {
	lat?: number;
	lon?: number;
	address?: string;
	className?: string;
	height?: string;
	showPopup?: boolean;
	interactive?: boolean;
	zoom?: number;
	editable?: boolean; // Allow marker to be dragged
	onMarkerMove?: (lat: number, lon: number, address?: string) => void; // Callback when marker is moved
}

export default function MapComponentWithCoords({
	lat,
	lon,
	address,
	className = '',
	height = '300px',
	showPopup = true,
	interactive = true,
	zoom = 16,
	editable = false,
	onMarkerMove,
}: MapComponentWithCoordsProps) {
	const mapRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<L.Map | null>(null);
	const markerRef = useRef<L.Marker | null>(null);
	const lastCoordsRef = useRef<{ lat?: number; lon?: number }>({});

	const reverseGeocode = useCallback(
		async (lat: number, lon: number): Promise<string | undefined> => {
			try {
				const API_BASE_URL =
					process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
				const response = await fetch(
					`${API_BASE_URL}/mapbox/reverse-geocode?lat=${lat}&lon=${lon}`
				);

				if (!response.ok) {
					return undefined;
				}

				const result = await response.json();
				return result?.address;
			} catch (error) {
				console.error('❌ Error reverse geocoding:', error);
				return undefined;
			}
		},
		[]
	);

	const updateMapWithCoords = useCallback(
		(lat: number, lon: number, address?: string, updateFromDrag = false) => {
			if (!mapInstanceRef.current) return;

			console.log('📍 Updating map with coordinates:', {
				lat,
				lon,
				address,
				updateFromDrag,
			});

			// Update map center and zoom (only if not from drag to avoid jumping)
			if (!updateFromDrag) {
				mapInstanceRef.current.setView([lat, lon], zoom);
			}

			// Remove existing marker
			if (markerRef.current) {
				mapInstanceRef.current.removeLayer(markerRef.current);
				markerRef.current.off('dragend'); // Remove previous event listeners
			}

			// Create red marker icon with cursor pointer if editable
			const redMarker = L.divIcon({
				html: `<div style="
				background-color: #ff5b5b;
				width: 20px;
				height: 20px;
				border-radius: 50%;
				border: 3px solid white;
				box-shadow: 0 2px 4px rgba(0,0,0,0.3);
				position: relative;
				cursor: ${editable ? 'move' : 'default'};
			"></div>`,
				iconSize: [20, 20],
				iconAnchor: [10, 10],
				popupAnchor: [0, -10],
				className: 'custom-red-marker',
			});

			// Add marker at coordinates with drag capability if editable
			const markerOptions: L.MarkerOptions = {
				icon: redMarker,
				draggable: editable,
			};

			markerRef.current = L.marker([lat, lon], markerOptions).addTo(
				mapInstanceRef.current
			);

			// Handle marker drag events if editable
			if (editable && onMarkerMove) {
				markerRef.current.on('dragend', async (e: L.DragEndEvent) => {
					const marker = e.target;
					const position = marker.getLatLng();
					const newLat = position.lat;
					const newLon = position.lng;

					console.log('🎯 Marker moved to:', { lat: newLat, lon: newLon });

					// Reverse geocode to get new address
					const newAddress = await reverseGeocode(newLat, newLon);

					// Call callback with new coordinates and address
					onMarkerMove(newLat, newLon, newAddress);
				});
			}

			// Add popup if enabled and address provided
			if (showPopup && address) {
				markerRef.current
					.bindPopup(`<div class="text-sm"><strong>${address}</strong></div>`)
					.openPopup();
			}
		},
		[zoom, editable, onMarkerMove, reverseGeocode, showPopup]
	);

	const geocodeAddress = useCallback(
		async (address: string) => {
			try {
				console.log('🔍 Geocoding address:', address);

				// Use our backend API for geocoding
				const API_BASE_URL =
					process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
				const response = await fetch(
					`${API_BASE_URL}/geocoding/search?address=${encodeURIComponent(address)}`
				);

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const result = await response.json();

				if (result.success && result.data) {
					const { lat, lon, display_name } = result.data;
					updateMapWithCoords(lat, lon, address);
				} else {
					console.warn('⚠️ No geocoding results found for:', address);
					showDefaultMarker();
				}
			} catch (error) {
				console.error('❌ Error geocoding address:', error);
				// Show marker at default location if geocoding fails
				showDefaultMarker();
			}
		},
		[updateMapWithCoords]
	);

	const showDefaultMarker = useCallback(() => {
		if (!mapInstanceRef.current) return;

		const defaultLatLng: [number, number] = [21.0285, 105.8542]; // Hanoi, Vietnam

		// Remove existing marker
		if (markerRef.current) {
			mapInstanceRef.current.removeLayer(markerRef.current);
		}

		// Create red marker icon
		const redMarker = L.divIcon({
			html: `<div style="
				background-color: #ff5b5b;
				width: 20px;
				height: 20px;
				border-radius: 50%;
				border: 3px solid white;
				box-shadow: 0 2px 4px rgba(0,0,0,0.3);
				position: relative;
			"></div>`,
			iconSize: [20, 20],
			iconAnchor: [10, 10],
			popupAnchor: [0, -10],
			className: 'custom-red-marker',
		});

		// Add default marker
		markerRef.current = L.marker(defaultLatLng, { icon: redMarker }).addTo(
			mapInstanceRef.current
		);
	}, []);

	useEffect(() => {
		if (!mapRef.current) return;

		// Initialize map if not already created
		if (!mapInstanceRef.current) {
			const mapOptions: L.MapOptions = {
				zoomControl: interactive, // Show zoom controls only if interactive
				dragging: interactive, // Allow dragging only if interactive
				touchZoom: interactive, // Allow touch zoom only if interactive
				doubleClickZoom: interactive, // Allow double-click zoom only if interactive
				scrollWheelZoom: interactive, // Allow scroll wheel zoom only if interactive
				boxZoom: interactive, // Allow box zoom only if interactive
				keyboard: interactive, // Allow keyboard navigation only if interactive
				attributionControl: false, // Hide attribution for cleaner look
			};

			const map = L.map(mapRef.current, mapOptions).setView(
				[21.0285, 105.8542],
				zoom
			); // Default to Hanoi, Vietnam

			// Use grayscale tile layer
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '© OpenStreetMap contributors',
				maxZoom: 19,
				className: 'grayscale-map', // Add CSS class for grayscale effect
			}).addTo(map);

			mapInstanceRef.current = map;
		}

		// Only update map if coordinates actually changed
		const coordsChanged =
			lastCoordsRef.current.lat !== lat || lastCoordsRef.current.lon !== lon;

		// Update map with coordinates if provided
		if (lat !== undefined && lon !== undefined && mapInstanceRef.current) {
			if (coordsChanged) {
				lastCoordsRef.current = { lat, lon };
				updateMapWithCoords(lat, lon, address, false);
			}
		} else if (
			address &&
			!lastCoordsRef.current.lat &&
			!lastCoordsRef.current.lon
		) {
			// Fallback to geocoding if no coordinates provided (only once)
			geocodeAddress(address);
		} else if (!lat && !lon && !address) {
			// Show default marker if no address or coordinates
			if (!markerRef.current) {
				showDefaultMarker();
			}
		}

		return () => {
			// Cleanup function
			if (mapInstanceRef.current) {
				mapInstanceRef.current.remove();
				mapInstanceRef.current = null;
			}
		};
	}, [
		lat,
		lon,
		address,
		zoom,
		interactive,
		updateMapWithCoords,
		geocodeAddress,
		showDefaultMarker,
	]);

	return (
		<div
			className={`rounded-lg overflow-hidden border border-gray-200 relative w-full h-full ${className}`}
		>
			{editable && (
				<div className="absolute bottom-1 right-1 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-sm text-xs text-gray-600 border border-gray-200">
					Переместите маркер для уточнения позиции
				</div>
			)}
			<div
				ref={mapRef}
				style={height ? { height, width: '100%' } : undefined}
				className="w-full h-full"
			/>
		</div>
	);
}
