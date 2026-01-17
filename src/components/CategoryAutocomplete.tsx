'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ServiceCategory } from '@/types';

interface CategoryAutocompleteProps {
	value: number | undefined; // category ID
	onChange: (categoryId: number | undefined) => void;
	categories: ServiceCategory[];
	placeholder?: string;
	className?: string;
}

export default function CategoryAutocomplete({
	value,
	onChange,
	categories,
	placeholder = 'Select or type a category...',
	className = '',
}: CategoryAutocompleteProps) {
	const { language } = useLanguage();
	const [inputValue, setInputValue] = useState('');
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [filteredCategories, setFilteredCategories] = useState<
		ServiceCategory[]
	>([]);
	const inputRef = useRef<HTMLInputElement>(null);
	const suggestionsRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Get localized category name
	const getCategoryName = useCallback(
		(category: ServiceCategory): string => {
			switch (language) {
				case 'ru':
					return category.name_ru || category.name_en;
				case 'vi':
					return category.name_vn || category.name_en;
				default:
					return category.name_en;
			}
		},
		[language]
	);

	// Get current category name by ID
	const currentCategory = useMemo(
		() => categories.find((c) => c.id === value),
		[categories, value]
	);

	const currentCategoryName = currentCategory
		? getCategoryName(currentCategory)
		: '';

	// Update input value when category changes externally
	useEffect(() => {
		if (currentCategory) {
			setInputValue(currentCategoryName);
		} else {
			setInputValue('');
		}
	}, [currentCategory, currentCategoryName]);

	// Filter categories based on input
	useEffect(() => {
		if (!inputValue.trim()) {
			setFilteredCategories(categories);
			return;
		}

		const searchTerm = inputValue.toLowerCase().trim();
		const filtered = categories.filter((category) => {
			const nameEn = category.name_en.toLowerCase();
			const nameVn = category.name_vn?.toLowerCase() || '';
			const nameRu = category.name_ru?.toLowerCase() || '';
			return (
				nameEn.includes(searchTerm) ||
				nameVn.includes(searchTerm) ||
				nameRu.includes(searchTerm)
			);
		});
		setFilteredCategories(filtered);
	}, [inputValue, categories]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		setInputValue(newValue);
		setShowSuggestions(true);

		// If input is cleared or doesn't match current category, clear selection
		if (!newValue.trim() || newValue !== currentCategoryName) {
			onChange(undefined);
		}
	};

	const handleSelectCategory = (category: ServiceCategory) => {
		onChange(category.id);
		setInputValue(getCategoryName(category));
		setShowSuggestions(false);
	};

	const handleFocus = () => {
		setShowSuggestions(true);
	};

	const handleBlur = useCallback(() => {
		// Delay hiding suggestions to allow click events
		setTimeout(() => {
			setShowSuggestions(false);
			// If input doesn't match any category, reset to selected category name
			if (currentCategory && inputValue !== currentCategoryName) {
				setInputValue(currentCategoryName);
			} else if (!currentCategory && inputValue) {
				setInputValue('');
				onChange(undefined);
			}
		}, 200);
	}, [currentCategory, currentCategoryName, inputValue, onChange]);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Escape') {
			setShowSuggestions(false);
			inputRef.current?.blur();
		}
	};

	const handleClear = () => {
		setInputValue('');
		onChange(undefined);
		setShowSuggestions(false);
		if (inputRef.current) {
			inputRef.current.focus();
		}
	};

	// Close suggestions when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setShowSuggestions(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	return (
		<div ref={containerRef} className={`relative ${className}`}>
			<input
				ref={inputRef}
				type="text"
				value={inputValue}
				onChange={handleInputChange}
				onFocus={handleFocus}
				onBlur={handleBlur}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				className={`w-full py-2 border border-gray-300 h-[42px] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900 text-sm ${
					inputValue ? 'pl-3 pr-10' : 'px-3'
				}`}
			/>

			{/* Clear button */}
			{inputValue && (
				<button
					onClick={handleClear}
					className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
					type="button"
					aria-label="Clear"
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

			{/* Suggestions dropdown */}
			{showSuggestions && filteredCategories.length > 0 && (
				<div
					ref={suggestionsRef}
					className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-[280px] overflow-y-auto"
					role="listbox"
				>
					{filteredCategories.map((category) => {
						const name = getCategoryName(category);
						const isSelected = category.id === value;
						return (
							<button
								key={category.id}
								type="button"
								onClick={() => handleSelectCategory(category)}
								className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 focus:bg-gray-50 cursor-pointer transition-colors ${
									isSelected
										? 'bg-[#ff5b5b]/10 text-[#ff5b5b] font-medium'
										: 'text-gray-900'
								}`}
								role="option"
								aria-selected={isSelected}
							>
								{name}
							</button>
						);
					})}
				</div>
			)}

			{/* No results message */}
			{showSuggestions &&
				inputValue.trim() &&
				filteredCategories.length === 0 && (
					<div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-500">
						No categories found matching "{inputValue}"
					</div>
				)}
		</div>
	);
}
