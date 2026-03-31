'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useClients } from '@/hooks/useClients';
import { useOwnerLayout } from '@/contexts/OwnerLayoutContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import { useTranslation } from '@/contexts/LanguageContext';
import ClientCard from './components/ClientCard';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

export default function ClientsClient() {
	const t = useTranslation();
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
	const [isSearching, setIsSearching] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [sortBy, setSortBy] = useState<'name' | 'totalSpent' | 'visitCount' | 'lastVisit'>('lastVisit');
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

	const { salonId, isLoading: salonLoading, hasSalon } = useOwnerLayout();

	const {
		data: clientsResponse,
		isLoading: clientsLoading,
		error: clientsError,
		refetch,
	} = useClients(debouncedSearchQuery, currentPage);

	const clients = clientsResponse?.data || [];
	const pagination = clientsResponse?.pagination;

	// Debounce search - задержка 600мс как на странице услуг
	useEffect(() => {
		setIsSearching(true);
		// Reset to page 1 when search changes
		setCurrentPage(1);

		const timer = setTimeout(() => {
			setDebouncedSearchQuery(searchQuery);
			setIsSearching(false);
		}, 600);

		return () => {
			clearTimeout(timer);
			setIsSearching(false);
		};
	}, [searchQuery]);

	// Сортировка клиентов — хук до любого раннего return
	const sortedClients = useMemo(() => {
		return [...clients].sort((a, b) => {
			let comparison = 0;

			switch (sortBy) {
				case 'name':
					const nameA = (a.name || a.email || '').toLowerCase();
					const nameB = (b.name || b.email || '').toLowerCase();
					comparison = nameA.localeCompare(nameB);
					break;
				case 'totalSpent':
					comparison = a.totalSpent - b.totalSpent;
					break;
				case 'visitCount':
					comparison = a.visitCount - b.visitCount;
					break;
				case 'lastVisit':
					if (!a.lastVisit && !b.lastVisit) comparison = 0;
					else if (!a.lastVisit) comparison = 1;
					else if (!b.lastVisit) comparison = -1;
					else {
						comparison = new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime();
					}
					break;
				default:
					comparison = 0;
			}

			return sortOrder === 'asc' ? comparison : -comparison;
		});
	}, [clients, sortBy, sortOrder]);

	// Redirect if no salon — после всех хуков
	if (!salonLoading && !hasSalon) {
		router.push('/salon-info');
		return null;
	}

	return (
		<div className="px-4 md:px-8 py-6 w-full max-w-7xl mx-auto">
			{/* Header - всегда статичный */}
			<div className="mb-8">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold text-black md:mb-2">
						{t('owner.clients.title')}
					</h1>
					<p className="text-sm md:text-base text-gray-800">
						{t('owner.clients.subtitle')}
					</p>
				</div>
			</div>

			{/* Фильтры и сортировка */}
			<div className="mb-6 bg-white rounded-xl border border-[#f1d9d7] p-3 md:p-6">
				<div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-[1fr_300px]">
					{/* Поиск */}
					<div className="flex flex-col justify-between">
						<label className="block text-sm font-medium text-black mb-2">
							{t('owner.clients.search')}
						</label>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder={t('owner.clients.searchPlaceholder')}
								className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-black placeholder-gray-500"
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

					{/* Сортировка */}
					<div className="flex flex-col justify-between">
						<label className="block text-sm font-medium text-black mb-2">
							{t('owner.clients.sortBy')}
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
									value="lastVisit-desc"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									{t('owner.clients.lastVisitRecent')}
								</SelectItem>
								<SelectItem
									value="lastVisit-asc"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									{t('owner.clients.lastVisitOldest')}
								</SelectItem>
								<SelectItem
									value="name-asc"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									{t('owner.clients.nameAZ')}
								</SelectItem>
								<SelectItem
									value="name-desc"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									{t('owner.clients.nameZA')}
								</SelectItem>
								<SelectItem
									value="totalSpent-desc"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									{t('owner.clients.totalSpentHighToLow')}
								</SelectItem>
								<SelectItem
									value="totalSpent-asc"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									{t('owner.clients.totalSpentLowToHigh')}
								</SelectItem>
								<SelectItem
									value="visitCount-desc"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									{t('owner.clients.visitCountHighToLow')}
								</SelectItem>
								<SelectItem
									value="visitCount-asc"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									{t('owner.clients.visitCountLowToHigh')}
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			{/* Clients List - загружается отдельно */}
			{clientsError ? (
				<ErrorDisplay
					error={
						clientsError instanceof Error
							? clientsError
							: new Error(t('owner.clients.failedToLoadClients'))
					}
					onRetry={refetch}
				/>
			) : clientsLoading || isSearching ? (
				<div className="flex items-center justify-center min-h-[400px]">
					<LoadingSpinner size="lg" message={t('owner.clients.loading')} />
				</div>
			) : clients.length === 0 ? (
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
								d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
							/>
						</svg>
					</div>
					<h3 className="text-lg font-semibold text-gray-900 mb-2">
						{t('owner.clients.noClients')}
					</h3>
					<p className="text-gray-600">{t('owner.clients.noClientsDescription')}</p>
				</div>
			) : (
				<>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{sortedClients.map((client) => (
							<ClientCard key={client.id} client={client} />
						))}
					</div>

					{/* Pagination */}
					{pagination && pagination.totalPages > 1 && (
						<div className="mt-8 flex items-center justify-center gap-4">
							<button
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								disabled={!pagination.hasPreviousPage || clientsLoading}
								className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								<ChevronLeft className="w-4 h-4" />
								{t('owner.clients.previous') || 'Previous'}
							</button>

							<div className="flex items-center gap-2">
								<span className="text-sm text-gray-600">
									{t('owner.clients.page') || 'Page'} {pagination.page} {t('owner.clients.of') || 'of'} {pagination.totalPages}
								</span>
								<span className="text-sm text-gray-400">•</span>
								<span className="text-sm text-gray-600">
									{pagination.total} {t('owner.clients.total') || 'total'}
								</span>
							</div>

							<button
								onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
								disabled={!pagination.hasNextPage || clientsLoading}
								className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{t('owner.clients.next') || 'Next'}
								<ChevronRight className="w-4 h-4" />
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
}

