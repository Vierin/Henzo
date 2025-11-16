'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import SalonSidebar from './components/SalonSidebar';
import InteractiveMap from './components/InteractiveMap';
import { Salon } from '@/types';
import {
	MapBounds,
	filterSalonsByBounds,
	sortSalonsByDistance,
} from '@/utils/mapUtils';

export default function MapSearchClient() {
	const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
	const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
		lat: 16.0544, // Da Nang coordinates
		lng: 108.2022,
	});
	const [zoom, setZoom] = useState(13);
	const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
	const [isLoadingLocation, setIsLoadingLocation] = useState(false);

	const handleSalonSelect = (salon: Salon) => {
		setSelectedSalon(salon);
		// Center map on selected salon
		if (salon.latitude && salon.longitude) {
			setMapCenter({
				lat: salon.latitude,
				lng: salon.longitude,
			});
			setZoom(15);
		}
	};

	const handleMapMarkerClick = (salon: Salon) => {
		setSelectedSalon(salon);
	};

	const handleMapBoundsChange = useCallback((bounds: MapBounds) => {
		setMapBounds(bounds);
	}, []);

	// Request user's geolocation on mount
	useEffect(() => {
		if (typeof window !== 'undefined' && navigator.geolocation) {
			setIsLoadingLocation(true);
			navigator.geolocation.getCurrentPosition(
				(position) => {
					setMapCenter({
						lat: position.coords.latitude,
						lng: position.coords.longitude,
					});
					setZoom(14);
					setIsLoadingLocation(false);
				},
				(error) => {
					console.log('Geolocation error:', error.message);
					// Fallback to Da Nang if user denies or error occurs
					setIsLoadingLocation(false);
				},
				{
					enableHighAccuracy: false,
					timeout: 5000,
					maximumAge: 0,
				}
			);
		}
	}, []);

	// Filter salons based on current map bounds
	const visibleSalons = useMemo(() => {
		if (!mapBounds) {
			return []; // No bounds yet, show empty list
		}

		// This will be populated by SalonSidebar with actual salon data
		// For now, we'll pass the bounds to SalonSidebar
		return [];
	}, [mapBounds]);

	return (
		<div className="flex h-[calc(100svh-80px)] bg-white">
			{/* Left Sidebar - 30% width */}
			<div className="w-[30%] min-w-[350px] border-r border-gray-200 bg-white">
				<SalonSidebar
					onSalonSelect={handleSalonSelect}
					selectedSalon={selectedSalon}
					mapBounds={mapBounds}
				/>
			</div>

			{/* Right Map - 70% width */}
			<div className="flex-1 relative">
				<InteractiveMap
					center={mapCenter}
					zoom={zoom}
					onMarkerClick={handleMapMarkerClick}
					selectedSalon={selectedSalon}
					onMapBoundsChange={handleMapBoundsChange}
				/>
			</div>
		</div>
	);
}
