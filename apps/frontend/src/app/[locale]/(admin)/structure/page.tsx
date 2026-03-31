'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ServiceCategory {
	id: number;
	nameEn: string;
	nameVn: string;
	nameRu: string;
	serviceCount: number;
}

interface MainCategory {
	id: number;
	slug: string;
	name: string;
	serviceCategories: ServiceCategory[];
	totalServices: number;
}

interface RecommendedService {
	id: number;
	nameEn: string;
	nameVi: string;
	nameRu: string;
	categoryId: number | null;
	priority: number;
}

interface StructureData {
	mainCategories: MainCategory[];
	unassignedCategories: ServiceCategory[];
	recommendedServices: RecommendedService[];
}

interface ServiceCategoryDetail {
	category: {
		id: number;
		name_en: string;
		name_vn: string;
		name_ru: string;
		main_category_id: number | null;
	};
	salons: Array<{
		salonId: string;
		salonName: string;
		salonSlug: string | null;
		services: Array<{
			id: string;
			name: string;
			nameEn: string;
			nameVi: string;
			nameRu: string;
			price: number;
			duration: number;
		}>;
	}>;
	totalServices: number;
	totalSalons: number;
}

export default function StructurePage() {
	const [expandedCategories, setExpandedCategories] = useState<Set<number>>(
		new Set()
	);
	const [showRecommended, setShowRecommended] = useState(true);
	const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
		null
	);

	const { data, isLoading, error } = useQuery<StructureData>({
		queryKey: ['admin', 'structure'],
		queryFn: async (): Promise<StructureData> => {
			const response = await apiClient.get<StructureData>('/admin/structure');
			return response;
		},
	});

	// Auto-expand all main categories on load
	useEffect(() => {
		if (data?.mainCategories) {
			const allCategoryIds = new Set(data.mainCategories.map((cat) => cat.id));
			setExpandedCategories(allCategoryIds);
		}
	}, [data]);

	const {
		data: categoryDetails,
		isLoading: detailsLoading,
		error: detailsError,
	} = useQuery<ServiceCategoryDetail | null>({
		queryKey: ['admin', 'structure', 'service-category', selectedCategoryId],
		queryFn: async (): Promise<ServiceCategoryDetail | null> => {
			if (!selectedCategoryId) return null;
			const response = await apiClient.get<ServiceCategoryDetail>(
				`/admin/structure/service-category/${selectedCategoryId}`
			);
			return response;
		},
		enabled: selectedCategoryId !== null,
	});

	const toggleCategory = (id: number, e?: React.MouseEvent) => {
		// Prevent expanding/collapsing when clicking on service category
		if (e && (e.target as HTMLElement).closest('.service-category-item')) {
			return;
		}
		setExpandedCategories((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const handleServiceCategoryClick = (
		categoryId: number,
		e: React.MouseEvent
	) => {
		e.stopPropagation();
		setSelectedCategoryId(categoryId);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-gray-500">Loading structure...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-red-500">
					Error loading structure: {(error as Error).message}
				</div>
			</div>
		);
	}

	if (!data) {
		return null;
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold text-gray-900">Category Structure</h1>
				<button
					onClick={() => setShowRecommended(!showRecommended)}
					className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
				>
					{showRecommended ? 'Hide' : 'Show'} Recommended Services
				</button>
			</div>

			{/* Main Categories */}
			<div className="space-y-4">
				<h2 className="text-xl font-semibold text-gray-800">
					Main Categories ({data.mainCategories.length})
				</h2>
				{data.mainCategories.map((mainCat) => (
					<div
						key={mainCat.id}
						className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
					>
						<div
							className="px-6 py-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
							onClick={() => toggleCategory(mainCat.id)}
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<svg
										className={`w-5 h-5 text-gray-500 transition-transform ${
											expandedCategories.has(mainCat.id) ? 'rotate-90' : ''
										}`}
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 5l7 7-7 7"
										/>
									</svg>
									<div>
										<h3 className="text-lg font-semibold text-gray-900">
											{mainCat.name}
										</h3>
										<p className="text-sm text-gray-500">
											{mainCat.serviceCategories.length} service
											{mainCat.serviceCategories.length !== 1
												? ' categories'
												: ' category'}
											{' • '}
											{mainCat.totalServices} total services
										</p>
									</div>
								</div>
								<div className="flex items-center gap-4">
									<span className="text-sm text-gray-600">
										Slug:{' '}
										<code className="text-xs bg-gray-200 px-2 py-1 rounded">
											{mainCat.slug}
										</code>
									</span>
								</div>
							</div>
						</div>

						{expandedCategories.has(mainCat.id) && (
							<div className="px-6 py-4 space-y-2">
								{mainCat.serviceCategories.length === 0 ? (
									<p className="text-sm text-gray-500 italic">
										No service categories assigned
									</p>
								) : (
									mainCat.serviceCategories.map((serviceCat) => (
										<div
											key={serviceCat.id}
											className="service-category-item flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-colors"
											onClick={(e) =>
												handleServiceCategoryClick(serviceCat.id, e)
											}
										>
											<div className="flex-1">
												<div className="flex items-center gap-2">
													<span className="font-medium text-gray-900">
														{serviceCat.nameEn}
													</span>
													<span className="text-xs text-gray-500">
														({serviceCat.nameRu} / {serviceCat.nameVn})
													</span>
												</div>
											</div>
											<div className="flex items-center gap-4">
												<span className="text-sm font-medium text-gray-700">
													{serviceCat.serviceCount} service
													{serviceCat.serviceCount !== 1 ? 's' : ''}
												</span>
												<svg
													className="w-4 h-4 text-gray-400"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M9 5l7 7-7 7"
													/>
												</svg>
											</div>
										</div>
									))
								)}
							</div>
						)}
					</div>
				))}
			</div>

			{/* Unassigned Categories */}
			{data.unassignedCategories.length > 0 && (
				<div className="space-y-4">
					<h2 className="text-xl font-semibold text-gray-800">
						Unassigned Service Categories ({data.unassignedCategories.length})
					</h2>
					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
						<p className="text-sm text-yellow-800 mb-3">
							These service categories are not assigned to any main category.
						</p>
						<div className="space-y-2">
							{data.unassignedCategories.map((cat) => (
								<div
									key={cat.id}
									className="service-category-item flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200 cursor-pointer hover:bg-yellow-50 hover:border-yellow-300 transition-colors"
									onClick={(e) => handleServiceCategoryClick(cat.id, e)}
								>
									<div className="flex-1">
										<div className="flex items-center gap-2">
											<span className="font-medium text-gray-900">
												{cat.nameEn}
											</span>
											<span className="text-xs text-gray-500">
												({cat.nameRu} / {cat.nameVn})
											</span>
										</div>
									</div>
									<div className="flex items-center gap-4">
										<span className="text-sm font-medium text-gray-700">
											{cat.serviceCount} service
											{cat.serviceCount !== 1 ? 's' : ''}
										</span>
										<svg
											className="w-4 h-4 text-gray-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M9 5l7 7-7 7"
											/>
										</svg>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}

			{/* Recommended Services */}
			{showRecommended && (
				<div className="space-y-4">
					<h2 className="text-xl font-semibold text-gray-800">
						Recommended Services ({data.recommendedServices.length})
					</h2>
					<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
						<div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
							<p className="text-sm text-gray-600">
								These services appear in search suggestions when users type in
								the search box.
							</p>
						</div>
						<div className="divide-y divide-gray-200">
							{data.recommendedServices.length === 0 ? (
								<div className="px-6 py-4 text-sm text-gray-500 italic">
									No recommended services
								</div>
							) : (
								data.recommendedServices.map((service) => (
									<div
										key={service.id}
										className="px-6 py-4 hover:bg-gray-50 transition-colors"
									>
										<div className="flex items-center justify-between">
											<div className="flex-1">
												<div className="flex items-center gap-2">
													<span className="font-medium text-gray-900">
														{service.nameEn}
													</span>
													<span className="text-xs text-gray-500">
														({service.nameRu} / {service.nameVi})
													</span>
												</div>
											</div>
											<div className="flex items-center gap-4">
												{service.categoryId && (
													<span className="text-xs text-gray-500">
														Category ID: {service.categoryId}
													</span>
												)}
												<span className="text-sm font-medium text-gray-700">
													Priority: {service.priority}
												</span>
											</div>
										</div>
									</div>
								))
							)}
						</div>
					</div>
				</div>
			)}

			{/* Service Category Details Modal */}
			{selectedCategoryId && (
				<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
						{/* Header */}
						<div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
							<div>
								<h2 className="text-xl font-semibold text-gray-900">
									{categoryDetails?.category.name_en || 'Loading...'}
								</h2>
								<p className="text-sm text-gray-500 mt-1">
									{categoryDetails?.category.name_ru} /{' '}
									{categoryDetails?.category.name_vn}
								</p>
							</div>
							<button
								onClick={() => setSelectedCategoryId(null)}
								className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						{/* Content */}
						<div className="flex-1 overflow-y-auto px-6 py-4">
							{detailsLoading ? (
								<div className="flex items-center justify-center py-8">
									<div className="text-gray-500">Loading details...</div>
								</div>
							) : detailsError ? (
								<div className="flex items-center justify-center py-8">
									<div className="text-red-500">
										Failed to load details:{' '}
										{(detailsError as Error).message || 'Unknown error'}
									</div>
								</div>
							) : categoryDetails ? (
								<div className="space-y-4">
									{/* Summary */}
									<div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
										<div className="grid grid-cols-2 gap-4">
											<div>
												<p className="text-sm text-gray-500">Total Salons</p>
												<p className="text-lg font-semibold text-gray-900">
													{categoryDetails.totalSalons}
												</p>
											</div>
											<div>
												<p className="text-sm text-gray-500">Total Services</p>
												<p className="text-lg font-semibold text-gray-900">
													{categoryDetails.totalServices}
												</p>
											</div>
										</div>
									</div>

									{/* Salons and Services */}
									{categoryDetails.salons.length === 0 ? (
										<div className="text-center py-8 text-gray-500">
											No services found in this category
										</div>
									) : (
										<div className="space-y-4">
											{categoryDetails.salons.map((salon) => (
												<div
													key={salon.salonId}
													className="border border-gray-200 rounded-lg overflow-hidden"
												>
													<div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
														<h3 className="font-semibold text-gray-900">
															{salon.salonName}
														</h3>
														<p className="text-xs text-gray-500 mt-1">
															{salon.services.length} service
															{salon.services.length !== 1 ? 's' : ''}
														</p>
													</div>
													<div className="divide-y divide-gray-100">
														{salon.services.map((service) => (
															<div
																key={service.id}
																className="px-4 py-3 hover:bg-gray-50 transition-colors"
															>
																<div className="flex items-center justify-between">
																	<div className="flex-1">
																		<p className="font-medium text-gray-900">
																			{service.nameEn || service.name}
																		</p>
																	</div>
																	<div className="ml-4 text-right">
																		<p className="text-sm font-medium text-gray-900">
																			{new Intl.NumberFormat('vi-VN', {
																				style: 'currency',
																				currency: 'VND',
																			}).format(service.price)}
																		</p>
																		<p className="text-xs text-gray-500 mt-1">
																			{service.duration} min
																		</p>
																	</div>
																</div>
															</div>
														))}
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							) : (
								<div className="flex items-center justify-center py-8">
									<div className="text-red-500">Failed to load details</div>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
