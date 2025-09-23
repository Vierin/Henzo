'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@/styles/map.css';

// Fix for default markers in Leaflet with Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
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
	showPopup?: boolean;
	interactive?: boolean;
}

export default function MapComponent({
	address,
	className = '',
	height = '300px',
	showPopup = true,
	interactive = true,
}: MapComponentProps) {
	const mapRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<L.Map | null>(null);
	const markerRef = useRef<L.Marker | null>(null);

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
				13
			); // Default to Hanoi, Vietnam

			// Use grayscale tile layer
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '© OpenStreetMap contributors',
				maxZoom: 19,
				className: 'grayscale-map', // Add CSS class for grayscale effect
			}).addTo(map);

			mapInstanceRef.current = map;
		}

		// Geocode address and update map
		if (address) {
			geocodeAddress(address);
		} else {
			// If no address provided, show a marker at default location
			const defaultLatLng: [number, number] = [21.0285, 105.8542]; // Hanoi, Vietnam

			// Remove existing marker
			if (markerRef.current) {
				mapInstanceRef.current?.removeLayer(markerRef.current);
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
				mapInstanceRef.current!
			);
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
			showDefaultMarker();
		} catch (error) {
			console.error('Error geocoding address:', error);
			// Show marker at default location if geocoding fails
			showDefaultMarker();
		}
	};

	const showDefaultMarker = () => {
		const defaultLatLng: [number, number] = [21.0285, 105.8542]; // Hanoi, Vietnam

		// Remove existing marker
		if (markerRef.current) {
			mapInstanceRef.current?.removeLayer(markerRef.current);
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
			mapInstanceRef.current!
		);
	};

	return (
		<div
			className={`rounded-lg overflow-hidden border border-gray-200 ${className}`}
		>
			<div ref={mapRef} style={{ height }} className="w-full" />
		</div>
	);
}
