'use client';

import {
	useState,
	useMemo,
	useEffect,
	useCallback,
	lazy,
	Suspense,
} from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Map } from 'lucide-react';
const BookingModal = lazy(() => import('@/components/BookingModal'));
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import SalonCard from '@/components/SalonCard';
import { useSalonSearch } from '@/hooks/useSalonSearch';
import { ServiceResponseDto } from '@/types/dto/service.dto';
import { Salon, Service } from '@/types';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useTranslation, useLanguage } from '@/contexts/LanguageContext';
import {
	useCategories,
	getCategoryById,
	getCategoryBySlug,
} from '@/hooks/useCategories';
import { withLocale, type Locale, isLocale } from '@/i18n/routing';

function categoryFromSearchParams(sp: { get: (name: string) => string | null }) {
	const raw = sp.get('category');
	if (!raw || raw === 'all') return 'all';
	return raw.trim();
}

export default function SalonsClient() {
	const searchParams = useSearchParams();
	const routeParams = useParams();
	const t = useTranslation();
	const { language } = useLanguage();
	const { data: categories = [] } = useCategories();
	const routeLocale = routeParams?.locale;
	const locale: Locale =
		typeof routeLocale === 'string' && isLocale(routeLocale) ? routeLocale : 'en';

	// Initialize state from URL parameters immediately
	const getInitialParams = useCallback(() => {
		const search = searchParams.get('search');
		const location = searchParams.get('location');
		const salon = searchParams.get('salon');
		const service = searchParams.get('service');
		const date = searchParams.get('date');
		const time = searchParams.get('time');

		let searchQuery = '';
		if (service) {
			searchQuery = service;
		} else if (salon) {
			searchQuery = salon;
		} else if (search) {
			searchQuery = search;
		}

		let selectedDate: Date | null = null;
		if (date) {
			const [year, month, day] = date.split('-').map(Number);
			selectedDate = new Date(year, month - 1, day);
		}

		return {
			searchQuery,
			selectedLocation: location || '',
			selectedDate,
			selectedTimeInterval: time || '',
			categoryFilter: categoryFromSearchParams(searchParams),
		};
	}, [searchParams]);

	const initialParams = getInitialParams();

	// State management - initialize with URL params
	const [searchQuery, setSearchQuery] = useState(initialParams.searchQuery);
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(
		initialParams.searchQuery
	);
	const [selectedLocation, setSelectedLocation] = useState(
		initialParams.selectedLocation
	);
	const [selectedDate, setSelectedDate] = useState<Date | null>(
		initialParams.selectedDate
	);
	const [selectedTimeInterval, setSelectedTimeInterval] = useState<string>(
		initialParams.selectedTimeInterval
	);
	const [activeFilter, setActiveFilter] = useState(initialParams.categoryFilter);
	const [sortBy, setSortBy] = useState('name');
	const [currentPage, setCurrentPage] = useState(1);
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<
		(ServiceResponseDto & { salonId: string; salonName: string }) | null
	>(null);
	const [userLocation, setUserLocation] = useState<{
		lat: number;
		lng: number;
	} | null>(null);

	// Debounce search query
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearchQuery(searchQuery);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	useEffect(() => {
		if (typeof window === 'undefined' || !navigator.geolocation) return;
		navigator.geolocation.getCurrentPosition(
			(position) => {
				setUserLocation({
					lat: position.coords.latitude,
					lng: position.coords.longitude,
				});
			},
			() => {
				// denied / unavailable — cards show address without distance
			},
			{
				enableHighAccuracy: false,
				timeout: 5000,
				maximumAge: 600000,
			}
		);
	}, []);

	// Use optimized search instead of loading all salons
	const {
		data: searchData,
		isLoading: loading,
		error,
		refetch,
	} = useSalonSearch({
		page: currentPage,
		limit: 20,
		search: debouncedSearchQuery,
		location: selectedLocation,
		category: activeFilter,
		sortBy: sortBy,
		date: selectedDate
			? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
			: undefined,
		time: selectedTimeInterval || undefined,
		accumulate: currentPage > 1, // Accumulate results for pagination
	});

	// Accumulate salon results for pagination
	const [accumulatedSalons, setAccumulatedSalons] = useState<Salon[]>([]);
	const [currentPagination, setCurrentPagination] = useState<any>(null);

	useEffect(() => {
		const result = searchData as any;
		if (result?.data && result?.pagination) {
			if (result.pagination.page === 1) {
				// Reset accumulated results for new search
				setAccumulatedSalons(result.data);
			} else {
				// Append new results for pagination (dedupe by id)
				setAccumulatedSalons((prev) => {
					const existing = new Set(prev.map((s) => s.id));
					const merged = [...prev];
					for (const s of result.data as Salon[]) {
						if (!existing.has(s.id)) merged.push(s);
					}
					return merged;
				});
			}
			setCurrentPagination(result.pagination);
		}
	}, [searchData]);

	// Reset accumulated results when search parameters change
	useEffect(() => {
		setAccumulatedSalons([]);
		setCurrentPagination(null);
	}, [
		debouncedSearchQuery,
		selectedLocation,
		activeFilter,
		sortBy,
		selectedDate,
		selectedTimeInterval,
	]);

	const salons = accumulatedSalons;
	const pagination = currentPagination;

	// Update state when URL parameters change
	useEffect(() => {
		const newParams = getInitialParams();

		// Update state only if values have changed
		setSearchQuery((prevQuery) => {
			if (newParams.searchQuery !== prevQuery) {
				return newParams.searchQuery;
			}
			return prevQuery;
		});

		setSelectedLocation((prevLocation) => {
			if (newParams.selectedLocation !== prevLocation) {
				return newParams.selectedLocation;
			}
			return prevLocation;
		});

		setSelectedDate((prevDate) => {
			if (newParams.selectedDate?.getTime() !== prevDate?.getTime()) {
				return newParams.selectedDate;
			}
			return prevDate;
		});

		setSelectedTimeInterval((prevTime) => {
			if (newParams.selectedTimeInterval !== prevTime) {
				return newParams.selectedTimeInterval;
			}
			return prevTime;
		});

		setActiveFilter((prev) =>
			newParams.categoryFilter !== prev ? newParams.categoryFilter : prev
		);
	}, [getInitialParams]);

	// Memoized sort options
	const sortOptions = useMemo(
		() => [
			{ value: 'name', label: t.salon.sortNameAZ },
			{ value: 'name-desc', label: t.salon.sortNameZA },
			{ value: 'services', label: t.salon.sortMostServices },
			{ value: 'rating', label: t.salon.sortHighestRated },
		],
		[t]
	);

	// Event handlers
	const handleBookService = useCallback(
		(
			service: ServiceResponseDto | Service,
			salonId: string,
			salonName: string
		) => {
			// Convert Service to ServiceResponseDto format if needed
			const serviceDto: ServiceResponseDto & {
				salonId: string;
				salonName: string;
			} = {
				id: service.id,
				name: service.name,
				description: service.description,
				duration: service.duration,
				price: service.price,
				salonId: salonId,
				salonName: salonName,
			};
			setSelectedService(serviceDto);
			setIsBookingModalOpen(true);
		},
		[]
	);

	const handleCloseBookingModal = useCallback(() => {
		setIsBookingModalOpen(false);
		setSelectedService(null);
	}, []);

	const handleLoadMore = useCallback(() => {
		if (pagination?.hasNextPage) {
			setCurrentPage((prev) => prev + 1);
		}
	}, [pagination?.hasNextPage]);

	// Reset page when search parameters change
	useEffect(() => {
		setCurrentPage(1);
	}, [
		debouncedSearchQuery,
		selectedLocation,
		activeFilter,
		sortBy,
		selectedDate,
		selectedTimeInterval,
	]);

	// Generate results header text
	const resultsHeaderText = useMemo(() => {
		let baseText = '';

		if (debouncedSearchQuery && selectedLocation) {
			baseText = t('salon.searchIn')
				.replace('{query}', debouncedSearchQuery)
				.replace('{location}', selectedLocation);
		} else if (debouncedSearchQuery) {
			baseText = debouncedSearchQuery;
		} else if (selectedLocation) {
			baseText = t('salon.salonsIn').replace('{location}', selectedLocation);
		} else {
			baseText = t('salon.allSalons');
		}

		// Add date and time information
		if (selectedDate) {
			const localeMap: Record<string, string> = {
				en: 'en-US',
				ru: 'ru-RU',
				vi: 'vi-VN',
			};
			const locale = localeMap[language] || 'en-US';

			const dateStr = selectedDate.toLocaleDateString(locale, {
				weekday: 'long',
				month: 'long',
				day: 'numeric',
			});

			if (selectedTimeInterval && selectedTimeInterval !== 'any') {
				const timeLabel =
					t(`booking.timeIntervals.${selectedTimeInterval}`) ||
					selectedTimeInterval;
				baseText += ` ${t('salon.onDate').replace('{date}', dateStr)} (${timeLabel})`;
			} else {
				baseText += ` ${t('salon.onDate').replace('{date}', dateStr)}`;
			}
		}

		return baseText;
	}, [
		debouncedSearchQuery,
		selectedLocation,
		selectedDate,
		selectedTimeInterval,
		t,
	]);

	const resultsCountText = useMemo(() => {
		if (pagination) {
			return `${pagination.total}`;
		}
		return '0';
	}, [pagination]);

	const mapHref = useMemo(() => {
		const q = new URLSearchParams();
		if (activeFilter && activeFilter !== 'all') {
			const id = parseInt(activeFilter, 10);
			const cat =
				!Number.isNaN(id) && id > 0
					? getCategoryById(categories, id)
					: getCategoryBySlug(categories, activeFilter);
			if (cat?.slug) q.set('categories', cat.slug);
		}
		const qs = q.toString();
		return qs ? `${withLocale('/map', locale)}?${qs}` : withLocale('/map', locale);
	}, [activeFilter, categories, locale]);

	return (
		<div className="min-h-screen bg-[#F8F5F2]">
			<main className="py-8 px-6" role="main">
				<div className="mx-auto max-w-6xl">
					{/* Results Header */}
					<header className="flex flex-row items-center justify-between gap-4 mb-8">
						<h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate flex-shrink min-w-0">
							{resultsHeaderText} ({resultsCountText})
						</h1>
						<div className="flex items-center gap-4 flex-shrink-0">
							<Link
								href={mapHref}
								className="px-3 sm:px-4 py-2 sm:h-9 flex gap-1 items-center bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900 text-sm whitespace-nowrap"
							>
								<Map className="w-4 h-4" />
								<span className="hidden sm:inline">{t.salon.mapView}</span>
							</Link>
							{/* Sort Dropdown */}
							<Select value={sortBy} onValueChange={setSortBy}>
								<SelectTrigger className="w-40 sm:w-48 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b]">
									<SelectValue placeholder={t.salon.sortBy} />
								</SelectTrigger>
								<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-lg">
									{sortOptions.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</header>

					{/* Salon Cards */}
					<section aria-label="Search results" role="list">
						<div className="space-y-4 sm:space-y-6">
							{loading ? (
								<div role="status" aria-live="polite">
									<LoadingSpinner message={t('salon.loadingSalons')} />
								</div>
							) : error ? (
								<ErrorDisplay
									error={error}
									message={t('salon.failedToLoadSalons')}
									onRetry={() => refetch()}
								/>
							) : salons.length === 0 ? (
								// No salons found
								<div className="text-center py-12">
									<h3 className="text-xl font-semibold text-gray-900 mb-2">
										{t('salon.noSalonsFound')}
									</h3>
									<p className="text-gray-600">
										{selectedLocation
											? t('common.noSalonsInArea')
											: t('salon.tryAdjustingSearch')}
									</p>
								</div>
							) : (
								// Display salons
								salons.map((salon, index) => (
									<SalonCard
										key={salon.id}
										salon={salon}
										onBookService={handleBookService}
										selectedDate={selectedDate}
										selectedTimeInterval={selectedTimeInterval}
										priority={index < 3} // Критично: Priority для первых 3 изображений
										userLocation={userLocation}
									/>
								))
							)}
						</div>
					</section>

					{/* Load More Button */}
					{pagination?.hasNextPage && (
						<div className="text-center mt-12">
							<button
								onClick={handleLoadMore}
								className="bg-[#ff5b5b] text-white px-8 py-4 rounded-2xl font-medium hover:bg-[#e04a4a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
								aria-label={`Load more salons (page ${pagination.page + 1})`}
							>
								Load more (
								{pagination.total - pagination.page * pagination.limit}{' '}
								remaining)
							</button>
						</div>
					)}
				</div>
			</main>

			{/* Booking Modal */}
			{isBookingModalOpen && (
				<Suspense fallback={null}>
					<BookingModal
						isOpen={isBookingModalOpen}
						onClose={handleCloseBookingModal}
						salonId={selectedService?.salonId || ''}
						salonName={selectedService?.salonName || ''}
						service={
							selectedService
								? (() => {
										const { salonName: _salonName, ...svc } = selectedService;
										return svc as Service;
									})()
								: undefined
						}
						showServiceSelector={true}
					/>
				</Suspense>
			)}
		</div>
	);
}
