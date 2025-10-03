'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, MapPin, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface ServiceCategory {
	id: number;
	nameEn: string;
	nameVn: string;
}

interface Service {
	id: string;
	name: string;
	description?: string;
	duration: number;
	price: number;
	serviceCategory?: ServiceCategory;
	salon: {
		id: string;
		name: string;
		address?: string;
		phone?: string;
		email?: string;
		logo?: string;
		photos: string[];
	};
	staff: Array<{
		id: string;
		name: string;
		specialties: string[];
	}>;
}

interface ServiceSearchProps {
	onServiceSelect?: (service: Service) => void;
	placeholder?: string;
	className?: string;
}

export default function ServiceSearch({
	onServiceSelect,
	placeholder = 'Search for services...',
	className = '',
}: ServiceSearchProps) {
	const [query, setQuery] = useState('');
	const [suggestions, setSuggestions] = useState<ServiceCategory[]>([]);
	const [services, setServices] = useState<Service[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [showResults, setShowResults] = useState(false);
	const [loading, setLoading] = useState(false);
	const [selectedService, setSelectedService] = useState<Service | null>(null);

	const inputRef = useRef<HTMLInputElement>(null);
	const suggestionsRef = useRef<HTMLDivElement>(null);

	// Debounced search for categories
	useEffect(() => {
		if (query.length < 2) {
			setSuggestions([]);
			return;
		}

		const timeoutId = setTimeout(() => {
			searchCategories(query);
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [query]);

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

	const searchCategories = async (searchQuery: string) => {
		try {
			const API_BASE_URL =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
			const response = await fetch(
				`${API_BASE_URL}/search/categories?q=${encodeURIComponent(searchQuery)}`
			);

			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					setSuggestions(result.data);
				}
			}
		} catch (error) {
			console.error('Error searching categories:', error);
		}
	};

	const searchServices = async (searchQuery: string) => {
		setLoading(true);
		try {
			const API_BASE_URL =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
			const response = await fetch(
				`${API_BASE_URL}/search/services?q=${encodeURIComponent(searchQuery)}`
			);

			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					setServices(result.data);
					setShowResults(true);
				}
			}
		} catch (error) {
			console.error('Error searching services:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setQuery(value);
		setShowSuggestions(value.length >= 2);
		setShowResults(false);
	};

	const handleSuggestionClick = (category: ServiceCategory) => {
		setQuery(category.nameEn);
		setShowSuggestions(false);
		searchServices(category.nameEn);
	};

	const handleSearch = () => {
		if (query.trim()) {
			searchServices(query.trim());
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleSearch();
		}
	};

	const handleServiceClick = (service: Service) => {
		setSelectedService(service);
		if (onServiceSelect) {
			onServiceSelect(service);
		}
	};

	const clearSearch = () => {
		setQuery('');
		setSuggestions([]);
		setServices([]);
		setShowSuggestions(false);
		setShowResults(false);
		setSelectedService(null);
	};

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat('vi-VN', {
			style: 'currency',
			currency: 'VND',
		}).format(price);
	};

	const formatDuration = (minutes: number) => {
		if (minutes < 60) {
			return `${minutes}m`;
		}
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;
		return remainingMinutes > 0
			? `${hours}h ${remainingMinutes}m`
			: `${hours}h`;
	};

	return (
		<div className={`relative ${className}`}>
			{/* Search Input */}
			<div className="relative">
				<input
					ref={inputRef}
					type="text"
					value={query}
					onChange={handleInputChange}
					onKeyPress={handleKeyPress}
					onFocus={() => setShowSuggestions(query.length >= 2)}
					placeholder={placeholder}
					className="w-full px-4 py-3 pl-12 pr-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
				/>

				<Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />

				{query && (
					<button
						onClick={clearSearch}
						className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
						type="button"
					>
						<X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
					</button>
				)}
			</div>

			{/* Category Suggestions */}
			{showSuggestions && suggestions.length > 0 && (
				<div
					ref={suggestionsRef}
					className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
				>
					{suggestions.map((category) => (
						<button
							key={category.id}
							onClick={() => handleSuggestionClick(category)}
							className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-sm flex items-center justify-between"
						>
							<div>
								<div className="font-medium text-gray-900">
									{category.nameEn}
								</div>
								<div className="text-gray-500 text-xs">{category.nameVn}</div>
							</div>
							<Search className="w-4 h-4 text-gray-400" />
						</button>
					))}
				</div>
			)}

			{/* Search Results */}
			{showResults && (
				<div className="mt-4 space-y-4">
					{loading ? (
						<div className="flex items-center justify-center py-8">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5b5b]"></div>
						</div>
					) : services.length > 0 ? (
						<div className="space-y-3">
							<div className="text-sm text-gray-600">
								Found {services.length} service
								{services.length !== 1 ? 's' : ''} for "{query}"
							</div>
							{services.map((service) => (
								<div
									key={service.id}
									onClick={() => handleServiceClick(service)}
									className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
								>
									<div className="flex items-start space-x-4">
										{/* Salon Logo */}
										<div className="flex-shrink-0">
											{service.salon.logo ? (
												<Image
													src={service.salon.logo}
													alt={service.salon.name}
													width={60}
													height={60}
													className="w-15 h-15 object-cover rounded-lg"
													style={{ width: 'auto', height: 'auto' }}
												/>
											) : (
												<div className="w-15 h-15 bg-gray-200 rounded-lg flex items-center justify-center">
													<span className="text-gray-400 text-xs">No Logo</span>
												</div>
											)}
										</div>

										{/* Service Info */}
										<div className="flex-1 min-w-0">
											<div className="flex items-start justify-between">
												<div>
													<h3 className="text-lg font-semibold text-gray-900">
														{service.name}
													</h3>
													{service.serviceCategory && (
														<p className="text-sm text-[#ff5b5b] font-medium">
															{service.serviceCategory.nameEn}
														</p>
													)}
													<p className="text-sm text-gray-600 mt-1">
														{service.salon.name}
													</p>
												</div>
												<div className="text-right">
													<p className="text-lg font-bold text-gray-900">
														{formatPrice(service.price)}
													</p>
													<p className="text-sm text-gray-500">
														{formatDuration(service.duration)}
													</p>
												</div>
											</div>

											{service.description && (
												<p className="text-sm text-gray-600 mt-2 line-clamp-2">
													{service.description}
												</p>
											)}

											<div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
												{service.salon.address && (
													<div className="flex items-center space-x-1">
														<MapPin className="w-4 h-4" />
														<span className="truncate">
															{service.salon.address}
														</span>
													</div>
												)}
												{service.salon.phone && (
													<div className="flex items-center space-x-1">
														<span>{service.salon.phone}</span>
													</div>
												)}
											</div>

											{service.staff.length > 0 && (
												<div className="mt-2">
													<p className="text-xs text-gray-500 mb-1">
														Available staff:
													</p>
													<div className="flex flex-wrap gap-1">
														{service.staff.slice(0, 3).map((staff) => (
															<span
																key={staff.id}
																className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
															>
																{staff.name}
															</span>
														))}
														{service.staff.length > 3 && (
															<span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
																+{service.staff.length - 3} more
															</span>
														)}
													</div>
												</div>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-8">
							<Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
							<p className="text-gray-500">No services found for "{query}"</p>
							<p className="text-sm text-gray-400 mt-1">
								Try searching with different keywords
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
