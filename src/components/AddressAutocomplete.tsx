'use client';

import { useState, useEffect, useRef } from 'react';
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
}

export default function AddressAutocomplete({
	value,
	onChange,
	onAddressSelect,
	placeholder = 'Enter address',
	className = '',
}: AddressAutocompleteProps) {
	const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [loading, setLoading] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const suggestionsRef = useRef<HTMLDivElement>(null);

	// Fetch address suggestions from our backend API with fallback to Nominatim
	const fetchSuggestions = async (query: string) => {
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
	};

	// Fallback function to search Nominatim with Vietnam-only results
	const fetchNominatimSuggestions = async (query: string) => {
		const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=vn`;

		const response = await fetch(nominatimUrl, {
			method: 'GET',
			headers: {
				'User-Agent': 'Henzo Salon Booking App (hello@henzo.app)',
				Accept: 'application/json',
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
			if (value) {
				fetchSuggestions(value);
			} else {
				setSuggestions([]);
			}
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [value]);

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
		setShowSuggestions(true);
	};

	const handleSuggestionClick = (suggestion: AddressSuggestion) => {
		onChange(suggestion.display_name);
		setShowSuggestions(false);

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
		if (suggestions.length > 0) {
			setShowSuggestions(true);
		}
	};

	const handleClear = () => {
		onChange('');
		setShowSuggestions(false);
		if (inputRef.current) {
			inputRef.current.focus();
		}
	};

	return (
		<div className="relative">
			<input
				ref={inputRef}
				type="text"
				value={value}
				onChange={handleInputChange}
				onFocus={handleInputFocus}
				placeholder={placeholder}
				className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900 ${className}`}
			/>

			{/* Clear button */}
			{value && !loading && (
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

			{loading && (
				<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
					<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ff5b5b]"></div>
				</div>
			)}

			{showSuggestions && suggestions.length > 0 && (
				<div
					ref={suggestionsRef}
					className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
				>
					{suggestions.map((suggestion, index) => (
						<button
							key={index}
							onClick={() => handleSuggestionClick(suggestion)}
							className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-sm text-gray-700"
						>
							<div className="font-large">{suggestion.display_name}</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
