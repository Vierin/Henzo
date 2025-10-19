'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cleanAddressFromCountry } from '@/constants/locations';

interface AddressSuggestion {
	display_name: string;
	lat: string;
	lon: string;
}

interface AddressAutocompleteProps {
	value: string;
	onChange: (address: string) => void;
	onAddressSelect?: (address: string, lat: number, lon: number) => void;
	placeholder?: string;
	className?: string;
	showIcon?: boolean;
	inline?: boolean;
}

export default function AddressAutocomplete({
	value,
	onChange,
	onAddressSelect,
	placeholder = 'Enter address',
	className = '',
	showIcon = true,
	inline = false,
}: AddressAutocompleteProps) {
	const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [loading, setLoading] = useState(false);
	const [isTyping, setIsTyping] = useState(false);
	const [isGettingLocation, setIsGettingLocation] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const suggestionsRef = useRef<HTMLDivElement>(null);

	// Cache for address search results
	const addressCache = useRef<Map<string, AddressSuggestion[]>>(new Map());

	// Предустановленные подсказки для Вьетнама
	const defaultSuggestions: AddressSuggestion[] = [
		{
			display_name: 'Use Current Location',
			lat: '0',
			lon: '0',
		},
		{
			display_name: 'Đà Nẵng',
			lat: '16.0544',
			lon: '108.2022',
		},
	];

	// Fetch address suggestions from our backend API with fallback to Nominatim
	const fetchSuggestions = useCallback(async (query: string) => {
		// Check cache first
		if (addressCache.current.has(query)) {
			setSuggestions(addressCache.current.get(query) || []);
			return;
		}

		if (query.length < 3) {
			setSuggestions([]);
			return;
		}

		setLoading(true);
		try {
			// Try our backend API first
			const API_BASE_URL =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
			const response = await fetch(
				`${API_BASE_URL}/geocoding/search?address=${encodeURIComponent(query)}`
			);

			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data) {
					// Clean the address from country name
					const cleanAddress = cleanAddressFromCountry(
						result.data.display_name || result.data.address
					);

					const cleanedData = {
						...result.data,
						display_name: cleanAddress,
						address: cleanAddress,
					};

					// Wrap single result in array for consistency
					setSuggestions([cleanedData]);
					return;
				}
			}

			// Fallback to Nominatim with Vietnam-only search
			await fetchNominatimSuggestions(query);
		} catch (error) {
			console.error('Error fetching address suggestions:', error);
			// Try Nominatim fallback
			try {
				await fetchNominatimSuggestions(query);
			} catch (fallbackError) {
				console.error('Nominatim fallback also failed:', fallbackError);
				setSuggestions([]);
			}
		} finally {
			setLoading(false);
		}
	}, []);

	// Fallback function to search Nominatim with Vietnam-only results
	const fetchNominatimSuggestions = async (query: string) => {
		const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=vn&accept-language=vi`;

		const response = await fetch(nominatimUrl, {
			method: 'GET',
			headers: {
				'User-Agent': 'Henzo Salon Booking App (hello@henzo.app)',
				Accept: 'application/json',
				'Accept-Language': 'vi-VN,vi,en-US,en',
			},
		});

		if (!response.ok) {
			throw new Error(`Nominatim API error: ${response.status}`);
		}

		const data = await response.json();

		if (data && data.length > 0) {
			const suggestions = data.map((item: any) => {
				const cleanAddress = cleanAddressFromCountry(item.display_name);
				return {
					lat: parseFloat(item.lat),
					lon: parseFloat(item.lon),
					display_name: cleanAddress,
					address: cleanAddress,
				};
			});
			setSuggestions(suggestions);
		} else {
			setSuggestions([]);
		}
	};

	// Debounce the search
	useEffect(() => {
		const timeoutId = setTimeout(() => {
			if (value && isTyping) {
				fetchSuggestions(value);
			} else if (!value) {
				setSuggestions([]);
				setIsTyping(false);
			}
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [value, isTyping]);

	// Close suggestions when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				suggestionsRef.current &&
				!suggestionsRef.current.contains(event.target as Node) &&
				inputRef.current &&
				!inputRef.current.contains(event.target as Node)
			) {
				setShowSuggestions(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		onChange(newValue);

		// Если пользователь начал печатать, переключаемся на режим поиска
		if (newValue.length > 0) {
			setIsTyping(true);
			setShowSuggestions(true);
		} else {
			setIsTyping(false);
			setShowSuggestions(false);
		}
	};

	const handleSuggestionClick = (suggestion: AddressSuggestion) => {
		// Специальная обработка для "Use Current Location"
		if (suggestion.display_name === 'Use Current Location') {
			handleCurrentLocation();
			return;
		}

		onChange(suggestion.display_name);
		setShowSuggestions(false);
		setIsTyping(false);

		// Call the callback with coordinates if provided
		if (onAddressSelect) {
			onAddressSelect(
				suggestion.display_name,
				parseFloat(suggestion.lat),
				parseFloat(suggestion.lon)
			);
		}
	};

	const handleInputFocus = () => {
		// При фокусе показываем предустановленные подсказки, если пользователь не печатает
		if (!isTyping) {
			setSuggestions(defaultSuggestions);
			setShowSuggestions(true);
		} else if (suggestions.length > 0) {
			setShowSuggestions(true);
		}
	};

	const handleCurrentLocation = () => {
		if (navigator.geolocation) {
			setIsGettingLocation(true);
			setShowSuggestions(false);

			navigator.geolocation.getCurrentPosition(
				(position) => {
					const { latitude, longitude } = position.coords;
					// Получаем детальный адрес по координатам
					fetch(
						`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18&accept-language=vi`,
						{
							headers: {
								'Accept-Language': 'vi-VN,vi,en-US,en',
								'User-Agent': 'Henzo Salon Booking App (hello@henzo.app)',
							},
						}
					)
						.then((response) => response.json())
						.then((data) => {
							// Формируем адрес из доступных компонентов
							const address = data.address;
							let formattedAddress = '';

							// Собираем адрес из компонентов (улица, город, район)
							if (address) {
								const parts = [];

								// Добавляем улицу/дорогу
								if (address.road) parts.push(address.road);
								if (address.house_number) parts.push(address.house_number);

								// Добавляем район/квартал
								if (address.suburb) parts.push(address.suburb);
								else if (address.neighbourhood)
									parts.push(address.neighbourhood);

								// Добавляем город
								if (address.city) parts.push(address.city);
								else if (address.town) parts.push(address.town);
								else if (address.village) parts.push(address.village);

								// Добавляем район/провинцию
								if (address.state) parts.push(address.state);

								formattedAddress = parts.join(', ');

								// Если не удалось собрать адрес из компонентов, используем display_name
								if (!formattedAddress || formattedAddress.trim() === '') {
									formattedAddress = cleanAddressFromCountry(data.display_name);
								}
							} else {
								// Fallback - используем display_name
								formattedAddress = cleanAddressFromCountry(data.display_name);
							}

							onChange(formattedAddress);
							if (onAddressSelect) {
								onAddressSelect(formattedAddress, latitude, longitude);
							}
						})
						.catch((error) => {
							console.error('Error getting address from coordinates:', error);
							// Fallback - используем координаты
							const address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
							onChange(address);
							if (onAddressSelect) {
								onAddressSelect(address, latitude, longitude);
							}
						})
						.finally(() => {
							setIsGettingLocation(false);
							setIsTyping(false);
						});
				},
				(error) => {
					console.error('Error getting location:', error);
					// Fallback - используем Дананг
					const address = 'Đà Nẵng';
					onChange(address);
					if (onAddressSelect) {
						onAddressSelect(address, 16.0544, 108.2022);
					}
					setIsGettingLocation(false);
					setIsTyping(false);
				}
			);
		}
	};

	const handleClear = () => {
		onChange('');
		setShowSuggestions(false);
		setIsTyping(false);
		if (inputRef.current) {
			inputRef.current.focus();
		}
	};

	return (
		<div className="relative h-full overflow-visible">
			<input
				ref={inputRef}
				type="text"
				value={isGettingLocation ? 'Getting your location...' : value}
				onChange={handleInputChange}
				onFocus={handleInputFocus}
				placeholder={
					isGettingLocation ? 'Getting your location...' : placeholder
				}
				disabled={isGettingLocation}
				className={
					inline
						? `w-full h-full ${showIcon ? 'pl-10' : 'pl-3'} pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent placeholder:text-gray-500 text-gray-900 ${isGettingLocation ? 'bg-gray-50 text-gray-500' : ''} ${className}`
						: `w-full h-full ${showIcon ? 'pl-10' : 'pl-3'} pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] placeholder:text-gray-900 text-gray-900 ${isGettingLocation ? 'bg-gray-50 text-gray-500' : ''} ${className}`
				}
			/>

			{/* Clear button */}
			{value && !loading && !isGettingLocation && (
				<button
					onClick={handleClear}
					className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
					type="button"
				>
					<svg
						className="w-4 h-4 text-gray-400 hover:text-gray-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			)}

			{/* Loading indicators */}
			{loading && (
				<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
					<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ff5b5b]"></div>
				</div>
			)}

			{isGettingLocation && (
				<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
					<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
				</div>
			)}

			{showSuggestions && suggestions.length > 0 && (
				<div
					ref={suggestionsRef}
					className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
				>
					{suggestions.map((suggestion, index) => {
						const isDefaultSuggestion =
							suggestion.display_name === 'Use Current Location' ||
							suggestion.display_name === 'Đà Nẵng';

						return (
							<button
								key={index}
								onClick={() => handleSuggestionClick(suggestion)}
								className={`w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-sm flex items-center space-x-2 ${
									isDefaultSuggestion ? 'text-gray-900' : 'text-gray-700'
								}`}
							>
								{isDefaultSuggestion &&
									suggestion.display_name === 'Use Current Location' && (
										<svg
											className="w-4 h-4 text-gray-700"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
											/>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
											/>
										</svg>
									)}
								{!isDefaultSuggestion && (
									<svg
										className="w-4 h-4 text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
										/>
									</svg>
								)}
								<span className={isDefaultSuggestion ? 'font-medium' : ''}>
									{suggestion.display_name}
								</span>
							</button>
						);
					})}
				</div>
			)}

			{showIcon && (
				<svg
					className={
						inline
							? 'absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400'
							: 'absolute left-3 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400'
					}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
					/>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
					/>
				</svg>
			)}
		</div>
	);
}
