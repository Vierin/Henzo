'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl:
		'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
	iconUrl:
		'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
	shadowUrl:
		'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapComponentProps {
	address?: string;
	className?: string;
	height?: string;
}

export default function MapComponent({
	address,
	className = '',
	height = '300px',
}: MapComponentProps) {
	const mapRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<L.Map | null>(null);
	const markerRef = useRef<L.Marker | null>(null);

	useEffect(() => {
		if (!mapRef.current) return;

		// Initialize map if not already created
		if (!mapInstanceRef.current) {
			const map = L.map(mapRef.current).setView([21.0285, 105.8542], 13); // Default to Hanoi, Vietnam

			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '© OpenStreetMap contributors',
				maxZoom: 19,
			}).addTo(map);

			mapInstanceRef.current = map;
		}

		// Geocode address and update map
		if (address) {
			geocodeAddress(address);
		}

		return () => {
			// Cleanup function
			if (mapInstanceRef.current) {
				mapInstanceRef.current.remove();
				mapInstanceRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		if (address && mapInstanceRef.current) {
			geocodeAddress(address);
		}
	}, [address]);

	const geocodeAddress = async (address: string) => {
		try {
			// Add user agent header to avoid CORS issues
			const response = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
					address
				)}&limit=1`,
				{
					headers: {
						'User-Agent': 'Henzo Salon Booking App',
					},
				}
			);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			if (data && data.length > 0) {
				const { lat, lon } = data[0];
				const latLng: [number, number] = [parseFloat(lat), parseFloat(lon)];

				// Update map center
				mapInstanceRef.current?.setView(latLng, 16);

				// Remove existing marker
				if (markerRef.current) {
					mapInstanceRef.current?.removeLayer(markerRef.current);
				}

				// Add new marker
				markerRef.current = L.marker(latLng).addTo(mapInstanceRef.current!);
				markerRef.current.bindPopup(`<b>${address}</b>`).openPopup();
			} else {
				console.warn('No location found for address:', address);
				// Keep the default view if geocoding fails
			}
		} catch (error) {
			console.error('Error geocoding address:', error);
			// Keep the default view if geocoding fails
			// The map will still show with the default location
		}
	};

	return (
		<div
			className={`rounded-lg overflow-hidden border border-gray-200 ${className}`}
		>
			<div ref={mapRef} style={{ height }} className="w-full" />
		</div>
	);
}
