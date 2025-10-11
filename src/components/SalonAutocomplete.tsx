'use client';

import { useState, useEffect, useRef } from 'react';

interface SalonSuggestion {
	id: string;
	name: string;
	address?: string;
}

interface SalonAutocompleteProps {
	value: string;
	onChange: (salon: string) => void;
	onSalonSelect?: (salon: SalonSuggestion) => void;
	placeholder?: string;
	className?: string;
}

export default function SalonAutocomplete({
	value,
	onChange,
	onSalonSelect,
	placeholder = 'Search for salon name',
	className = '',
}: SalonAutocompleteProps) {
	const [suggestions, setSuggestions] = useState<SalonSuggestion[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [loading, setLoading] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const suggestionsRef = useRef<HTMLDivElement>(null);

	// Fetch salon suggestions from our backend API
	const fetchSuggestions = async (query: string) => {
		if (query.length < 3) {
			setSuggestions([]);
			return;
		}

		setLoading(true);
		try {
			const API_BASE_URL =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

			const response = await fetch(
				`${API_BASE_URL}/salons/search?search=${encodeURIComponent(query)}&limit=10`
			);

			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data && result.data.length > 0) {
					// Transform salons data to match our interface
					const transformedSuggestions = result.data.map((salon: any) => ({
						id: salon.id,
						name: salon.name,
						address: salon.address,
					}));
					setSuggestions(transformedSuggestions);
				} else {
					setSuggestions([]);
				}
			} else {
				setSuggestions([]);
			}
		} catch (error) {
			console.error('Error fetching salon suggestions:', error);
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

	const handleSuggestionClick = (suggestion: SalonSuggestion) => {
		onChange(suggestion.name);
		setShowSuggestions(false);

		// Call the callback if provided
		if (onSalonSelect) {
			onSalonSelect(suggestion);
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
		<div className="relative h-full">
			<input
				ref={inputRef}
				type="text"
				value={value}
				onChange={handleInputChange}
				onFocus={handleInputFocus}
				placeholder={placeholder}
				className={`w-full h-13 px-4 py-3 pl-12 bg-white placeholder:text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900 ${className}`}
			/>

			{/* Search Icon */}
			<svg
				className="absolute left-4 top-3.5 h-6 w-6 text-gray-400"
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
					className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
				>
					{suggestions.map((suggestion) => (
						<button
							key={suggestion.id}
							onClick={() => handleSuggestionClick(suggestion)}
							className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-sm text-gray-700"
						>
							<div className="font-medium">{suggestion.name}</div>
							{suggestion.address && (
								<div className="text-xs text-gray-500">
									{suggestion.address}
								</div>
							)}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
