'use client';

import React from 'react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

interface FilterOption {
	value: string;
	label: string;
}

interface AdminFiltersProps {
	searchTerm: string;
	onSearchChange: (value: string) => void;
	filters: Array<{
		key: string;
		label: string;
		type: 'select' | 'input';
		value: any;
		onChange: (value: any) => void;
		options?: FilterOption[];
		placeholder?: string;
	}>;
	sortBy: string;
	onSortByChange: (value: string) => void;
	sortByOptions: FilterOption[];
	sortOrder: 'asc' | 'desc';
	onSortOrderChange: (value: 'asc' | 'desc') => void;
	showClearButton?: boolean;
	onClearFilters?: () => void;
}

export default function AdminFilters({
	searchTerm,
	onSearchChange,
	filters,
	sortBy,
	onSortByChange,
	sortByOptions,
	sortOrder,
	onSortOrderChange,
	showClearButton = false,
	onClearFilters,
}: AdminFiltersProps) {
	const hasActiveFilters = searchTerm || 
		filters.some(filter => filter.value && filter.value !== 'all') ||
		sortBy !== sortByOptions[0]?.value ||
		sortOrder !== 'desc';

	return (
		<div className="bg-white p-6 rounded-lg shadow-sm border">
			<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
				{/* Search */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Search
					</label>
					<input
						type="text"
						placeholder="Search..."
						value={searchTerm}
						onChange={(e) => onSearchChange(e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
					/>
				</div>

				{/* Filters */}
				{filters.map((filter, index) => (
					<div key={filter.key}>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							{filter.label}
						</label>
						{filter.type === 'select' ? (
							<Select
								value={filter.value}
								onValueChange={filter.onChange}
							>
								<SelectTrigger className="w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900">
									<SelectValue placeholder={filter.placeholder} />
								</SelectTrigger>
								<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
									{filter.options?.map((option) => (
										<SelectItem
											key={option.value}
											value={option.value}
											className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
										>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : (
							<input
								type="text"
								placeholder={filter.placeholder}
								value={filter.value || ''}
								onChange={(e) => filter.onChange(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
							/>
						)}
					</div>
				))}

				{/* Sort By */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Sort By
					</label>
					<Select
						value={sortBy}
						onValueChange={onSortByChange}
					>
						<SelectTrigger className="w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900">
							<SelectValue />
						</SelectTrigger>
						<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
							{sortByOptions.map((option) => (
								<SelectItem
									key={option.value}
									value={option.value}
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Sort Order */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Order
					</label>
					<Select
						value={sortOrder}
						onValueChange={onSortOrderChange}
					>
						<SelectTrigger className="w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900">
							<SelectValue />
						</SelectTrigger>
						<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
							<SelectItem
								value="desc"
								className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
							>
								Descending
							</SelectItem>
							<SelectItem
								value="asc"
								className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
							>
								Ascending
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Clear Filters */}
			{showClearButton && hasActiveFilters && onClearFilters && (
				<div className="mt-4 pt-4 border-t border-gray-200">
					<button
						onClick={onClearFilters}
						className="px-4 py-2 text-sm text-[#ff5b5b] hover:text-[#ff4545] font-medium border border-[#ff5b5b] rounded-md hover:bg-red-50 transition-colors"
					>
						Clear Filters
					</button>
				</div>
			)}
		</div>
	);
}









