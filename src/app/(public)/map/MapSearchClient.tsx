'use client';

import { useState } from 'react';
import SalonSidebar from './components/SalonSidebar';
import InteractiveMap from './components/InteractiveMap';
import { Salon } from '@/types';

export default function MapSearchClient() {
	const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
	const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
		lat: 10.7769, // Ho Chi Minh City coordinates
		lng: 106.7009,
	});
	const [zoom, setZoom] = useState(12);

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

	return (
		<div className="min-h-screen bg-white">
			<div className="flex h-screen">
				{/* Left Sidebar - 30% width */}
				<div className="w-[30%] min-w-[350px] border-r border-gray-200 bg-white">
					<SalonSidebar
						onSalonSelect={handleSalonSelect}
						selectedSalon={selectedSalon}
					/>
				</div>

				{/* Right Map - 70% width */}
				<div className="flex-1 relative">
					<InteractiveMap
						center={mapCenter}
						zoom={zoom}
						onMarkerClick={handleMapMarkerClick}
						selectedSalon={selectedSalon}
					/>
				</div>
			</div>
		</div>
	);
}
