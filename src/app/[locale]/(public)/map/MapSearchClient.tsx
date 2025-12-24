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
import { List, X } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

export default function MapSearchClient() {
	const t = useTranslation();
	const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
	const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
		lat: 12.2388, // Nha Trang coordinates (fallback if geolocation denied)
		lng: 109.1967,
	});
	const [zoom, setZoom] = useState(13);
	const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
	const [isLoadingLocation, setIsLoadingLocation] = useState(false);
	const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
	const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
	const [salonCount, setSalonCount] = useState(0);
	const [touchStartY, setTouchStartY] = useState(0);
	const [touchCurrentY, setTouchCurrentY] = useState(0);

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
		// Close bottom sheet on mobile when salon is selected
		setIsBottomSheetOpen(false);
	};

	const handleMapMarkerClick = (salon: Salon) => {
		setSelectedSalon(salon);
		// Open bottom sheet on mobile when marker is clicked
		setIsBottomSheetOpen(true);
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
					// Only handle other errors like TIMEOUT or POSITION_UNAVAILABLE
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

	// Handle swipe down to close bottom sheet
	const handleTouchStart = (e: React.TouchEvent) => {
		// Only start tracking if touch starts on the drag handle or top area
		const target = e.target as HTMLElement;
		if (
			target.closest('.drag-handle') ||
			target.closest('.bottom-sheet-header')
		) {
			setTouchStartY(e.touches[0].clientY);
		}
	};

	const handleTouchMove = (e: React.TouchEvent) => {
		if (touchStartY > 0) {
			setTouchCurrentY(e.touches[0].clientY);
		}
	};

	const handleTouchEnd = () => {
		if (touchStartY > 0) {
			const deltaY = touchCurrentY - touchStartY;
			// If swiped down more than 100px, close the sheet
			if (deltaY > 100) {
				setIsBottomSheetOpen(false);
			}
		}
		setTouchStartY(0);
		setTouchCurrentY(0);
	};

	return (
		<div className="flex h-[calc(100svh-64px)] bg-white relative">
			{/* Desktop Sidebar - 30% width */}
			<div className="hidden md:block w-[30%] min-w-[350px] border-r border-gray-200 bg-white">
				<SalonSidebar
					onSalonSelect={handleSalonSelect}
					selectedSalon={selectedSalon}
					mapBounds={mapBounds}
					selectedCategories={selectedCategories}
					onCategoriesChange={setSelectedCategories}
					onSalonCountChange={setSalonCount}
				/>
			</div>

			{/* Map - Full width on mobile, 70% on desktop */}
			<div className="flex-1 relative w-full md:w-[70%]">
				<InteractiveMap
					center={mapCenter}
					zoom={zoom}
					onMarkerClick={handleMapMarkerClick}
					selectedSalon={selectedSalon}
					onMapBoundsChange={handleMapBoundsChange}
					selectedCategories={selectedCategories}
				/>

				{/* Mobile: Button to open bottom sheet */}
				{!isBottomSheetOpen && (
					<button
						onClick={() => setIsBottomSheetOpen(true)}
						className="md:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#ff5b5b] text-white px-6 py-3 rounded-full shadow-lg hover:bg-[#e04a4a] transition-all duration-300 flex items-center gap-2 z-10"
						aria-label={t('map.showSalons')}
					>
						<List className="w-5 h-5" />
						<span className="font-semibold">{t('map.showSalons')}</span>
						{salonCount > 0 && (
							<span className="bg-white text-[#ff5b5b] rounded-full px-2 py-0.5 text-xs font-bold min-w-[24px] text-center">
								{salonCount}
							</span>
						)}
					</button>
				)}
			</div>

			{/* Mobile: Bottom Sheet */}
			{isBottomSheetOpen && (
				<>
					{/* Overlay */}
					<div
						className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
						onClick={() => setIsBottomSheetOpen(false)}
					/>

					{/* Bottom Sheet */}
					<div
						className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 max-h-[70vh] flex flex-col transition-transform duration-300 ease-out"
						style={{
							transform:
								touchCurrentY > touchStartY && touchStartY > 0
									? `translateY(${Math.min(touchCurrentY - touchStartY, 200)}px)`
									: 'translateY(0)',
						}}
						onTouchStart={handleTouchStart}
						onTouchMove={handleTouchMove}
						onTouchEnd={handleTouchEnd}
					>
						{/* Drag Handle and Header */}
						<div className="drag-handle bottom-sheet-header flex-shrink-0">
							<div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
								<div className="w-12 h-1.5 bg-gray-300 rounded-full" />
							</div>

							{/* Close Button */}
							<button
								onClick={() => setIsBottomSheetOpen(false)}
								className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
								aria-label={t('common.close')}
							>
								<X className="w-5 h-5 text-gray-600" />
							</button>
						</div>

						{/* Sidebar Content */}
						<div className="flex-1 overflow-y-auto">
							<SalonSidebar
								onSalonSelect={handleSalonSelect}
								selectedSalon={selectedSalon}
								mapBounds={mapBounds}
								selectedCategories={selectedCategories}
								onCategoriesChange={setSelectedCategories}
								onSalonCountChange={setSalonCount}
							/>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
