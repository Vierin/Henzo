'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { X, MapPin, Search, LocateFixed } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useTranslation } from '@/contexts/LanguageContext';
import toast from 'react-hot-toast';

// Lazy load map component
const MapComponentWithCoords = dynamic(
	() => import('@/components/MapComponentWithCoords'),
	{ ssr: false }
);

interface AddressSuggestion {
	id: string;
	address: string;
	lat: number;
	lon: number;
}

interface AddressSelectModalProps {
	isOpen: boolean;
	onClose: () => void;
	value: string;
	initialLat?: number;
	initialLon?: number;
	onSelect: (address: string, lat: number, lon: number) => void;
}

export default function AddressSelectModal({
	isOpen,
	onClose,
	value,
	initialLat,
	initialLon,
	onSelect,
}: AddressSelectModalProps) {
	const t = useTranslation();
	const [inputValue, setInputValue] = useState(value);
	const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [loading, setLoading] = useState(false);
	const [selectedLat, setSelectedLat] = useState<number | undefined>(
		initialLat
	);
	const [selectedLon, setSelectedLon] = useState<number | undefined>(
		initialLon
	);
	const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);
	const [mapLoading, setMapLoading] = useState(true);
	const [isLocating, setIsLocating] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const debounceTimer = useRef<NodeJS.Timeout | null>(null);

	// Reset state when modal opens/closes
	useEffect(() => {
		if (isOpen) {
			setInputValue(value);
			setSelectedLat(initialLat);
			setSelectedLon(initialLon);
			setSuggestions([]);
			setShowSuggestions(false);
			if (initialLat && initialLon) {
				setMapLoading(true);
				setTimeout(() => setMapLoading(false), 1000);
			} else {
				setMapLoading(false);
			}
			// Focus input after modal opens
			setTimeout(() => {
				inputRef.current?.focus();
			}, 100);
		}
	}, [isOpen, value, initialLat, initialLon]);

	// Handle map load - reset loading when coordinates change
	useEffect(() => {
		if (selectedLat && selectedLon) {
			setMapLoading(true);
			// Give map time to render and show marker
			const timer = setTimeout(() => {
				setMapLoading(false);
			}, 1000);
			return () => clearTimeout(timer);
		} else {
			setMapLoading(false);
		}
	}, [selectedLat, selectedLon]);

	// Fetch address suggestions
	const fetchSuggestions = useCallback(async (query: string) => {
		if (!query || query.trim().length < 2) {
			setSuggestions([]);
			setShowSuggestions(false);
			return;
		}

		setLoading(true);
		try {
			const response = await apiClient.get<AddressSuggestion[]>(
				`/mapbox/autocomplete?q=${encodeURIComponent(query)}&country=VN&limit=5`
			);
			setSuggestions(response || []);
			setShowSuggestions(true);
		} catch (error) {
			console.error('Error fetching address suggestions:', error);
			setSuggestions([]);
			setShowSuggestions(false);
		} finally {
			setLoading(false);
		}
	}, []);

	// Debounced search
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		setInputValue(newValue);
		setShowSuggestions(false);

		// Clear previous timer
		if (debounceTimer.current) {
			clearTimeout(debounceTimer.current);
		}

		// Set new timer for debounced search
		debounceTimer.current = setTimeout(() => {
			fetchSuggestions(newValue);
		}, 300);
	};

	// Handle suggestion select
	const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
		setInputValue(suggestion.address);
		setSelectedLat(suggestion.lat);
		setSelectedLon(suggestion.lon);
		setShowSuggestions(false);
		setSuggestions([]);
		setMapLoading(true); // Show loader while map updates
	};

	// Handle marker move on map
	const handleMarkerMove = useCallback(
		async (lat: number, lon: number, address?: string): Promise<void> => {
			setSelectedLat(lat);
			setSelectedLon(lon);

			if (address) {
				setInputValue(address);
				setIsUpdatingAddress(false);
				return;
			}

			setIsUpdatingAddress(true);
			try {
				const response = await apiClient.get<{ address: string }>(
					`/mapbox/reverse-geocode?lat=${lat}&lon=${lon}`
				);
				if (response?.address) {
					setInputValue(response.address);
				}
			} catch (error) {
				console.error('Failed to reverse geocode:', error);
			} finally {
				setIsUpdatingAddress(false);
			}
		},
		[]
	);

	const handleGetCurrentLocation = useCallback(() => {
		if (!navigator.geolocation) {
			toast.error(t('owner.salonInfo.geolocationNotSupported'));
			return;
		}

		setIsLocating(true);
		navigator.geolocation.getCurrentPosition(
			async (position) => {
				try {
					await handleMarkerMove(
						position.coords.latitude,
						position.coords.longitude,
						undefined
					);
					setShowSuggestions(false);
					setSuggestions([]);
				} finally {
					setIsLocating(false);
				}
			},
			(err: GeolocationPositionError) => {
				setIsLocating(false);
				if (err.code === 1) {
					toast.error(t('owner.salonInfo.geolocationDenied'));
				} else if (err.code === 2) {
					toast.error(t('owner.salonInfo.geolocationUnavailable'));
				} else if (err.code === 3) {
					toast.error(t('owner.salonInfo.geolocationTimeout'));
				} else {
					toast.error(t('owner.salonInfo.geolocationError'));
				}
			},
			{ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
		);
	}, [handleMarkerMove, t]);

	// Handle confirm
	const handleConfirm = () => {
		if (selectedLat && selectedLon && inputValue.trim()) {
			onSelect(inputValue.trim(), selectedLat, selectedLon);
			onClose();
		}
	};

	// Cleanup timer
	useEffect(() => {
		return () => {
			if (debounceTimer.current) {
				clearTimeout(debounceTimer.current);
			}
		};
	}, []);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto">
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/30 transition-opacity"
				onClick={onClose}
			/>

			{/* Modal */}
			<div className="fixed inset-0 flex items-center justify-center p-4">
				<div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
					{/* Header */}
					<div className="flex items-center justify-between p-4 border-b">
						<h2 className="text-xl font-semibold text-gray-900">
							{t('owner.salonInfo.selectAddress') || 'Выберите адрес'}
						</h2>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 transition-colors"
						>
							<X className="w-6 h-6" />
						</button>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-y-auto p-4 space-y-4">
						{/* Search row: input + current location */}
						<div className="relative z-[9999]">
							<div className="flex gap-2 items-stretch">
								<div className="relative flex-1 min-w-0">
									<div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
										<Search className="w-5 h-5" />
									</div>
									<input
										ref={inputRef}
										type="text"
										value={inputValue}
										onChange={handleInputChange}
										onFocus={() => {
											if (suggestions.length > 0) {
												setShowSuggestions(true);
											}
										}}
										placeholder={
											t('owner.salonInfo.enterAddress') || 'Введите адрес...'
										}
										className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
										autoComplete="off"
									/>
									{loading && (
										<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
											<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#ff5b5b]"></div>
										</div>
									)}
									{isUpdatingAddress && !loading && (
										<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
											<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
										</div>
									)}

									{/* Suggestions — same width as input column */}
									{showSuggestions && suggestions.length > 0 && (
										<div className="absolute z-[9999] left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
											{suggestions.map((suggestion) => (
												<button
													key={suggestion.id}
													type="button"
													onClick={() => handleSelectSuggestion(suggestion)}
													className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors border-b border-gray-100 last:border-b-0"
												>
													<div className="flex items-start gap-2">
														<MapPin
															size={16}
															className="text-gray-400 mt-0.5 flex-shrink-0"
														/>
														<span className="text-sm text-gray-900">
															{suggestion.address}
														</span>
													</div>
												</button>
											))}
										</div>
									)}
								</div>
								<button
									type="button"
									onClick={handleGetCurrentLocation}
									disabled={isLocating || loading}
									className="shrink-0 flex items-center justify-center w-11 h-[46px] self-center border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-[#ff5b5b] hover:text-[#ff5b5b] focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									aria-label={t('owner.salonInfo.getCurrentLocation')}
									title={t('owner.salonInfo.getCurrentLocation')}
								>
									{isLocating ? (
										<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#ff5b5b]" />
									) : (
										<LocateFixed className="w-5 h-5" aria-hidden />
									)}
								</button>
							</div>
						</div>

						{/* Map Preview */}
						<div className="w-full aspect-[4/3] rounded-lg overflow-hidden border border-gray-200 bg-gray-50 relative z-0">
							{/* Loading overlay - higher z-index to appear above map */}
							{mapLoading && selectedLat && selectedLon && (
								<div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-20">
									<div className="text-center">
										<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5b5b] mx-auto mb-2"></div>
										<p className="text-sm text-gray-500">
											{t('common.loading') || 'Загрузка карты...'}
										</p>
									</div>
								</div>
							)}
							{selectedLat && selectedLon ? (
								<div
									className={`w-full h-full ${mapLoading ? 'opacity-50' : 'opacity-100'}`}
								>
									<MapComponentWithCoords
										key={`map-${selectedLat}-${selectedLon}`}
										lat={selectedLat}
										lon={selectedLon}
										address={inputValue}
										height="100%"
										zoom={16}
										interactive={true}
										showPopup={false}
										editable={true}
										onMarkerMove={handleMarkerMove}
										className="w-full h-full"
									/>
								</div>
							) : (
								<div className="w-full h-full flex items-center justify-center">
									<div className="text-center">
										<MapPin className="w-12 h-12 text-gray-300 mx-auto mb-2" />
										<p className="text-sm text-gray-400">
											{t('owner.salonInfo.selectAddressToSeeMap') ||
												'Выберите адрес для просмотра на карте'}
										</p>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Footer */}
					<div className="flex items-center justify-end gap-3 p-4 border-t">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
						>
							{t('common.cancel') || 'Отмена'}
						</button>
						<button
							type="button"
							onClick={handleConfirm}
							disabled={!selectedLat || !selectedLon || !inputValue.trim()}
							className="px-4 py-2 bg-[#ff5b5b] text-white rounded-lg hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{t('common.select') || 'Выбрать'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
