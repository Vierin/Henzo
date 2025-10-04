'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import EditServiceModal from '@/components/EditServiceModal';
import { useServices, useDeleteService } from '@/hooks/useServices';
import { STATIC_CATEGORIES } from '@/constants/categories';
import { useSalonId } from '@/hooks/useSalon';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import { Service } from '@/types';

export default function ServicesClient() {
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<Service | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
	const [isSearching, setIsSearching] = useState(false);
	const [sortBy, setSortBy] = useState<'name' | 'price' | 'duration'>('name');
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
	const [selectedCategory, setSelectedCategory] = useState<string>('');
	const router = useRouter();

	// Используем оптимизированный хук для получения данных салона
	const { salonId, isLoading: salonLoading, error: salonError } = useSalonId();

	const {
		data: services = [],
		isLoading: servicesLoading,
		error,
		refetch,
	} = useServices(salonId || '', {});

	const categories = STATIC_CATEGORIES;
	const deleteServiceMutation = useDeleteService();

	// Дебаунс для поиска - задержка 600мс
	useEffect(() => {
		setIsSearching(true);

		const timer = setTimeout(() => {
			setDebouncedSearchQuery(searchQuery);
			setIsSearching(false);
		}, 600);

		return () => {
			clearTimeout(timer);
			setIsSearching(false);
		};
	}, [searchQuery]);

	// Memoized event handlers
	const handleEditService = useCallback((service: Service) => {
		setSelectedService(service);
		setIsEditModalOpen(true);
	}, []);

	const handleDeleteService = useCallback(
		async (serviceId: string) => {
			if (!confirm('Are you sure you want to delete this service?')) return;
			deleteServiceMutation.mutate(serviceId);
		},
		[deleteServiceMutation]
	);

	const handleSaveService = useCallback(
		(updatedService: Service) => {
			refetch(); // Обновляем данные после изменения
		},
		[refetch]
	);

	const handleSortChange = useCallback(
		(newSortBy: 'name' | 'price' | 'duration') => {
			if (sortBy === newSortBy) {
				setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
			} else {
				setSortBy(newSortBy);
				setSortOrder('asc');
			}
		},
		[sortBy, sortOrder]
	);

	const clearFilters = useCallback(() => {
		setSearchQuery('');
		setSelectedCategory('');
		setSortBy('name');
		setSortOrder('asc');
	}, []);

	// Memoized utility functions
	const formatPrice = useCallback((price: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(price);
	}, []);

	const formatDuration = useCallback((minutes: number) => {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 0) {
			return `${hours}h ${mins}m`;
		}
		return `${mins}m`;
	}, []);

	const getCategoryName = useCallback(
		(categoryId?: number) => {
			if (!categoryId) return null;
			const category = categories.find((cat) => cat.id === categoryId);
			return category?.name || null;
		},
		[categories]
	);

	// Memoized filtered services for performance
	const filteredServices = useMemo(() => {
		return services
			.filter((service) => {
				// Фильтр по поиску (только если больше 2 символов или пустой)
				if (debouncedSearchQuery && debouncedSearchQuery.length > 2) {
					const matchesSearch = service.name
						.toLowerCase()
						.includes(debouncedSearchQuery.toLowerCase());
					if (!matchesSearch) return false;
				}

				// Фильтр по категории
				if (selectedCategory) {
					if (service.serviceCategoryId !== selectedCategory) return false;
				}

				return true;
			})
			.sort((a, b) => {
				let comparison = 0;

				switch (sortBy) {
					case 'name':
						comparison = a.name.localeCompare(b.name);
						break;
					case 'price':
						comparison = a.price - b.price;
						break;
					case 'duration':
						comparison = a.duration - b.duration;
						break;
					default:
						comparison = 0;
				}

				return sortOrder === 'asc' ? comparison : -comparison;
			});
	}, [services, debouncedSearchQuery, selectedCategory, sortBy, sortOrder]);

	if (salonLoading || servicesLoading) {
		return (
			<div
				className="min-h-screen bg-[#fff7f6] flex items-center justify-center"
				role="status"
				aria-label="Loading services"
			>
				<LoadingSpinner />
				<span className="sr-only">Loading salon services...</span>
			</div>
		);
	}

	if (error || salonError) {
		return (
			<div className="min-h-screen bg-[#fff7f6] flex items-center justify-center">
				<ErrorDisplay
					error={
						error instanceof Error ? error : new Error('An error occurred')
					}
					onRetry={refetch}
				/>
			</div>
		);
	}

	return (
		<main role="main" aria-labelledby="services-heading">
			<header className="mb-8">
				<div className="flex items-center justify-between">
					<div>
						<h1
							id="services-heading"
							className="text-3xl font-bold text-black mb-2"
						>
							Services
						</h1>
						<p className="text-gray-800">
							Manage your salon services and pricing
						</p>
					</div>
					<button
						onClick={() => router.push('/services/new')}
						className="inline-flex items-center gap-2 rounded-full bg-[#ff5b5b] text-white px-4 py-2 text-sm shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
						aria-label="Add new service"
					>
						<span className="text-lg leading-none" aria-hidden="true">
							＋
						</span>
						Add New Service
					</button>
				</div>
			</header>

			{/* Filters and sorting */}
			<section aria-labelledby="filters-heading" className="mb-6">
				<div className="bg-white rounded-xl border border-[#f1d9d7] p-6">
					<h2 id="filters-heading" className="sr-only">
						Filters and Search
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						{/* Search */}
						<div>
							<label
								htmlFor="search-services"
								className="block text-sm font-medium text-black mb-2"
							>
								Search Services
							</label>
							<div className="relative">
								<input
									id="search-services"
									type="text"
									placeholder="Search by name..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-black placeholder-gray-500"
									aria-describedby="search-help"
								/>
								{/* Search indicator */}
								{isSearching && (
									<div
										className="absolute right-3 top-1/2 transform -translate-y-1/2"
										aria-hidden="true"
									>
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ff5b5b]"></div>
									</div>
								)}
								<div id="search-help" className="sr-only">
									Search for services by name. Results will appear as you type.
								</div>
							</div>
						</div>

						{/* Category filter */}
						<div>
							<label
								htmlFor="category-filter"
								className="block text-sm font-medium text-black mb-2"
							>
								Category
							</label>
							<select
								id="category-filter"
								value={selectedCategory}
								onChange={(e) => setSelectedCategory(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-black"
								aria-label="Filter services by category"
							>
								<option value="">All Categories</option>
								{categories.map((category) => (
									<option key={category.id} value={category.id}>
										{category.name}
									</option>
								))}
							</select>
						</div>

						{/* Sort */}
						<div>
							<label
								htmlFor="sort-services"
								className="block text-sm font-medium text-black mb-2"
							>
								Sort By
							</label>
							<select
								id="sort-services"
								value={`${sortBy}-${sortOrder}`}
								onChange={(e) => {
									const [newSortBy, newSortOrder] = e.target.value.split(
										'-'
									) as [typeof sortBy, typeof sortOrder];
									setSortBy(newSortBy);
									setSortOrder(newSortOrder);
								}}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-black"
								aria-label="Sort services"
							>
								<option value="name-asc">Name (A-Z)</option>
								<option value="name-desc">Name (Z-A)</option>
								<option value="price-asc">Price (Low to High)</option>
								<option value="price-desc">Price (High to Low)</option>
								<option value="duration-asc">Duration (Short to Long)</option>
								<option value="duration-desc">Duration (Long to Short)</option>
							</select>
						</div>

						{/* Clear filters button */}
						<div className="flex items-end">
							<button
								onClick={clearFilters}
								className="w-full px-4 py-2 text-sm font-medium text-black bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent transition-colors"
								aria-label="Clear all filters and sorting"
							>
								Clear Filters
							</button>
						</div>
					</div>

					{/* Results information */}
					{(debouncedSearchQuery || selectedCategory) && (
						<div className="mt-4 pt-4 border-t border-gray-200">
							<p className="text-sm text-black">
								Showing {filteredServices.length} of {services.length} services
								{debouncedSearchQuery &&
									debouncedSearchQuery.length > 2 &&
									` matching "${debouncedSearchQuery}"`}
								{selectedCategory &&
									` in "${getCategoryName(selectedCategory) || 'Unknown'}" category`}
							</p>
						</div>
					)}
				</div>
			</section>

			{/* Services list */}
			<section aria-labelledby="services-list-heading">
				{filteredServices.length === 0 &&
				(debouncedSearchQuery || selectedCategory) ? (
					<div
						className="bg-white rounded-xl border border-[#f1d9d7] p-12 text-center"
						role="status"
						aria-label="No services found"
					>
						<div
							className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"
							aria-hidden="true"
						>
							<svg
								className="w-8 h-8 text-gray-400"
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
						</div>
						<h3 className="text-lg font-medium text-gray-900 mb-2">
							No services found
						</h3>
						<p className="text-gray-500 mb-4">
							Try adjusting your search or filter criteria
						</p>
						<button
							onClick={clearFilters}
							className="inline-flex items-center gap-2 rounded-full bg-[#ff5b5b] text-white px-4 py-2 text-sm shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
							aria-label="Clear filters to show all services"
						>
							Clear Filters
						</button>
					</div>
				) : services.length === 0 ? (
					<div
						className="bg-white rounded-xl border border-[#f1d9d7] p-12 text-center"
						role="status"
						aria-label="No services yet"
					>
						<div
							className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"
							aria-hidden="true"
						>
							<svg
								className="w-8 h-8 text-gray-400"
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
						</div>
						<h3 className="text-lg font-semibold text-gray-900 mb-2">
							No services yet
						</h3>
						<p className="text-gray-600 mb-6">
							Start by adding your first service to your salon
						</p>
						<button
							onClick={() => router.push('/services/new')}
							className="inline-flex items-center gap-2 bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
							aria-label="Add your first service"
						>
							<span className="text-lg" aria-hidden="true">
								＋
							</span>
							Add Your First Service
						</button>
					</div>
				) : (
					<div className="space-y-4">
						{/* Loading indicator for local updates */}
						{(isSearching ||
							(searchQuery && searchQuery !== debouncedSearchQuery)) && (
							<div
								className="flex items-center justify-center py-2"
								role="status"
								aria-label="Filtering services"
							>
								<div className="flex items-center gap-2 text-sm text-gray-600">
									<div
										className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ff5b5b]"
										aria-hidden="true"
									></div>
									<span>Filtering services...</span>
								</div>
							</div>
						)}

						<div className="bg-white rounded-xl border border-[#f1d9d7] overflow-hidden">
							<div className="grid grid-cols-5 px-6 py-3 text-[13px] text-gray-700 bg-[#fff2f1] font-semibold">
								<div
									className="flex items-center gap-1 cursor-pointer hover:text-[#ff5b5b] transition-colors select-none"
									onClick={() => handleSortChange('name')}
									role="button"
									tabIndex={0}
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											handleSortChange('name');
										}
									}}
									aria-label="Sort by service name"
								>
									Service Name
									{sortBy === 'name' && (
										<span className="text-[#ff5b5b]" aria-hidden="true">
											{sortOrder === 'asc' ? '↑' : '↓'}
										</span>
									)}
								</div>
								<div>Category</div>
								<div
									className="flex items-center gap-1 cursor-pointer hover:text-[#ff5b5b] transition-colors select-none"
									onClick={() => handleSortChange('duration')}
									role="button"
									tabIndex={0}
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											handleSortChange('duration');
										}
									}}
									aria-label="Sort by duration"
								>
									Duration
									{sortBy === 'duration' && (
										<span className="text-[#ff5b5b]" aria-hidden="true">
											{sortOrder === 'asc' ? '↑' : '↓'}
										</span>
									)}
								</div>
								<div
									className="flex items-center gap-1 cursor-pointer hover:text-[#ff5b5b] transition-colors select-none"
									onClick={() => handleSortChange('price')}
									role="button"
									tabIndex={0}
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											handleSortChange('price');
										}
									}}
									aria-label="Sort by price"
								>
									Price
									{sortBy === 'price' && (
										<span className="text-[#ff5b5b]" aria-hidden="true">
											{sortOrder === 'asc' ? '↑' : '↓'}
										</span>
									)}
								</div>
								<div>Actions</div>
							</div>
							<div className="divide-y divide-[#f1d9d7]">
								{filteredServices.map((service) => (
									<div
										key={service.id}
										className="grid grid-cols-5 px-6 py-4 text-[15px] text-gray-800"
										role="listitem"
									>
										<div className="font-semibold">{service.name}</div>
										<div className="text-gray-600">
											{getCategoryName(service.serviceCategoryId) ? (
												<span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
													{getCategoryName(service.serviceCategoryId)}
												</span>
											) : (
												<span className="text-gray-400 italic">
													No category
												</span>
											)}
										</div>
										<div>{formatDuration(service.duration)}</div>
										<div className="font-semibold text-[#ff5b5b]">
											{formatPrice(service.price)}
										</div>
										<div className="flex gap-2">
											<button
												onClick={() => handleEditService(service)}
												className="p-1 text-[#ff5b5b] hover:text-[#e04a4a] hover:bg-red-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
												title="Edit service"
												aria-label={`Edit ${service.name} service`}
											>
												<svg
													className="w-4 h-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													aria-hidden="true"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
													/>
												</svg>
											</button>
											<button
												onClick={() => handleDeleteService(service.id)}
												className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
												title="Delete service"
												aria-label={`Delete ${service.name} service`}
											>
												<svg
													className="w-4 h-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													aria-hidden="true"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
													/>
												</svg>
											</button>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				)}
			</section>

			{/* Edit Service Modal */}
			<EditServiceModal
				isOpen={isEditModalOpen}
				onClose={() => {
					setIsEditModalOpen(false);
					setSelectedService(null);
				}}
				service={selectedService}
				onSave={handleSaveService}
			/>
		</main>
	);
}
