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
	error?: boolean; // для отображения состояния ошибки
}

export default function CategoryAutocomplete({
	value,
	onChange,
	categories,
	placeholder = 'Select or type a category...',
	className = '',
	error = false,
}: CategoryAutocompleteProps) {
	const { language } = useLanguage();
	const [inputValue, setInputValue] = useState('');
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [filteredCategories, setFilteredCategories] = useState<
		ServiceCategory[]
	>([]);
	const [isSelecting, setIsSelecting] = useState(false); // Флаг для отслеживания выбора из списка
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
		const category = categories.find((c) => c.id === value);
		if (category) {
			const name = getCategoryName(category);
			// Всегда обновляем inputValue при изменении value, чтобы отобразить выбранную категорию
			setInputValue(name);
		} else if (value === undefined || value === null) {
			// Если значение очищено извне, очищаем input
			setInputValue('');
		}
	}, [value, categories, getCategoryName]);

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
		const name = getCategoryName(category);
		// Устанавливаем флаг, что происходит выбор из списка
		setIsSelecting(true);
		// Сначала обновляем значение в форме
		onChange(category.id);
		// Затем обновляем inputValue
		setInputValue(name);
		// Скрываем подсказки
		setShowSuggestions(false);
		// Сбрасываем флаг после небольшой задержки
		setTimeout(() => {
			setIsSelecting(false);
		}, 300);
	};

	const handleFocus = () => {
		setShowSuggestions(true);
	};

	const handleBlur = useCallback(() => {
		// Delay hiding suggestions to allow click events
		setTimeout(() => {
			// Если только что выбрали категорию из списка, не обрабатываем blur
			if (isSelecting) {
				return;
			}
			
			setShowSuggestions(false);
			// Если есть выбранная категория, убеждаемся, что input показывает ее название
			if (value && currentCategory) {
				const name = getCategoryName(currentCategory);
				if (inputValue !== name) {
					setInputValue(name);
				}
			} else if (!value && inputValue.trim()) {
				// Если категория не выбрана, но пользователь что-то ввел
				// Пытаемся найти категорию по имени
				const matchingCategory = categories.find((cat) => {
					const name = getCategoryName(cat);
					return name.toLowerCase() === inputValue.toLowerCase().trim();
				});
				if (matchingCategory) {
					// Если нашли, выбираем ее
					onChange(matchingCategory.id);
					setInputValue(getCategoryName(matchingCategory));
				} else if (inputValue !== '') {
					// Если не нашли и поле не пустое, очищаем только input (не трогаем значение)
					// Это позволяет пользователю видеть выбранную категорию
					if (!value) {
						setInputValue('');
					}
				}
			}
		}, 200);
	}, [value, currentCategory, inputValue, categories, getCategoryName, onChange, isSelecting]);

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
				className={`w-full py-2 border h-[42px] rounded-lg focus:outline-none focus:ring-2 text-gray-900 text-sm ${
					error
						? 'border-red-500 focus:border-red-500 focus:ring-red-500'
						: 'border-gray-300 focus:ring-[#ff5b5b] focus:border-transparent'
				} ${inputValue ? 'pl-3 pr-10' : 'px-3'} ${className}`}
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

			{/* Suggestions dropdown - ограничено до 6 элементов */}
			{showSuggestions && filteredCategories.length > 0 && (
				<div
					ref={suggestionsRef}
					className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-y-auto"
					role="listbox"
					style={{ maxHeight: '240px' }}
				>
					{filteredCategories.slice(0, 100).map((category) => {
						const name = getCategoryName(category);
						const isSelected = category.id === value;
						return (
							<button
								key={category.id}
								type="button"
								onMouseDown={(e) => {
									// Prevent input blur before click
									e.preventDefault();
									handleSelectCategory(category);
								}}
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
