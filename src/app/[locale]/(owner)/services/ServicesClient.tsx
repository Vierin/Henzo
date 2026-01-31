'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import EditServiceModal from '@/components/EditServiceModal';
import {
	useServices,
	useDeleteService,
	serviceKeys,
} from '@/hooks/useServices';
import { useOwnerLayout } from '@/contexts/OwnerLayoutContext';
import { ServiceCategory } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import { Service, ServiceGroup } from '@/types';
import { formatVND } from '@/utils/currency';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useTranslation, useLanguage } from '@/contexts/LanguageContext';
import { extractLocaleFromPath } from '@/i18n/routing';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import CategoryAutocomplete from '@/components/CategoryAutocomplete';

export default function ServicesClient() {
	const t = useTranslation();
	const { language: contextLanguage } = useLanguage();
	const pathname = usePathname();
	const currentLang =
		contextLanguage || extractLocaleFromPath(pathname) || 'en';
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
	const [isManageGroupsModalOpen, setIsManageGroupsModalOpen] = useState(false);
	const [newGroupName, setNewGroupName] = useState('');
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

	const { language } = useLanguage();

	// Load categories from API (same as EditServiceModal and NewServiceClient)
	const { data: categories = [] } = useQuery<ServiceCategory[]>({
		queryKey: ['service-categories'],
		queryFn: async () => {
			return apiClient.get<ServiceCategory[]>('/services/categories');
		},
		staleTime: 10 * 60 * 1000,
	});

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

	const handleCreateGroup = async () => {
		if (!newGroupName.trim() || !salonId) return;
		try {
			await apiClient.post('/services/groups', {
				salonId,
				name: newGroupName.trim(),
			});
			queryClient.invalidateQueries({
				queryKey: ['service-groups', salonId],
			});
			setNewGroupName('');
			toast.success('Group created successfully');
		} catch (err: any) {
			console.error('Failed to create group:', err);
			toast.error(err.message || 'Failed to create group');
		}
	};

	const handleDeleteGroup = async (groupId: string) => {
		if (!confirm(t('owner.services.areYouSureDeleteGroup'))) return;
		try {
			await apiClient.delete(`/services/groups/${groupId}`);
			queryClient.invalidateQueries({
				queryKey: ['service-groups', salonId],
			});
			// Also invalidate services to update group display
			if (salonId) {
				queryClient.invalidateQueries({
					queryKey: serviceKeys.list({ salonId }),
				});
			}
			toast.success('Group deleted successfully');
		} catch (err: any) {
			console.error('Failed to delete group:', err);
			toast.error(err.message || 'Failed to delete group');
		}
	};

	const queryClient = useQueryClient();

	const handleSaveService = (updatedService: Service) => {
		// Инвалидируем кеш услуг для обновления списка
		queryClient.invalidateQueries({
			queryKey: ['services'],
		});
		// Также инвалидируем группы услуг на случай, если группа изменилась
		if (salonId) {
			queryClient.invalidateQueries({
				queryKey: ['service-groups', salonId],
			});
		}
		// Инвалидируем список услуг
		if (salonId) {
			queryClient.invalidateQueries({
				queryKey: serviceKeys.list({ salonId }),
			});
		}
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
		if (!category) return null;
		// Use same logic as EditServiceModal
		return language === 'ru'
			? category.name_ru || category.name_en
			: language === 'vi'
				? category.name_vn || category.name_en
				: category.name_en;
	};

	// Helper function to get localized category name from service_categories (DB)
	const getLocalizedCategoryName = (serviceCategory: any) => {
		if (!serviceCategory) return null;
		// Handle both serviceCategory and service_categories naming
		const category = serviceCategory;
		switch (currentLang) {
			case 'vi':
				return (
					category.name_vn ||
					category.nameVi ||
					category.name_en ||
					category.nameEn
				);
			case 'ru':
				return (
					category.name_ru ||
					category.nameRu ||
					category.name_en ||
					category.nameEn
				);
			case 'en':
				return category.name_en || category.nameEn;
			default:
				return category.name_en || category.nameEn;
		}
	};

	// Helper function to get localized group name
	const getLocalizedGroupName = (group: any) => {
		if (!group) return '';
		switch (currentLang) {
			case 'vi':
				return group.nameVi || group.name;
			case 'ru':
				return group.nameRu || group.name;
			case 'en':
				return group.nameEn || group.name;
			default:
				return group.name;
		}
	};

	// Helper function to get localized service name
	const getLocalizedServiceName = (service: Service) => {
		if (!service) return '';
		switch (currentLang) {
			case 'vi':
				return service.nameVi || service.name;
			case 'ru':
				return service.nameRu || service.name;
			case 'en':
				return service.nameEn || service.name;
			default:
				return service.name;
		}
	};

	// Helper function to get group by ID from groups list
	const getGroupById = (groupId?: string | null) => {
		if (!groupId) return null;
		return groups.find((g) => g.id === groupId) || null;
	};

	// Фильтрация и сортировка сервисов
	const filteredServices = useMemo(() => {
		return services
			.filter((service) => {
				// Фильтр по поиску (только если больше 2 символов или пустой)
				if (debouncedSearchQuery && debouncedSearchQuery.length > 2) {
					const serviceName = getLocalizedServiceName(service);
					const matchesSearch = serviceName
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
						const nameA = getLocalizedServiceName(a);
						const nameB = getLocalizedServiceName(b);
						comparison = nameA.localeCompare(nameB);
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
		currentLang,
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

	// Show UI immediately, data loads in parallel
	return (
		<div className="px-4 md:px-8 py-6 w-full max-w-7xl mx-auto">
			<div className="mb-8">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between">
					<div>
						<h1 className="text-2xl md:text-3xl font-bold text-black md:mb-2">
							{t('owner.services.title')}
						</h1>
						<p className="text-sm md:text-base text-gray-800">
							{t('owner.services.subtitle')}
						</p>
					</div>
					<div className="flex items-center gap-2 mt-3 sm:mt-0">
						<button
							onClick={() => setIsManageGroupsModalOpen(true)}
							className="inline-flex items-center gap-2 rounded-full bg-white border border-gray-300 !text-gray-900 px-4 py-2 text-sm shadow-sm hover:opacity-95 whitespace-nowrap"
						>
							<span>{t('owner.services.manageGroups')}</span>
						</button>
						<button
							onClick={() => router.push('/services/new')}
							className="inline-flex items-center gap-2 rounded-full bg-[#ff5b5b] !text-white px-4 py-2 text-sm shadow-sm hover:opacity-95 whitespace-nowrap"
						>
							<span className="text-lg leading-none">＋</span>
							<span>{t('owner.services.addService')}</span>
						</button>
					</div>
				</div>
			</div>

			{/* Error Display - show at top if error */}
			{error && (
				<div className="mb-6">
					<ErrorDisplay
						error={
							error instanceof Error ? error : new Error('An error occurred')
						}
						onRetry={refetch}
					/>
				</div>
			)}

			{/* Фильтры и сортировка */}
			<div className="mb-6 bg-white rounded-xl border border-[#f1d9d7] p-3 md:p-6">
				<div
					className="grid gap-3 md:gap-4 
            grid-cols-1
            sm:grid-cols-[repeat(4,minmax(0,1fr))_150px]"
				>
					{/* Поиск */}
					<div className="flex flex-col justify-between">
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
								className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-black placeholder-gray-500"
							/>
							{/* Кнопка очистки */}
							{searchQuery && !isSearching && (
								<button
									onClick={() => setSearchQuery('')}
									className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
									type="button"
									aria-label="Clear search"
								>
									<X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
								</button>
							)}
							{/* Индикатор поиска */}
							{isSearching && (
								<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ff5b5b]"></div>
								</div>
							)}
						</div>
					</div>

					{/* Фильтр по категории */}
					<div className="flex flex-col justify-between">
						<label className="block text-sm font-medium text-black mb-2">
							{t('owner.services.category')}
						</label>
						<div className="relative">
							<CategoryAutocomplete
								value={
									selectedCategory === 'all' ? undefined : selectedCategory
								}
								onChange={(categoryId) =>
									setSelectedCategory(categoryId || 'all')
								}
								categories={categories}
								placeholder={t('owner.services.allCategories')}
							/>
						</div>
					</div>

					{/* Фильтр по группе */}
					<div className="flex flex-col justify-between">
						<label className="block text-sm font-medium text-black mb-2">
							{t('owner.services.group')}
						</label>
						<Select
							value={selectedGroup}
							onValueChange={(value) => setSelectedGroup(value)}
						>
							<SelectTrigger className="w-full !h-[42px] rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-black">
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
										{getLocalizedGroupName(group)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Сортировка */}
					<div className="flex flex-col justify-between">
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
							<SelectTrigger className="w-full !h-[42px] rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-black">
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
							className="w-full !h-[42px] px-4 py-2 text-sm font-medium text-black bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent transition-colors"
						>
							{t('owner.services.clearFilters')}
						</button>
					</div>
				</div>
			</div>

			{services.length === 0 ? (
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
			) : salonLoading || servicesLoading ? (
				// Show skeleton while loading
				<div className="space-y-4">
					<div className="bg-white rounded-xl border border-[#f1d9d7] overflow-hidden">
						<div className="hidden md:block">
							<div className="grid grid-cols-6 px-6 py-3 text-sm text-gray-700 bg-[#fff2f1] font-semibold">
								<div>{t('owner.services.serviceName')}</div>
								<div>{t('owner.services.category')}</div>
								<div>{t('owner.services.group')}</div>
								<div>{t('owner.services.duration')}</div>
								<div>{t('owner.services.price')}</div>
								<div>{t('owner.services.actions')}</div>
							</div>
							<div className="divide-y divide-[#f1d9d7]">
								{[...Array(3)].map((_, i) => (
									<div key={i} className="grid grid-cols-6 px-6 py-4">
										<div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
										<div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
										<div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
										<div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
										<div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
										<div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
									</div>
								))}
							</div>
						</div>
						<div className="md:hidden divide-y divide-[#f1d9d7]">
							{[...Array(3)].map((_, i) => (
								<div key={i} className="p-4">
									<div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse mb-2" />
									<div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse mb-4" />
									<div className="flex justify-between">
										<div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
										<div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			) : filteredServices.length === 0 &&
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
										<div className="font-semibold">{getLocalizedServiceName(service)}</div>
										<div className="text-gray-600">
											{service.service_categories ? (
												<span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
													{getLocalizedCategoryName(service.service_categories)}
												</span>
											) : getCategoryName(service.serviceCategoryId) ? (
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
											{(() => {
												const group =
													service.serviceGroup ||
													getGroupById(service.serviceGroupId);
												return group ? (
													<span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
														{getLocalizedGroupName(group)}
													</span>
												) : (
													<span className="text-gray-400 italic">
														{t('owner.services.noGroup')}
													</span>
												);
											})()}
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
													{getLocalizedServiceName(service)}
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
											{service.service_categories ? (
												<span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
													{getLocalizedCategoryName(service.service_categories)}
												</span>
											) : (
												getCategoryName(service.serviceCategoryId) && (
													<span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
														{getCategoryName(service.serviceCategoryId)}
													</span>
												)
											)}
											{(() => {
												const group =
													service.serviceGroup ||
													getGroupById(service.serviceGroupId);
												return group ? (
													<span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
														{getLocalizedGroupName(group)}
													</span>
												) : null;
											})()}
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

			{/* Manage Groups Modal */}
			{isManageGroupsModalOpen && (
				<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">
							{t('owner.services.manageGroupsTitle')}
						</h2>

						{/* Add New Group Form */}
						<div className="mb-6 pb-6 border-b border-gray-200">
							<p className="text-sm text-gray-600 mb-3">
								{t('owner.services.addServiceGroupHelp')}
							</p>
							<div className="flex gap-2">
								<input
									type="text"
									value={newGroupName}
									onChange={(e) => setNewGroupName(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter' && newGroupName.trim() && salonId) {
											handleCreateGroup();
										}
									}}
									className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900 text-sm"
									placeholder={t('owner.services.groupName')}
									autoFocus
								/>
								<button
									onClick={handleCreateGroup}
									disabled={!newGroupName.trim() || !salonId}
									className="px-4 py-2 text-sm bg-[#ff5b5b] !text-white rounded-md hover:bg-[#e04a4a] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
								>
									{t('owner.services.create')}
								</button>
							</div>
						</div>

						{/* Groups List */}
						<div className="space-y-2">
							{groups.length === 0 ? (
								<p className="text-sm text-gray-500 text-center py-4">
									{t('owner.services.noGroupsYet')}
								</p>
							) : (
								groups.map((group) => (
									<div
										key={group.id}
										className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
									>
										<span className="text-sm font-medium text-gray-900">
											{getLocalizedGroupName(group)}
										</span>
										<button
											onClick={() => handleDeleteGroup(group.id)}
											className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
											title={t('owner.services.deleteGroup')}
										>
											<X className="w-4 h-4" />
										</button>
									</div>
								))
							)}
						</div>

						{/* Close Button */}
						<div className="mt-6 flex justify-end">
							<button
								onClick={() => {
									setIsManageGroupsModalOpen(false);
									setNewGroupName('');
								}}
								className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
							>
								{t('owner.services.cancel')}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
