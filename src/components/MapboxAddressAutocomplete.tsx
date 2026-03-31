'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type React from 'react';
import { apiClient } from '@/lib/api-client';
import { useTranslation } from '@/contexts/LanguageContext';
import { MapPin as MapPinIcon, X } from 'lucide-react';

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
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [loading, setLoading] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const suggestionsRef = useRef<HTMLDivElement>(null);
	const debounceTimer = useRef<NodeJS.Timeout | null>(null);

	// Fetch address suggestions from Mapbox API
	const fetchSuggestions = useCallback(async (query: string) => {
		if (!query || query.trim().length < 2) {
			setSuggestions([]);
			setShowSuggestions(false);
			return;
		}

		setLoading(true);
		try {
			const response = await apiClient.get<AddressSuggestion[]>(
				`/mapbox/autocomplete?q=${encodeURIComponent(query.trim())}&country=VN&limit=5`
			);
			setSuggestions(response || []);
			setShowSuggestions((response || []).length > 0);
		} catch (error) {
			console.error('Error fetching address suggestions:', error);
			setSuggestions([]);
			setShowSuggestions(false);
		} finally {
			setLoading(false);
		}
	}, []);

	// Handle input change with debounce
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		onChange(newValue);

		// Clear previous timer
		if (debounceTimer.current) {
			clearTimeout(debounceTimer.current);
		}

		// Set new timer for debounced search
		debounceTimer.current = setTimeout(() => {
			fetchSuggestions(newValue);
		}, 300);
	};

	const handleSelect = (suggestion: AddressSuggestion) => {
		onChange(suggestion.address);
		setShowSuggestions(false);
		setSuggestions([]);

		if (onAddressSelect) {
			onAddressSelect(suggestion.address, suggestion.lat, suggestion.lon);
		}
	};

	const handleClear = () => {
		onChange('');
		setSuggestions([]);
		setShowSuggestions(false);
		if (inputRef.current) {
			inputRef.current.focus();
		}
	};

	const handleBlur = useCallback(() => {
		// Delay hiding suggestions to allow click events
		setTimeout(() => {
			setShowSuggestions(false);
		}, 200);
	}, []);

	const handleFocus = () => {
		// Fetch suggestions if there's a value
		if (value && value.trim().length >= 2) {
			fetchSuggestions(value);
		}
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
					} ${value && !loading ? 'pr-10' : ''} w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 bg-white focus:ring-[#F8F5F2] focus:border-transparent`}
					autoComplete="off"
				/>
				{/* Clear button */}
				{value && !loading && (
					<button
						onClick={handleClear}
						className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
						type="button"
						aria-label="Clear address"
					>
						<X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
					</button>
				)}
				{/* Loading spinner */}
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
