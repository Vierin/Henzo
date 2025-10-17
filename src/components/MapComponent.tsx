'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cleanAddressFromCountry } from '@/constants/locations';
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
			console.log('🔍 Geocoding address:', address);

			// Skip geocoding in development mode to avoid errors
			if (process.env.NODE_ENV === 'development') {
				console.log(
					'🔄 Development mode: Skipping geocoding, showing default marker'
				);
				showDefaultMarker();
				return;
			}

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

				// Update map center and zoom
				if (mapInstanceRef.current) {
					mapInstanceRef.current.setView([lat, lon], 15);

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

					// Add marker at geocoded location
					markerRef.current = L.marker([lat, lon], { icon: redMarker }).addTo(
						mapInstanceRef.current
					);

					// Add popup if enabled
					if (showPopup) {
						markerRef.current
							.bindPopup(
								`<div class="text-sm"><strong>${address}</strong></div>`
							)
							.openPopup();
					}
				}
			} else {
				console.warn('⚠️ No geocoding results found for:', address);
				showDefaultMarker();
			}
		} catch (error) {
			console.error('❌ Error geocoding address:', error);
			// Try fallback to Nominatim with Vietnam-only search
			try {
				await fallbackGeocode(address);
			} catch (fallbackError) {
				console.error('❌ Fallback geocoding also failed:', fallbackError);
				// Show marker at default location if both fail
				showDefaultMarker();
			}
		}
	};

	// Fallback function to search Nominatim with Vietnam-only results
	const fallbackGeocode = async (address: string) => {
		console.log('🔄 Trying Nominatim fallback for:', address);

		const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1&countrycodes=vn`;

		const response = await fetch(nominatimUrl, {
			method: 'GET',
			headers: {
				'User-Agent': 'Henzo Salon Booking App (hello@henzo.app)',
				Accept: 'application/json',
			},
			signal: AbortSignal.timeout(10000), // 10 second timeout
		});

		if (!response.ok) {
			throw new Error(`Nominatim API error: ${response.status}`);
		}

		const data = await response.json();

		if (data && data.length > 0) {
			const result = data[0];
			const lat = parseFloat(result.lat);
			const lon = parseFloat(result.lon);

			// Remove country name from the end of the address
			const cleanAddress = cleanAddressFromCountry(result.display_name);

			console.log('✅ Fallback geocoding successful:', {
				lat,
				lon,
				display_name: cleanAddress,
			});

			// Update map center and zoom
			if (mapInstanceRef.current) {
				mapInstanceRef.current.setView([lat, lon], 15);

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

				// Add marker at geocoded location
				markerRef.current = L.marker([lat, lon], { icon: redMarker }).addTo(
					mapInstanceRef.current
				);

				// Add popup if enabled
				if (showPopup) {
					markerRef.current
						.bindPopup(
							`<div class="text-sm"><strong>${cleanAddress}</strong></div>`
						)
						.openPopup();
				}
			}
		} else {
			throw new Error('No results found in Vietnam');
		}
	};

	const showDefaultMarker = () => {
		const defaultLatLng: [number, number] = [21.0285, 105.8542]; // Hanoi, Vietnam

		// Remove existing marker
		if (markerRef.current) {
			mapInstanceRef.current?.removeLayer(markerRef.current);
		}

		// Set map view to show Vietnam
		if (mapInstanceRef.current) {
			mapInstanceRef.current.setView(defaultLatLng, 17); // Zoom in for better view
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

		// Add popup to indicate this is a default location
		if (showPopup) {
			markerRef.current
				.bindPopup(
					`<div class="text-sm"><strong>Vietnam</strong><br/><small class="text-gray-500">Location not found</small></div>`
				)
				.openPopup();
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
