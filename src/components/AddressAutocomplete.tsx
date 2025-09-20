'use client';

import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface AddressSuggestion {
	display_name: string;
	lat: string;
	lon: string;
}

interface AddressAutocompleteProps {
	value: string;
	onChange: (address: string) => void;
	placeholder?: string;
	className?: string;
}

export default function AddressAutocomplete({
	value,
	onChange,
	placeholder = 'Enter address',
	className = '',
}: AddressAutocompleteProps) {
	const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [loading, setLoading] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const suggestionsRef = useRef<HTMLDivElement>(null);

	// Fetch address suggestions from Nominatim (OpenStreetMap)
	const fetchSuggestions = async (query: string) => {
		if (query.length < 3) {
			setSuggestions([]);
			return;
		}

		setLoading(true);
		try {
			const response = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
					query
				)}&limit=5&addressdetails=1`
			);
			const data = await response.json();
			setSuggestions(data);
		} catch (error) {
			console.error('Error fetching address suggestions:', error);
			setSuggestions([]);
		} finally {
			setLoading(false);
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
	};

	const handleInputFocus = () => {
		if (suggestions.length > 0) {
			setShowSuggestions(true);
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
							<div className="font-medium">{suggestion.display_name}</div>
							<div className="text-xs text-gray-500">
								Lat: {parseFloat(suggestion.lat).toFixed(4)}, Lon:{' '}
								{parseFloat(suggestion.lon).toFixed(4)}
							</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
