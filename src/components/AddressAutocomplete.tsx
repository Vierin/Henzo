'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type React from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cleanAddressFromCountry } from '@/constants/locations';
import { useTranslation } from '@/contexts/LanguageContext';
import { apiClient } from '@/lib/api-client';

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
	onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}

export default function AddressAutocomplete({
	value,
	onChange,
	onAddressSelect,
	placeholder = 'Enter address',
	className = '',
	showIcon = true,
	inline = false,
	onKeyDown,
}: AddressAutocompleteProps) {
	const t = useTranslation();
	const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
	const [allCities, setAllCities] = useState<AddressSuggestion[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [loading, setLoading] = useState(false);
	const [isTyping, setIsTyping] = useState(false);
	const [isGettingLocation, setIsGettingLocation] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const suggestionsRef = useRef<HTMLDivElement>(null);

	// Cache for address search results
	const addressCache = useRef<Map<string, AddressSuggestion[]>>(new Map());

	// Load cities from database on mount (MVP: only cities from table)
	useEffect(() => {
		const loadCities = async () => {
			try {
				const citiesResponse = await apiClient.get<Array<{ id: string; address: string; lat: number; lon: number }>>(
					'/mapbox/cities'
				);
				if (citiesResponse && citiesResponse.length > 0) {
					// Transform to AddressSuggestion format
					const cities: AddressSuggestion[] = citiesResponse.map(city => ({
						display_name: city.address,
						lat: city.lat.toString(),
						lon: city.lon.toString(),
					}));
					setAllCities(cities);
				}
			} catch (error) {
				console.error('Error loading cities:', error);
			}
		};
		loadCities();
	}, []);

	// Предустановленные подсказки
	const defaultSuggestions: AddressSuggestion[] = [
		{
			display_name: t('common.useCurrentLocation'),
			lat: '0',
			lon: '0',
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
		// Clean the query - remove "Vietnam" or "Wietnam" at the end
		const cleanedQuery = query
			.replace(/,\s*(Vietnam|Wietnam|Việt Nam|VN)$/i, '')
			.trim();

		// Try with exact match first (for pasted addresses from Google Maps)
		const exactMatchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanedQuery)}&limit=5&addressdetails=1&countrycodes=vn&accept-language=vi&extratags=1&namedetails=1`;

		const response = await fetch(exactMatchUrl, {
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
			// Extract city/district keywords from original query
			const queryParts = cleanedQuery
				.toLowerCase()
				.split(',')
				.map((p) => p.trim());
			const cityKeywords: string[] = [];
			if (queryParts.length >= 3) {
				cityKeywords.push(queryParts[2]); // City (e.g., "nha trang")
				cityKeywords.push(queryParts[1]); // District (e.g., "lộc thọ")
				if (queryParts.length >= 4) {
					cityKeywords.push(queryParts[3]); // Province (e.g., "khánh hòa")
				}
			}

			// Helper function to clean business names from address
			const removeBusinessName = (address: string): string => {
				// Don't modify if address is too short or looks like it's already cleaned
				if (!address || address.length < 10) {
					return address;
				}

				// Split by comma
				const parts = address
					.split(',')
					.map((p) => p.trim())
					.filter((p) => p);

				// Find the first part that looks like an address (starts with number or street name)
				const addressPartIndex = parts.findIndex((part, index) => {
					// First part with number is likely the address
					if (/^\d+/.test(part)) return true;

					// Check if this part looks like a street name
					if (/\b(street|đường|road|phố|avenue|boulevard)\b/i.test(part)) {
						return true;
					}

					return false;
				});

				// If we found an address part, start from there
				if (addressPartIndex > 0) {
					const cleaned = parts.slice(addressPartIndex).join(', ');
					// Only return if cleaned address is still meaningful (not too short)
					if (cleaned.length >= 10) {
						return cleaned;
					}
				}

				// If first part doesn't look like address and next part starts with number
				if (parts.length > 1) {
					const firstPart = parts[0].toLowerCase();
					const secondPart = parts[1];

					// Common business name patterns
					const businessPatterns = [
						/^(pizza|restaurant|cafe|shop|store|salon|spa|hotel|bar|club|market|mall|center|centre|bank|pharmacy)/i,
					];

					// Check if first part looks like a business name and second starts with number
					const looksLikeBusiness =
						businessPatterns.some((pattern) => pattern.test(firstPart)) ||
						(firstPart.length < 50 &&
							!/^\d+/.test(firstPart) &&
							!/\b(street|đường|road|phố)\b/i.test(firstPart));
					const secondPartHasNumber = /^\d+/.test(secondPart);

					if (looksLikeBusiness && secondPartHasNumber) {
						const cleaned = parts.slice(1).join(', ');
						// Only return if cleaned address is still meaningful
						if (cleaned.length >= 10) {
							return cleaned;
						}
					}
				}

				return address;
			};

			// Filter and clean addresses - remove business names
			const cleanedData = data
				.map((item: any) => {
					let cleanAddr = cleanAddressFromCountry(item.display_name);
					const originalAddr = cleanAddr;
					cleanAddr = removeBusinessName(cleanAddr);

					// If cleaned address is too short or only postal code, use original
					if (
						cleanAddr.length < 10 ||
						/^\d{5,6}(\s*,\s*[^,]+)?$/.test(cleanAddr.trim())
					) {
						cleanAddr = originalAddr;
					}

					return {
						...item,
						cleaned_display_name: cleanAddr,
						original_display_name: item.display_name,
					};
				})
				.filter((item: any) => {
					// Filter out results that are only postal codes
					const addr = item.cleaned_display_name || item.display_name || '';
					return (
						addr.length >= 10 && !/^\d{5,6}(\s*,\s*[^,]+)?$/.test(addr.trim())
					);
				});

			// Sort results by relevance
			const sortedData = cleanedData.sort((a: any, b: any) => {
				const aAddr = (a.cleaned_display_name || '').toLowerCase();
				const bAddr = (b.cleaned_display_name || '').toLowerCase();

				// Check city/district matches
				let aCityMatch = 0;
				let bCityMatch = 0;
				for (const keyword of cityKeywords) {
					if (keyword && aAddr.includes(keyword)) aCityMatch++;
					if (keyword && bAddr.includes(keyword)) bCityMatch++;
				}

				// Prioritize results without business names (start with numbers or street names)
				const aStartsWithNumber = /^\d+/.test(aAddr);
				const bStartsWithNumber = /^\d+/.test(bAddr);
				if (aStartsWithNumber && !bStartsWithNumber) return -1;
				if (!aStartsWithNumber && bStartsWithNumber) return 1;

				// Prioritize city matches first
				if (aCityMatch > bCityMatch) return -1;
				if (aCityMatch < bCityMatch) return 1;

				// Then prioritize house numbers
				const aHasNumber = /\d+/.test(aAddr);
				const bHasNumber = /\d+/.test(bAddr);
				if (aHasNumber && !bHasNumber) return -1;
				if (!aHasNumber && bHasNumber) return 1;

				return 0;
			});

			const suggestions = sortedData
				.filter((item: any) => {
					// Filter out results that are only postal codes or too short/incomplete
					const cleanAddr =
						item.cleaned_display_name || item.display_name || '';
					if (!cleanAddr || cleanAddr.trim().length < 10) {
						return false; // Too short
					}

					const trimmed = cleanAddr.trim();

					// Skip if it's only a postal code
					if (/^\d{5,6}$/.test(trimmed)) {
						return false;
					}

					// Skip if it's only postal code with comma
					if (/^,\s*\d{5,6}$/.test(trimmed)) {
						return false;
					}

					// Skip if it starts with postal code only (like "57100, ...")
					if (/^\d{5,6}(\s*,\s*[^,\d]+)?$/.test(trimmed)) {
						return false;
					}

					// Must have at least one comma (indicating multiple address components)
					if (!trimmed.includes(',')) {
						return false;
					}

					// Must not start with just postal code
					const firstPart = trimmed.split(',')[0].trim();
					if (/^\d{5,6}$/.test(firstPart) && trimmed.split(',').length <= 2) {
						return false;
					}

					return true;
				})
				.map((item: any) => {
					const cleanAddr =
						item.cleaned_display_name || item.display_name || '';
					return {
						lat: parseFloat(item.lat),
						lon: parseFloat(item.lon),
						display_name: cleanAddr,
						address: cleanAddr,
					};
				})
				.slice(0, 5); // Limit to 5 best results
			
			setSuggestions(suggestions);
		} else {
			setSuggestions([]);
		}
	};

	// Filter cities based on input (MVP: only cities from database, no geocoding)
	useEffect(() => {
		const timeoutId = setTimeout(() => {
			if (value && isTyping && allCities.length > 0) {
				// Filter cities by input value
				const lowerValue = value.toLowerCase().trim();
				const filteredCities = allCities.filter(city => 
					city.display_name.toLowerCase().includes(lowerValue)
				);
				setSuggestions([...defaultSuggestions, ...filteredCities]);
				setShowSuggestions(filteredCities.length > 0 || defaultSuggestions.length > 0);
			} else if (!value) {
				// Show all cities when input is empty
				setSuggestions([...defaultSuggestions, ...allCities]);
				setIsTyping(false);
			}
		}, 100);

		return () => clearTimeout(timeoutId);
	}, [value, isTyping, allCities]);

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

	// Handle paste event - try to geocode pasted address immediately
	const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
		// Let the paste happen first
		setTimeout(async () => {
			const pastedValue = e.currentTarget.value;
			// If pasted text looks like a full address (contains commas and numbers), try to geocode it
			if (pastedValue && pastedValue.includes(',') && /\d+/.test(pastedValue)) {
				setLoading(true);
				try {
					// Try to geocode through backend first
					const API_BASE_URL =
						process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
					const response = await fetch(
						`${API_BASE_URL}/geocoding/search?address=${encodeURIComponent(pastedValue)}`
					);

					if (response.ok) {
						const result = await response.json();
						if (result.success && result.data) {
							const cleanAddress = cleanAddressFromCountry(
								result.data.display_name || result.data.address
							);
							onChange(cleanAddress);
							if (onAddressSelect) {
								onAddressSelect(cleanAddress, result.data.lat, result.data.lon);
							}
							setShowSuggestions(false);
							setIsTyping(false);
							setLoading(false);
							return;
						}
					}
				} catch (error) {
					console.error('Error geocoding pasted address:', error);
				} finally {
					setLoading(false);
				}
			}
		}, 100);
	};

	const handleSuggestionClick = (suggestion: AddressSuggestion) => {
		// Специальная обработка для "Use Current Location"
		if (suggestion.display_name === t('common.useCurrentLocation')) {
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
		// При фокусе показываем города из таблицы + "Use current location"
		if (!isTyping) {
			// Filter cities if user has typed something
			let citySuggestions = allCities;
			if (value && value.trim().length > 0) {
				const lowerValue = value.toLowerCase().trim();
				citySuggestions = allCities.filter(city => 
					city.display_name.toLowerCase().includes(lowerValue)
				);
			}
			
			// Combine cities with "Use current location" option
			setSuggestions([...defaultSuggestions, ...citySuggestions]);
			setShowSuggestions(true);
		} else if (suggestions.length > 0) {
			setShowSuggestions(true);
		}
	};

	// Handle blur - try to geocode if address looks complete
	const handleInputBlur = async () => {
		// Wait a bit to allow click on suggestions
		setTimeout(async () => {
			if (
				value &&
				value.includes(',') &&
				/\d+/.test(value) &&
				!showSuggestions
			) {
				// Address looks complete but wasn't selected from suggestions
				// Try to geocode it
				setLoading(true);
				try {
					const API_BASE_URL =
						process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
					const response = await fetch(
						`${API_BASE_URL}/geocoding/search?address=${encodeURIComponent(value)}`
					);

					if (response.ok) {
						const result = await response.json();
						if (result.success && result.data) {
							const cleanAddress = cleanAddressFromCountry(
								result.data.display_name || result.data.address
							);
							onChange(cleanAddress);
							if (onAddressSelect) {
								onAddressSelect(cleanAddress, result.data.lat, result.data.lon);
							}
						}
					}
				} catch (error) {
					console.error('Error geocoding address on blur:', error);
				} finally {
					setLoading(false);
				}
			}
		}, 200);
	};

	const handleCurrentLocation = () => {
		if (navigator.geolocation) {
			setIsGettingLocation(true);
			setShowSuggestions(false);

			navigator.geolocation.getCurrentPosition(
				async (position) => {
					const { latitude, longitude } = position.coords;
					
					try {
						// Get address and country code from backend API
						const response = await apiClient.get<{ 
							lat: number; 
							lon: number; 
							address: string; 
							country_code?: string 
						}>(
							`/mapbox/reverse-geocode?lat=${latitude}&lon=${longitude}`
						);

						if (response && response.country_code) {
							// Check if location is in Vietnam
							if (response.country_code !== 'VN') {
								setIsGettingLocation(false);
								setIsTyping(false);
								// Show error message
								alert(t('common.locationOutsideVietnam') || 'We currently only work with salons in Vietnam. Please select a location in Vietnam.');
								return;
							}
						}

						// Get structured address data from Nominatim for better formatting
						let formattedAddress = '';
						try {
							const nominatimResponse = await fetch(
								`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18&accept-language=vi`,
								{
									headers: {
										'Accept-Language': 'vi-VN,vi,en-US,en',
										'User-Agent': 'Henzo Salon Booking App (hello@henzo.app)',
									},
								}
							);
							const nominatimData = await nominatimResponse.json();
							
							if (nominatimData && nominatimData.address) {
								const address = nominatimData.address;
								const parts = [];
								
								// Add district/suburb/neighbourhood
								if (address.suburb) parts.push(address.suburb);
								else if (address.neighbourhood) parts.push(address.neighbourhood);
								else if (address.quarter) parts.push(address.quarter);
								
								// Add city/town/village
								if (address.city) parts.push(address.city);
								else if (address.town) parts.push(address.town);
								else if (address.village) parts.push(address.village);
								
								// If we have at least one part, use it
								if (parts.length > 0) {
									formattedAddress = parts.join(', ');
								} else {
									// Fallback to clean full address
									formattedAddress = cleanAddressFromCountry(response.address);
								}
							} else {
								formattedAddress = cleanAddressFromCountry(response.address);
							}
						} catch (nominatimError) {
							console.error('Error getting structured address:', nominatimError);
							// Fallback to clean full address
							formattedAddress = cleanAddressFromCountry(response.address);
						}

						onChange(formattedAddress);
						if (onAddressSelect) {
							onAddressSelect(formattedAddress, latitude, longitude);
						}
					} catch (error) {
						console.error('Error getting address from coordinates:', error);
						// Try fallback to Nominatim for address (but still check country)
						try {
							const nominatimResponse = await fetch(
								`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18&accept-language=vi`,
								{
									headers: {
										'Accept-Language': 'vi-VN,vi,en-US,en',
										'User-Agent': 'Henzo Salon Booking App (hello@henzo.app)',
									},
								}
							);
							const data = await nominatimResponse.json();
							
							// Check country code
							if (data.address && data.address.country_code && data.address.country_code !== 'vn') {
								setIsGettingLocation(false);
								setIsTyping(false);
								alert(t('common.locationOutsideVietnam') || 'We currently only work with salons in Vietnam. Please select a location in Vietnam.');
								return;
							}

							// Format address from Nominatim response - only district and city
							const address = data.address;
							let formattedAddress = '';

							if (address) {
								const parts = [];
								
								// Add district/suburb/neighbourhood
								if (address.suburb) parts.push(address.suburb);
								else if (address.neighbourhood) parts.push(address.neighbourhood);
								else if (address.quarter) parts.push(address.quarter);
								
								// Add city/town/village
								if (address.city) parts.push(address.city);
								else if (address.town) parts.push(address.town);
								else if (address.village) parts.push(address.village);

								formattedAddress = parts.join(', ');
								if (!formattedAddress || formattedAddress.trim() === '') {
									formattedAddress = cleanAddressFromCountry(data.display_name);
								}
							} else {
								formattedAddress = cleanAddressFromCountry(data.display_name);
							}

							onChange(formattedAddress);
							if (onAddressSelect) {
								onAddressSelect(formattedAddress, latitude, longitude);
							}
						} catch (fallbackError) {
							console.error('Error with fallback geocoding:', fallbackError);
							// Final fallback - use coordinates but warn user
							const address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
							onChange(address);
							if (onAddressSelect) {
								onAddressSelect(address, latitude, longitude);
							}
						}
					} finally {
						setIsGettingLocation(false);
						setIsTyping(false);
					}
				},
				(error) => {
					console.error('Error getting location:', error);
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
				value={isGettingLocation ? t('common.gettingLocation') : value}
				onChange={handleInputChange}
				onPaste={handlePaste}
				onFocus={handleInputFocus}
				onBlur={handleInputBlur}
				placeholder={isGettingLocation ? t('common.gettingLocation') : placeholder}
				disabled={isGettingLocation}
				className={
					inline
						? `w-full h-full ${showIcon ? 'pl-10' : 'pl-3'} pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent placeholder:text-gray-500 text-gray-900 ${isGettingLocation ? 'bg-gray-50 text-gray-500' : ''} ${className}`
						: `w-full h-full ${showIcon ? 'pl-10' : 'pl-3'} pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] placeholder:text-gray-900 text-gray-900 ${isGettingLocation ? 'bg-gray-50 text-gray-500' : ''} ${className}`
				}
				onKeyDown={onKeyDown}
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
						suggestion.display_name === t('common.useCurrentLocation');

						return (
							<button
								key={index}
								onClick={() => handleSuggestionClick(suggestion)}
								className={`w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-sm flex items-center space-x-2 ${
									isDefaultSuggestion ? 'text-gray-900' : 'text-gray-700'
								}`}
							>
								{isDefaultSuggestion &&
									suggestion.display_name === t('common.useCurrentLocation') && (
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
