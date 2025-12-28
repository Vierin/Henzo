'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import EditServiceModal from '@/components/EditServiceModal';
import { useServices, useDeleteService } from '@/hooks/useServices';
import {
	useCategories,
	getCategoryTranslatedName,
} from '@/hooks/useCategories';
import { useOwnerLayout } from '@/contexts/OwnerLayoutContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import { Service, ServiceGroup } from '@/types';
import { formatVND } from '@/utils/currency';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useTranslation } from '@/contexts/LanguageContext';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

export default function ServicesClient() {
	const t = useTranslation();
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<Service | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
	const [isSearching, setIsSearching] = useState(false);
	const [sortBy, setSortBy] = useState<'name' | 'price' | 'duration'>('name');
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
	const [selectedCategory, setSelectedCategory] = useState<number | 'all'>(
		'all'
	);
	const [selectedGroup, setSelectedGroup] = useState<string | 'all'>('all');
	const router = useRouter();

	// Используем данные салона из контекста (избегаем дублирования запросов)
	const { salonId, isLoading: salonLoading } = useOwnerLayout();

	const {
		data: services = [],
		isLoading: servicesLoading,
		error,
		refetch,
	} = useServices(salonId || '', {
		// Убираем серверную фильтрацию - делаем всё на клиенте
	});

	const { data: categories = [] } = useCategories();
	const deleteServiceMutation = useDeleteService();

	// Load service groups for this salon
	const { data: groups = [] } = useQuery<ServiceGroup[]>({
		queryKey: ['service-groups', salonId],
		queryFn: async () => {
			if (!salonId) return [];
			const params = new URLSearchParams();
			params.append('salonId', salonId);
			return apiClient.get<ServiceGroup[]>(
				`/services/groups/by-salon?${params.toString()}`
			);
		},
		enabled: !!salonId,
		staleTime: 5 * 60 * 1000,
	});

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

	const handleEditService = (service: Service) => {
		setSelectedService(service);
		setIsEditModalOpen(true);
	};

	const handleDeleteService = async (serviceId: string) => {
		if (!confirm(t('owner.services.areYouSureDelete'))) return;
		deleteServiceMutation.mutate(serviceId);
	};

	const handleSaveService = (updatedService: Service) => {
		refetch(); // Обновляем данные после изменения
	};

	const formatDuration = (minutes: number) => {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 0) {
			return `${hours}h ${mins}m`;
		}
		return `${mins}m`;
	};

	const getCategoryName = (categoryId?: number) => {
		if (!categoryId) return null;
		const category = categories.find((cat) => cat.id === categoryId);
		return category?.name || null;
	};

	// Фильтрация и сортировка сервисов
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
				if (selectedCategory !== 'all') {
					if (service.serviceCategoryId !== selectedCategory) return false;
				}

				// Фильтр по группе
				if (selectedGroup !== 'all') {
					if (service.serviceGroupId !== selectedGroup) return false;
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
	}, [
		services,
		debouncedSearchQuery,
		selectedCategory,
		selectedGroup,
		sortBy,
		sortOrder,
	]);

	// Функции для управления фильтрами
	const handleSortChange = (newSortBy: 'name' | 'price' | 'duration') => {
		if (sortBy === newSortBy) {
			setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
		} else {
			setSortBy(newSortBy);
			setSortOrder('asc');
		}
	};

	const clearFilters = () => {
		setSearchQuery('');
		setSelectedCategory('all');
		setSelectedGroup('all');
		setSortBy('name');
		setSortOrder('asc');
	};

	if (salonLoading || servicesLoading) {
		return (
			<div className="min-h-screen bg-[#fff7f6] flex items-center justify-center">
				<LoadingSpinner message={t('owner.services.loading')} />
			</div>
		);
	}

	if (error) {
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
		<div className="px-0 md:px-4 max-w-7xl mx-auto">
			<div className="mb-8">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl md:text-3xl font-bold text-black md:mb-2">
							{t('owner.services.title')}
						</h1>
						<p className="text-sm md:text-base text-gray-800">
							{t('owner.services.subtitle')}
						</p>
					</div>
					<button
						onClick={() => router.push('/services/new')}
						className="inline-flex items-center gap-2 rounded-full bg-[#ff5b5b] text-white px-4 py-2 text-sm shadow-sm hover:opacity-95 whitespace-nowrap"
					>
						<span className="text-lg leading-none">＋</span>
						<span>{t('owner.services.addNew')}</span>
						<span className="hidden md:inline">
							{t('owner.services.title')}
						</span>
					</button>
				</div>
			</div>

			{/* Фильтры и сортировка */}
			<div className="mb-6 bg-white rounded-xl border border-[#f1d9d7] p-3 md:p-6">
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
					{/* Поиск */}
					<div>
						<label className="block text-sm font-medium text-black mb-2">
							<span className="hidden sm:inline">
								{t('owner.services.searchServices')}
							</span>
							<span className="sm:hidden">{t('owner.services.search')}</span>
						</label>
						<div className="relative">
							<input
								type="text"
								placeholder={t('owner.services.searchByName')}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-black placeholder-gray-500"
							/>
							{/* Индикатор поиска */}
							{isSearching && (
								<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ff5b5b]"></div>
								</div>
							)}
						</div>
					</div>

					{/* Фильтр по категории */}
					<div>
						<label className="block text-sm font-medium text-black mb-2">
							{t('owner.services.category')}
						</label>
						<Select
							value={
								selectedCategory === 'all' ? 'all' : selectedCategory.toString()
							}
							onValueChange={(value) =>
								setSelectedCategory(value === 'all' ? 'all' : Number(value))
							}
						>
							<SelectTrigger className="w-full border border-gray-300 focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-black">
								<SelectValue placeholder={t('owner.services.allCategories')} />
							</SelectTrigger>
							<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
								<SelectItem
									value="all"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									{t('owner.services.allCategories')}
								</SelectItem>
								{categories.map((category) => (
									<SelectItem
										key={category.id}
										value={category.id.toString()}
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{getCategoryTranslatedName(category, t)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Фильтр по группе */}
					<div>
						<label className="block text-sm font-medium text-black mb-2">
							{t('owner.services.group')}
						</label>
						<Select
							value={selectedGroup}
							onValueChange={(value) => setSelectedGroup(value)}
						>
							<SelectTrigger className="w-full border border-gray-300 focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-black">
								<SelectValue placeholder={t('owner.services.allGroups')} />
							</SelectTrigger>
							<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
								<SelectItem
									value="all"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									{t('owner.services.allGroups')}
								</SelectItem>
								{groups.map((group) => (
									<SelectItem
										key={group.id}
										value={group.id}
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{group.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Сортировка */}
					<div>
						<label className="block text-sm font-medium text-black mb-2">
							{t('owner.services.sortBy')}
						</label>
						<Select
							value={`${sortBy}-${sortOrder}`}
							onValueChange={(value) => {
								const [newSortBy, newSortOrder] = value.split('-') as [
									typeof sortBy,
									typeof sortOrder,
								];
								setSortBy(newSortBy);
								setSortOrder(newSortOrder);
							}}
						>
							<SelectTrigger className="w-full border border-gray-300 focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-black">
								<SelectValue />
							</SelectTrigger>
							<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
								<SelectItem
									value="name-asc"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									{t('owner.services.nameAZ')}
								</SelectItem>
								<SelectItem
									value="name-desc"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									{t('owner.services.nameZA')}
								</SelectItem>
								<SelectItem
									value="price-asc"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									{t('owner.services.priceLowToHigh')}
								</SelectItem>
								<SelectItem
									value="price-desc"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									{t('owner.services.priceHighToLow')}
								</SelectItem>
								<SelectItem
									value="duration-asc"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									{t('owner.services.durationShortToLong')}
								</SelectItem>
								<SelectItem
									value="duration-desc"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									{t('owner.services.durationLongToShort')}
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Кнопка сброса фильтров */}
					<div className="flex items-end">
						<button
							onClick={clearFilters}
							className="w-full px-4 py-2 text-sm font-medium text-black bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent transition-colors"
						>
							{t('owner.services.clearFilters')}
						</button>
					</div>
				</div>

				{/* Информация о результатах */}
				{(debouncedSearchQuery ||
					selectedCategory !== 'all' ||
					selectedGroup !== 'all') && (
					<div className="mt-4 pt-4 border-t border-gray-200">
						<p className="text-sm text-black">
							{t('owner.services.showing')} {filteredServices.length}{' '}
							{t('owner.services.of')} {services.length}{' '}
							{t('owner.services.matching')}
							{debouncedSearchQuery &&
								debouncedSearchQuery.length > 2 &&
								` "${debouncedSearchQuery}"`}
							{selectedCategory !== 'all' &&
								` ${t('owner.services.inCategory')} "${getCategoryName(Number(selectedCategory)) || t('owner.services.unknown')}" ${t('owner.services.categoryLabel')}`}
							{selectedGroup !== 'all' &&
								` ${t('owner.services.inGroup')} "${groups.find((g) => g.id === selectedGroup)?.name || t('owner.services.unknown')}" ${t('owner.services.groupLabel')}`}
						</p>
					</div>
				)}
			</div>

			{filteredServices.length === 0 &&
			(debouncedSearchQuery ||
				selectedCategory !== 'all' ||
				selectedGroup !== 'all') ? (
				<div className="bg-white rounded-xl border border-[#f1d9d7] p-12 text-center">
					<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
						{t('owner.services.noServicesFound')}
					</h3>
					<p className="text-gray-500 mb-4">
						{t('owner.services.tryAdjustingFilters')}
					</p>
					<button
						onClick={clearFilters}
						className="inline-flex items-center gap-2 rounded-full bg-[#ff5b5b] text-white px-4 py-2 text-sm shadow-sm hover:opacity-95"
					>
						{t('owner.services.clearFilters')}
					</button>
				</div>
			) : services.length === 0 ? (
				<div className="bg-white rounded-xl border border-[#f1d9d7] p-12 text-center">
					<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
						{t('owner.services.noServicesYet')}
					</h3>
					<p className="text-gray-600 mb-6">
						{t('owner.services.addFirstService')}
					</p>
					<button
						onClick={() => router.push('/services/new')}
						className="inline-flex items-center gap-2 bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
					>
						<span className="text-lg">＋</span>
						{t('owner.services.addFirstService')}
					</button>
				</div>
			) : (
				<div className="space-y-4">
					{/* Индикатор локального обновления */}
					{(isSearching ||
						(searchQuery && searchQuery !== debouncedSearchQuery)) && (
						<div className="flex items-center justify-center py-2">
							<div className="flex items-center gap-2 text-sm text-gray-600">
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ff5b5b]"></div>
								<span>{t('owner.services.filteringServices')}</span>
							</div>
						</div>
					)}

					<div className="bg-white rounded-xl border border-[#f1d9d7] overflow-hidden">
						{/* Desktop Table View */}
						<div className="hidden md:block">
							<div className="grid grid-cols-6 px-6 py-3 text-sm text-gray-700 bg-[#fff2f1] font-semibold">
								<div
									className="flex items-center gap-1 cursor-pointer hover:text-[#ff5b5b] transition-colors select-none"
									onClick={() => handleSortChange('name')}
								>
									{t('owner.services.serviceName')}
									{sortBy === 'name' && (
										<span className="text-[#ff5b5b]">
											{sortOrder === 'asc' ? '↑' : '↓'}
										</span>
									)}
								</div>
								<div>{t('owner.services.category')}</div>
								<div>{t('owner.services.group')}</div>
								<div
									className="flex items-center gap-1 cursor-pointer hover:text-[#ff5b5b] transition-colors select-none"
									onClick={() => handleSortChange('duration')}
								>
									{t('owner.services.duration')}
									{sortBy === 'duration' && (
										<span className="text-[#ff5b5b]">
											{sortOrder === 'asc' ? '↑' : '↓'}
										</span>
									)}
								</div>
								<div
									className="flex items-center gap-1 cursor-pointer hover:text-[#ff5b5b] transition-colors select-none"
									onClick={() => handleSortChange('price')}
								>
									{t('owner.services.price')}
									{sortBy === 'price' && (
										<span className="text-[#ff5b5b]">
											{sortOrder === 'asc' ? '↑' : '↓'}
										</span>
									)}
								</div>
								<div>{t('owner.services.actions')}</div>
							</div>
							<div className="divide-y divide-[#f1d9d7]">
								{filteredServices.map((service) => (
									<div
										key={service.id}
										className="grid grid-cols-6 px-6 py-4 text-sm text-gray-800"
									>
										<div className="font-semibold">{service.name}</div>
										<div className="text-gray-600">
											{getCategoryName(service.serviceCategoryId) ? (
												<span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
													{getCategoryName(service.serviceCategoryId)}
												</span>
											) : (
												<span className="text-gray-400 italic">
													{t('owner.services.noCategory')}
												</span>
											)}
										</div>
										<div className="text-gray-600">
											{service.serviceGroup ? (
												<span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
													{service.serviceGroup.name}
												</span>
											) : (
												<span className="text-gray-400 italic">
													{t('owner.services.noGroup')}
												</span>
											)}
										</div>
										<div>{formatDuration(service.duration)}</div>
										<div className="font-semibold text-[#ff5b5b]">
											{formatVND(service.price)}
										</div>
										<div className="flex gap-2">
											<button
												onClick={() => handleEditService(service)}
												className="p-1 text-[#ff5b5b] hover:text-[#e04a4a] hover:bg-red-50 rounded transition-colors"
												title={t('owner.services.editService')}
											>
												<svg
													className="w-4 h-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
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
												className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
												title={t('owner.services.deleteService')}
											>
												<svg
													className="w-4 h-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
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

						{/* Mobile Card View */}
						<div className="md:hidden divide-y divide-[#f1d9d7]">
							{filteredServices.map((service) => (
								<div key={service.id} className="p-4">
									<div className="flex items-start justify-between mb-3">
										<div className="flex-1 min-w-0">
											<h3 className="font-semibold text-gray-900 truncate">
												{service.name}
											</h3>
											<div className="text-lg font-bold text-[#ff5b5b] mt-1">
												{formatVND(service.price)}
											</div>
										</div>
										<div className="flex gap-2 ml-3">
											<button
												onClick={() => handleEditService(service)}
												className="p-2 text-[#ff5b5b] hover:text-[#e04a4a] hover:bg-red-50 rounded transition-colors"
												title="Edit service"
											>
												<svg
													className="w-5 h-5 sm:w-4 sm:h-4 "
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
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
												className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
												title="Delete service"
											>
												<svg
													className="w-5 h-5 sm:w-4 sm:h-4 "
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
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

									<div className="flex items-center justify-between text-sm text-gray-600">
										<div className="flex items-center gap-2 flex-wrap">
											{getCategoryName(service.serviceCategoryId) && (
												<span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
													{getCategoryName(service.serviceCategoryId)}
												</span>
											)}
											{service.serviceGroup && (
												<span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
													{service.serviceGroup.name}
												</span>
											)}
										</div>
										<div className="text-right">
											<div>{formatDuration(service.duration)}</div>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}

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
		</div>
	);
}
