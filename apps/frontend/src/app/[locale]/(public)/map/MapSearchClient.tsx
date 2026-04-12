'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import SalonSidebar from './components/SalonSidebar';
import InteractiveMap from './components/InteractiveMap';
import { Salon } from '@/types';
import { MapBounds } from '@/utils/mapUtils';
import { List, X } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useMapSalonSearch } from '@/hooks/useMapSalonSearch';
import { useCategories, getCategoryById } from '@/hooks/useCategories';

export default function MapSearchClient() {
	const t = useTranslation();
	const isMd = useMediaQuery('(min-width: 768px)');
	const { data: categories = [] } = useCategories();

	const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
	const [userLocation, setUserLocation] = useState<{
		lat: number;
		lng: number;
	} | null>(null);
	const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
		lat: 16.0544,
		lng: 108.2022,
	});
	const SALON_FOCUS_ZOOM = 17;
	const [zoom, setZoom] = useState(13);
	const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
	const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
	const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
	const [salonCount, setSalonCount] = useState(0);
	const [touchStartY, setTouchStartY] = useState(0);
	const [touchCurrentY, setTouchCurrentY] = useState(0);

	const categoriesCsv = useMemo(() => {
		return selectedCategories
			.map((id) => getCategoryById(categories, id)?.slug)
			.filter((slug): slug is string => Boolean(slug))
			.join(',');
	}, [selectedCategories, categories]);

	const { data: searchData, isLoading: searchLoading } = useMapSalonSearch({
		mapBounds,
		categories: categoriesCsv || undefined,
	});

	const salons = useMemo(
		() => (searchData?.data as Salon[] | undefined) ?? [],
		[searchData]
	);

	const isLoadingSalons = !mapBounds || searchLoading;

	const handleSalonSelect = (salon: Salon) => {
		setSelectedSalon(salon);
		if (salon.latitude && salon.longitude) {
			setMapCenter({
				lat: salon.latitude,
				lng: salon.longitude,
			});
			setZoom(SALON_FOCUS_ZOOM);
		}
		setIsBottomSheetOpen(false);
	};

	const handleMapMarkerClick = (salon: Salon) => {
		setSelectedSalon(salon);
		setIsBottomSheetOpen(true);
	};

	const handleMapBoundsChange = useCallback((bounds: MapBounds) => {
		setMapBounds(bounds);
	}, []);

	useEffect(() => {
		if (typeof window !== 'undefined' && navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					const coords = {
						lat: position.coords.latitude,
						lng: position.coords.longitude,
					};
					setUserLocation(coords);
					setMapCenter({
						lat: coords.lat,
						lng: coords.lng,
					});
					setZoom(14);
				},
				() => {
					setMapCenter({
						lat: 16.0544,
						lng: 108.2022,
					});
				},
				{
					enableHighAccuracy: false,
					timeout: 5000,
					maximumAge: 600000,
				}
			);
		}
	}, []);

	const handleTouchStart = (e: React.TouchEvent) => {
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
			if (deltaY > 100) {
				setIsBottomSheetOpen(false);
			}
		}
		setTouchStartY(0);
		setTouchCurrentY(0);
	};

	const sidebarProps = {
		onSalonSelect: handleSalonSelect,
		selectedSalon,
		mapBounds,
		selectedCategories,
		onCategoriesChange: setSelectedCategories,
		onSalonCountChange: setSalonCount,
		salons,
		isLoadingSalons,
		sortCenter: userLocation ?? undefined,
		userLocation,
		skipBoundsFilter: true as const,
	};

	return (
		<div className="flex h-[calc(100svh-64px)] bg-white relative">
			{isMd && (
				<div className="w-[30%] min-w-[350px] border-r border-gray-200 bg-white">
					<SalonSidebar {...sidebarProps} />
				</div>
			)}

			<div
				className={`flex-1 relative ${isMd ? 'w-[70%]' : 'w-full'}`}
			>
				<InteractiveMap
					center={mapCenter}
					zoom={zoom}
					onMarkerClick={handleMapMarkerClick}
					selectedSalon={selectedSalon}
					onMapBoundsChange={handleMapBoundsChange}
					salons={salons}
					isLoadingSalons={isLoadingSalons}
					userLocation={userLocation}
				/>

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

			{!isMd && isBottomSheetOpen && (
				<>
					<div
						className="fixed inset-0 bg-black/50 z-40 transition-opacity"
						onClick={() => setIsBottomSheetOpen(false)}
					/>

					<div
						className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 max-h-[70vh] flex flex-col transition-transform duration-300 ease-out"
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
						<div className="drag-handle bottom-sheet-header flex-shrink-0">
							<div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
								<div className="w-12 h-1.5 bg-gray-300 rounded-full" />
							</div>

							<button
								onClick={() => setIsBottomSheetOpen(false)}
								className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
								aria-label={t('common.close')}
							>
								<X className="w-5 h-5 text-gray-600" />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto">
							<SalonSidebar {...sidebarProps} />
						</div>
					</div>
				</>
			)}
		</div>
	);
}
