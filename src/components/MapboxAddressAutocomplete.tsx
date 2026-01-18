'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type React from 'react';
import { apiClient } from '@/lib/api-client';
import { useTranslation } from '@/contexts/LanguageContext';
import { MapPin as MapPinIcon } from 'lucide-react';

interface AddressSuggestion {
	id: string;
	address: string;
	lat: number;
	lon: number;
}

interface MapboxAddressAutocompleteProps {
	value: string;
	onChange: (address: string) => void;
	onAddressSelect?: (address: string, lat: number, lon: number) => void;
	placeholder?: string;
	className?: string;
	showIcon?: boolean;
	inline?: boolean;
	onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}

export default function MapboxAddressAutocomplete({
	value,
	onChange,
	onAddressSelect,
	placeholder = 'Enter address',
	className = '',
	showIcon = true,
	inline = false,
	onKeyDown,
}: MapboxAddressAutocompleteProps) {
	const t = useTranslation();
	const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
	const [allCities, setAllCities] = useState<AddressSuggestion[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [loading, setLoading] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const suggestionsRef = useRef<HTMLDivElement>(null);
	const debounceTimer = useRef<NodeJS.Timeout | null>(null);

	// Fetch cities from backend (MVP: only cities from database)
	const fetchCities = useCallback(async () => {
		setLoading(true);
		try {
			const citiesResponse = await apiClient.get<AddressSuggestion[]>(
				'/mapbox/cities'
			);
			if (citiesResponse && citiesResponse.length > 0) {
				setAllCities(citiesResponse);
				return citiesResponse;
			}
			return [];
		} catch (error) {
			console.error('Error fetching cities:', error);
			return [];
		} finally {
			setLoading(false);
		}
	}, []);

	// Load cities on mount
	useEffect(() => {
		fetchCities();
	}, [fetchCities]);

	// Filter cities by query
	const filterCitiesByQuery = useCallback((query: string, cities: AddressSuggestion[]) => {
		if (!query || query.trim().length < 1) {
			return cities;
		}
		const lowerQuery = query.toLowerCase().trim();
		return cities.filter(city => 
			city.address.toLowerCase().includes(lowerQuery)
		);
	}, []);

	// Filter cities by input value
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		onChange(newValue);

		// Clear previous timer
		if (debounceTimer.current) {
			clearTimeout(debounceTimer.current);
		}

		// Filter cities based on input
		debounceTimer.current = setTimeout(() => {
			const filtered = filterCitiesByQuery(newValue, allCities);
			setSuggestions(filtered);
			setShowSuggestions(filtered.length > 0);
		}, 100);
	};

	const handleSelect = (suggestion: AddressSuggestion) => {
		onChange(suggestion.address);
		setShowSuggestions(false);
		setSuggestions([]);

		if (onAddressSelect) {
			onAddressSelect(suggestion.address, suggestion.lat, suggestion.lon);
		}
	};

	const handleBlur = useCallback(() => {
		// Delay hiding suggestions to allow click events
		setTimeout(() => {
			setShowSuggestions(false);
		}, 200);
	}, []);

	const handleFocus = () => {
		// Show filtered cities based on current value
		const filtered = filterCitiesByQuery(value || '', allCities);
		setSuggestions(filtered);
		setShowSuggestions(filtered.length > 0);
	};

	// Close suggestions when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				inputRef.current &&
				!inputRef.current.contains(event.target as Node) &&
				suggestionsRef.current &&
				!suggestionsRef.current.contains(event.target as Node)
			) {
				setShowSuggestions(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Cleanup debounce timer
	useEffect(() => {
		return () => {
			if (debounceTimer.current) {
				clearTimeout(debounceTimer.current);
			}
		};
	}, []);

	return (
		<div className={`relative ${inline ? 'inline-block' : 'w-full'}`}>
			<div className="relative">
				{showIcon && (
					<div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
						<MapPinIcon size={20} />
					</div>
				)}
				<input
					ref={inputRef}
					type="text"
					value={value}
					onChange={handleInputChange}
					onFocus={handleFocus}
					onBlur={handleBlur}
					onKeyDown={onKeyDown}
					placeholder={placeholder}
					className={`${className} ${
						showIcon ? 'pl-10' : ''
					} w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 bg-white focus:ring-[#F8F5F2] focus:border-transparent`}
					autoComplete="off"
				/>
				{loading && (
					<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
						<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
					</div>
				)}
			</div>

			{/* Suggestions dropdown */}
			{showSuggestions && suggestions.length > 0 && (
				<div
					ref={suggestionsRef}
					className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
				>
					{suggestions.map((suggestion) => (
						<button
							key={suggestion.id}
							type="button"
							onClick={() => handleSelect(suggestion)}
							className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors border-b border-gray-100 last:border-b-0"
						>
							<div className="flex items-start gap-2">
								<MapPinIcon
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
	);
}
