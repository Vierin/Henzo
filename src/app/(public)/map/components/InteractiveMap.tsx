'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Minus, Navigation } from 'lucide-react';
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

const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), {
	ssr: false,
});

interface InteractiveMapProps {
	center: { lat: number; lng: number };
	zoom: number;
	onMarkerClick: (salon: Salon) => void;
	selectedSalon: Salon | null;
}

export default function InteractiveMap({
	center,
	zoom,
	onMarkerClick,
	selectedSalon,
}: InteractiveMapProps) {
	const [currentZoom, setCurrentZoom] = useState(zoom);
	const [mapInstance, setMapInstance] = useState<any>(null);
	const [leafletLoaded, setLeafletLoaded] = useState(false);
	const { data: salons = [] } = useFeaturedSalons(20);

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

	// Mock salon data with coordinates (Ho Chi Minh City area)
	const mockSalons: Salon[] = [
		{
			id: '1',
			name: 'Glamour & Glow Salon',
			address: '123 Beauty Lane, Luxeville',
			latitude: 10.7769, // Center of HCMC
			longitude: 106.7009,
			rating: 4.2,
			reviewCount: 124,
			ownerId: 'mock-owner-1',
			createdAt: new Date().toISOString(),
		},
		{
			id: '2',
			name: 'The Modern Mane',
			address: '456 Style Street, Trendytown',
			latitude: 10.7869, // North of center
			longitude: 106.7109,
			rating: 4.7,
			reviewCount: 88,
			ownerId: 'mock-owner-2',
			createdAt: new Date().toISOString(),
		},
		{
			id: '3',
			name: 'Serenity Spa & Styles',
			address: '789 Relax Row, Calm City',
			latitude: 10.7669, // South of center
			longitude: 106.6909,
			rating: 4.9,
			reviewCount: 210,
			ownerId: 'mock-owner-3',
			createdAt: new Date().toISOString(),
		},
		{
			id: '4',
			name: 'Beauty Haven',
			address: '321 Style Avenue, Fashion District',
			latitude: 10.7829, // East of center
			longitude: 106.7209,
			rating: 4.5,
			reviewCount: 156,
			ownerId: 'mock-owner-4',
			createdAt: new Date().toISOString(),
		},
		{
			id: '5',
			name: 'Chic & Elegant',
			address: '654 Grace Street, Uptown',
			latitude: 10.7709, // West of center
			longitude: 106.6809,
			rating: 4.8,
			reviewCount: 203,
			ownerId: 'mock-owner-5',
			createdAt: new Date().toISOString(),
		},
	];

	const displaySalons =
		(salons as any[]).length > 0 ? (salons as any[]) : mockSalons;

	// Update map center when center prop changes
	useEffect(() => {
		if (mapInstance && center) {
			mapInstance.setView([center.lat, center.lng], zoom);
		}
	}, [center, zoom, mapInstance]);

	const handleZoomIn = () => {
		if (mapInstance) {
			mapInstance.zoomIn();
		}
	};

	const handleZoomOut = () => {
		if (mapInstance) {
			mapInstance.zoomOut();
		}
	};

	const handleGeolocation = () => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					if (mapInstance) {
						mapInstance.setView(
							[position.coords.latitude, position.coords.longitude],
							15
						);
					}
				},
				(error) => {
					console.error('Geolocation error:', error);
				}
			);
		}
	};

	// Custom marker icon
	const createCustomIcon = (salon: Salon) => {
		if (!L) {
			console.log('L is not available');
			return null;
		}

		try {
			const isSelected = selectedSalon?.id === salon.id;
			return L.divIcon({
				className: 'custom-marker',
				html: `
					<div style="
						width: 32px;
						height: 32px;
						background-color: ${isSelected ? '#ea580c' : '#f97316'};
						border: 2px solid white;
						border-radius: 50%;
						display: flex;
						align-items: center;
						justify-content: center;
						box-shadow: 0 2px 8px rgba(0,0,0,0.3);
						font-size: 12px;
						font-weight: bold;
						color: white;
						cursor: pointer;
					">
					</div>
				`,
				iconSize: [32, 32],
				iconAnchor: [16, 16],
			});
		} catch (error) {
			console.error('Error creating custom icon:', error);
			// Fallback to default marker
			return L.icon({
				iconUrl:
					'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
				shadowUrl:
					'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
				iconSize: [25, 41],
				iconAnchor: [12, 41],
				popupAnchor: [1, -34],
				shadowSize: [41, 41],
			});
		}
	};

	return (
		<div className="relative w-full h-full">
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
				{leafletLoaded &&
					L &&
					displaySalons.map((salon: any) => {
						console.log(
							'Rendering marker for salon:',
							salon.name,
							'lat:',
							salon.latitude,
							'lng:',
							salon.longitude
						);

						if (!salon.latitude || !salon.longitude) {
							console.log('Salon missing coordinates:', salon.name);
							return null;
						}

						const customIcon = createCustomIcon(salon);
						if (!customIcon) {
							console.log('Failed to create icon for:', salon.name);
							return null;
						}

						console.log(
							'Creating marker for:',
							salon.name,
							'with icon:',
							!!customIcon
						);

						return (
							<Marker
								key={salon.id}
								position={[salon.latitude, salon.longitude]}
								icon={customIcon}
								eventHandlers={{
									click: () => {
										console.log('Marker clicked:', salon.name);
										onMarkerClick(salon);
									},
								}}
							>
								<Popup>
									<div className="p-2 min-w-[200px]">
										<h3 className="font-bold text-gray-900 mb-1">
											{salon.name}
										</h3>
										<p className="text-sm text-gray-600 mb-2">
											{salon.address}
										</p>
										<div className="flex items-center space-x-2">
											<div className="flex items-center space-x-1">
												<span className="text-orange-500">⭐</span>
												<span className="text-sm font-medium">
													{salon.rating?.toFixed(1) || '0.0'}
												</span>
											</div>
											<span className="text-sm text-gray-500">
												({salon.reviewCount || 0} reviews)
											</span>
										</div>
									</div>
								</Popup>
							</Marker>
						);
					})}
			</MapContainer>

			{/* Map Controls */}
			<div className="absolute bottom-6 right-6 flex flex-col space-y-2 z-10">
				{/* Zoom Controls */}
				<div className="bg-white rounded-lg shadow-md overflow-hidden">
					<button
						onClick={handleZoomIn}
						className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors border-b border-gray-200"
					>
						<Plus className="h-4 w-4 text-gray-700" />
					</button>
					<button
						onClick={handleZoomOut}
						className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
					>
						<Minus className="h-4 w-4 text-gray-700" />
					</button>
				</div>

				{/* Geolocation Button */}
				<button
					onClick={handleGeolocation}
					className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
					title="Find my location"
				>
					<Navigation className="h-4 w-4 text-gray-700" />
				</button>
			</div>

			{/* Map Info Overlay */}
			<div className="absolute top-4 left-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-3 shadow-md z-10">
				<div className="text-sm text-gray-700">
					<div className="font-medium">Ho Chi Minh City</div>
					<div className="text-xs text-gray-500">
						{(displaySalons as any[]).length} salons in this area
					</div>
					<div className="text-xs text-blue-600 mt-1">
						Leaflet: {leafletLoaded ? '✅' : '❌'} | L: {L ? '✅' : '❌'}
					</div>
				</div>
			</div>

			{/* Selected Salon Info */}
			{selectedSalon && (
				<div className="absolute top-4 right-4 bg-white rounded-lg p-4 shadow-md max-w-xs z-10">
					<h3 className="font-bold text-gray-900 mb-2">{selectedSalon.name}</h3>
					<p className="text-sm text-gray-600 mb-2">{selectedSalon.address}</p>
					<div className="flex items-center space-x-2">
						<div className="flex items-center space-x-1">
							<span className="text-orange-500">⭐</span>
							<span className="text-sm font-medium">
								{selectedSalon.rating?.toFixed(1) || '0.0'}
							</span>
						</div>
						<span className="text-sm text-gray-500">
							({selectedSalon.reviewCount || 0} reviews)
						</span>
					</div>
				</div>
			)}
		</div>
	);
}
