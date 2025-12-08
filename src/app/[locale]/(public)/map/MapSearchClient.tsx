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
		lat: 12.2388, // Nha Trang coordinates (fallback if geolocation denied)
		lng: 109.1967,
	});
	const [zoom, setZoom] = useState(13);
	const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
	const [isLoadingLocation, setIsLoadingLocation] = useState(false);
	const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

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
					// Don't log user denial (PERMISSION_DENIED = 1) as an error - it's expected behavior
					// Only log other errors like TIMEOUT or POSITION_UNAVAILABLE
					if (error.code !== 1) {
						console.warn('Geolocation error:', error.message);
					}
					// Fallback to Nha Trang coordinates (already set as default)
					setMapCenter({
						lat: 12.2388, // Nha Trang coordinates
						lng: 109.1967,
					});
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
		<div className="flex h-[calc(100svh-64px)] bg-white">
			{/* Left Sidebar - 30% width */}
			<div className="w-[30%] min-w-[350px] border-r border-gray-200 bg-white">
				<SalonSidebar
					onSalonSelect={handleSalonSelect}
					selectedSalon={selectedSalon}
					mapBounds={mapBounds}
					selectedCategories={selectedCategories}
					onCategoriesChange={setSelectedCategories}
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
					selectedCategories={selectedCategories}
				/>
			</div>
		</div>
	);
}
