'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';

interface ServiceSuggestion {
	id: number;
	name: string;
	type: 'service' | 'category' | 'salon';
	category?: {
		name: string;
	};
	salon?: {
		name: string;
	};
}

interface SuggestionGroup {
	type: 'service' | 'category' | 'salon';
	title: string;
	suggestions: ServiceSuggestion[];
}

interface ServiceAutocompleteProps {
	value: string;
	onChange: (service: string) => void;
	onServiceSelect?: (service: ServiceSuggestion) => void;
	placeholder?: string;
	className?: string;
	inline?: boolean;
}

export default function ServiceAutocomplete({
	value,
	onChange,
	onServiceSelect,
	placeholder = 'Search for treatments',
	className = '',
	inline = false,
}: ServiceAutocompleteProps) {
	const t = useTranslation();
	const [suggestionGroups, setSuggestionGroups] = useState<SuggestionGroup[]>(
		[]
	);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [loading, setLoading] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const suggestionsRef = useRef<HTMLDivElement>(null);

	// Cache for search results
	const searchCache = useRef<Map<string, SuggestionGroup[]>>(new Map());

	// request abort controller
	const abortRef = useRef<AbortController | null>(null);

	// Fetch suggestions from multiple sources with caching
	const fetchSuggestions = useCallback(async (query: string) => {
		// Check cache first
		if (searchCache.current.has(query)) {
			setSuggestionGroups(searchCache.current.get(query) || []);
			return;
		}

		// categories from 2 chars, services from 3
		if (query.length < 2) {
			setSuggestionGroups([]);
			return;
		}

		// cancel previous in-flight
		if (abortRef.current) {
			abortRef.current.abort();
		}
		const controller = new AbortController();
		abortRef.current = controller;

		setLoading(true);
		try {
			const API_BASE_URL =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

			// Build requests with AbortController and minimal set
			const reqs: Promise<any>[] = [];
			// categories (>=2)
			reqs.push(
				fetch(
					`${API_BASE_URL}/search/categories?q=${encodeURIComponent(query)}&lang=en`,
					{ signal: controller.signal }
				)
			);
			// services (>=3)
			if (query.length >= 3) {
				reqs.push(
					fetch(
						`${API_BASE_URL}/search/services?q=${encodeURIComponent(query)}&lang=en`,
						{ signal: controller.signal }
					)
				);
			}
			// optional: lightweight salon suggest (>=3)
			if (query.length >= 3) {
				reqs.push(
					fetch(
						`${API_BASE_URL}/salons/suggest?search=${encodeURIComponent(query)}&limit=5`,
						{ signal: controller.signal }
					)
				);
			}

			// Fetch in parallel
			const settled = await Promise.allSettled(reqs);

			const groups: SuggestionGroup[] = [];

			// Process categories (first response)
			const categoriesResp = settled[0];
			if (categoriesResp.status === 'fulfilled' && categoriesResp.value.ok) {
				const categoriesResult = await categoriesResp.value.json();
				if (categoriesResult.success && categoriesResult.data?.length > 0) {
					groups.push({
						type: 'category',
						title: 'Categories',
						suggestions: categoriesResult.data.map((category: any) => ({
							id: category.id,
							name: category.nameEn,
							type: 'category' as const,
							category: { name: category.nameVn },
						})),
					});
				}
			}

			// Process services (second response when present)
			const servicesResp = query.length >= 3 ? settled[1] : null;
			if (
				servicesResp &&
				servicesResp.status === 'fulfilled' &&
				servicesResp.value.ok
			) {
				const servicesResult = await servicesResp.value.json();
				if (servicesResult.success && servicesResult.data?.length > 0) {
					groups.push({
						type: 'service',
						title: 'Services',
						suggestions: servicesResult.data.map((service: any) => ({
							id: service.id,
							name: service.name,
							type: 'service' as const,
							category: service.serviceCategory
								? { name: service.serviceCategory.nameEn }
								: undefined,
						})),
					});
				}
			}

			// Process salons suggest (third response when present)
			const salonsResp = query.length >= 3 ? settled[2] : null;
			if (
				salonsResp &&
				salonsResp.status === 'fulfilled' &&
				salonsResp.value.ok
			) {
				const salonsResult = await salonsResp.value.json();
				if (salonsResult.success && salonsResult.data?.length > 0) {
					groups.push({
						type: 'salon',
						title: 'Salons',
						suggestions: salonsResult.data.map((salon: any) => ({
							id: salon.id,
							name: salon.name,
							type: 'salon' as const,
							salon: { name: salon.name },
						})),
					});
				}
			}

			setSuggestionGroups(groups);

			// Cache the results
			searchCache.current.set(query, groups);

			// Limit cache size to prevent memory issues
			if (searchCache.current.size > 50) {
				const firstKey = searchCache.current.keys().next().value;
				if (firstKey !== undefined) {
					searchCache.current.delete(firstKey);
				}
			}
		} catch (error) {
			console.error('Error fetching suggestions:', error);
			setSuggestionGroups([]);
		} finally {
			setLoading(false);
		}
	}, []);

	// Fetch initial suggestions on focus (popular items)
	const fetchInitialSuggestions = async () => {
		setLoading(true);
		try {
			const API_BASE_URL =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

			// Fetch popular categories
			const categoriesResponse = await fetch(
				`${API_BASE_URL}/search/categories?q=&lang=en`
			);

			if (categoriesResponse.ok) {
				const categoriesResult = await categoriesResponse.json();
				if (categoriesResult.success && categoriesResult.data?.length > 0) {
					// Take first 3 popular categories
					const popularCategories = categoriesResult.data
						.slice(0, 3)
						.map((category: any) => ({
							id: category.id,
							name: category.nameEn,
							type: 'category' as const,
							category: { name: category.nameVn },
						}));

					setSuggestionGroups([
						{
							type: 'category',
							title: t.homepage.popularCategories,
							suggestions: popularCategories,
						},
					]);
				}
			}
		} catch (error) {
			console.error('Error fetching initial suggestions:', error);
		} finally {
			setLoading(false);
		}
	};

	// Debounce the search with improved performance
	useEffect(() => {
		const timeoutId = setTimeout(() => {
			if (value) {
				fetchSuggestions(value);
			} else {
				setSuggestionGroups([]);
			}
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [value, fetchSuggestions]);

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

	const handleSuggestionClick = (suggestion: ServiceSuggestion) => {
		onChange(suggestion.name);
		setShowSuggestions(false);

		// Call the callback if provided
		if (onServiceSelect) {
			onServiceSelect(suggestion);
		}
	};

	const handleInputFocus = () => {
		if (value.length === 0) {
			// Show initial suggestions when focusing on empty input
			fetchInitialSuggestions();
		}
		setShowSuggestions(true);
	};

	const handleClear = () => {
		onChange('');
		setShowSuggestions(false);
		if (inputRef.current) {
			inputRef.current.focus();
		}
	};

	const inputClasses = inline
		? `w-full h-full px-3 py-2 text-sm pl-10 bg-white placeholder:text-gray-500 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900 ${className}`
		: `w-full h-13 px-4 py-3 pl-12 bg-white placeholder:text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900 ${className}`;

	const iconClasses = inline
		? 'absolute left-3 top-2.5 h-5 w-5 text-gray-400'
		: 'absolute left-4 top-3.5 h-6 w-6 text-gray-400';

	return (
		<div className="relative h-full">
			<input
				ref={inputRef}
				type="text"
				value={value}
				onChange={handleInputChange}
				onFocus={handleInputFocus}
				placeholder={placeholder}
				className={inputClasses}
			/>

			{/* Search Icon */}
			<svg
				className={iconClasses}
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

			{showSuggestions && suggestionGroups.length > 0 && (
				<div
					ref={suggestionsRef}
					className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
				>
					{suggestionGroups.map((group, groupIndex) => (
						<div key={`${group.type}-${groupIndex}`}>
							{/* Group Header */}
							<div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
								<div className="flex items-center gap-2">
									{group.type === 'service' && (
										<svg
											className="w-4 h-4 text-primary"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
											/>
										</svg>
									)}
									{group.type === 'category' && (
										<svg
											className="w-4 h-4 text-primary"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
											/>
										</svg>
									)}
									{group.type === 'salon' && (
										<svg
											className="w-4 h-4 text-primary"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
											/>
										</svg>
									)}
									<span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
										{group.title}
									</span>
								</div>
							</div>

							{/* Group Suggestions */}
							{group.suggestions.map((suggestion, suggestionIndex) => (
								<button
									key={`${suggestion.type}-${suggestion.id}-${suggestionIndex}`}
									onClick={() => handleSuggestionClick(suggestion)}
									className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-sm text-gray-700"
								>
									<div className="font-medium">{suggestion.name}</div>
									{suggestion.category && (
										<div className="text-xs text-gray-500">
											{suggestion.category.name}
										</div>
									)}
								</button>
							))}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
