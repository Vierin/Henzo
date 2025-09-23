'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateService } from '@/hooks/useServices';
import { useCategoriesBySalon } from '@/hooks/useCategories';
import { useSalonId } from '@/hooks/useSalon';
import CreateCategoryModal from '@/components/CreateCategoryModal';
import { Category } from '@/types';

export default function NewServicePage() {
	const [formData, setFormData] = useState({
		name: '',
		description: '',
		duration: '',
		price: '',
		categoryId: '',
	});
	const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
	const router = useRouter();

	// Используем оптимизированный хук для получения данных салона
	const { salonId, isLoading: salonLoading, hasSalon } = useSalonId();

	const { data: categories = [] } = useCategoriesBySalon(salonId || '');
	const createServiceMutation = useCreateService();

	// Перенаправляем на создание салона, если салон не найден
	if (!salonLoading && !hasSalon) {
		router.push('/salon-info');
		return null;
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validate form
		if (!formData.name || !formData.duration || !formData.price || !salonId) {
			return;
		}

		if (isNaN(Number(formData.duration)) || Number(formData.duration) <= 0) {
			return;
		}

		if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
			return;
		}

		try {
			await createServiceMutation.mutateAsync({
				name: formData.name.trim(),
				description: formData.description.trim() || undefined,
				duration: Number(formData.duration),
				price: Number(formData.price),
				salonId,
				categoryId: formData.categoryId || undefined,
			});

			// Wait a bit for cache invalidation, then redirect
			setTimeout(() => {
				router.push('/services');
			}, 100);
		} catch (err: unknown) {
			console.error('Failed to create service:', err);
		}
	};

	const handleCategoryCreated = (newCategory: Category) => {
		setFormData((prev) => ({
			...prev,
			categoryId: newCategory.id,
		}));
	};

	// Показываем загрузку пока не получили salonId
	if (salonLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5b5b] mx-auto mb-4"></div>
					<p className="text-gray-600">Loading...</p>
				</div>
			</div>
		);
	}

	// Если salonId не получен, не показываем форму
	if (!salonId) {
		return null;
	}

	return (
		<div>
			<div className="mb-8">
				<button
					onClick={() => router.back()}
					className="flex items-center gap-2 text-[#6b6b6b] hover:text-black mb-4"
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
							d="M15 19l-7-7 7-7"
						/>
					</svg>
					Back
				</button>
				<h1 className="text-3xl font-bold text-gray-900 mb-2">
					Add New Service
				</h1>
				<p className="text-gray-600">
					Create a new service for your salon with pricing and duration details.
				</p>
			</div>

			<div className="bg-white rounded-xl border border-[#f1d9d7] p-6">
				<form onSubmit={handleSubmit} className="space-y-6">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Service Name *
						</label>
						<input
							type="text"
							required
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
							placeholder="e.g., Haircut, Manicure, Facial"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Description
						</label>
						<textarea
							rows={4}
							value={formData.description}
							onChange={(e) =>
								setFormData({ ...formData, description: e.target.value })
							}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
							placeholder="Describe what this service includes..."
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Category
						</label>
						<div className="flex gap-2">
							<select
								value={formData.categoryId}
								onChange={(e) =>
									setFormData({ ...formData, categoryId: e.target.value })
								}
								className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
							>
								<option value="">Select a category</option>
								{categories.map((category) => (
									<option key={category.id} value={category.id}>
										{category.name}
									</option>
								))}
							</select>
							<button
								type="button"
								onClick={() => setIsCategoryModalOpen(true)}
								className="px-3 py-2 bg-[#ff5b5b] text-white rounded-md hover:bg-[#e04a4a] transition-colors"
								title="Add new category"
							>
								+
							</button>
						</div>
						<p className="text-xs text-gray-500 mt-1">
							Choose a category to organize your services
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Duration (minutes) *
							</label>
							<input
								type="number"
								required
								min="1"
								value={formData.duration}
								onChange={(e) =>
									setFormData({ ...formData, duration: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="60"
							/>
							<p className="text-xs text-gray-500 mt-1">
								Enter duration in minutes (e.g., 60 for 1 hour)
							</p>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Price ($) *
							</label>
							<input
								type="number"
								required
								min="0"
								step="0.01"
								value={formData.price}
								onChange={(e) =>
									setFormData({ ...formData, price: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="50.00"
							/>
							<p className="text-xs text-gray-500 mt-1">
								Enter price in dollars (e.g., 50.00)
							</p>
						</div>
					</div>

					<div className="flex gap-4 pt-4">
						<button
							type="button"
							onClick={() => router.back()}
							className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={createServiceMutation.isPending}
							className="flex-1 bg-[#ff5b5b] text-white px-4 py-2 rounded-md hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 disabled:opacity-50"
						>
							{createServiceMutation.isPending
								? 'Creating...'
								: 'Create Service'}
						</button>
					</div>
				</form>
			</div>

			{/* Create Category Modal */}
			<CreateCategoryModal
				isOpen={isCategoryModalOpen}
				onClose={() => setIsCategoryModalOpen(false)}
				salonId={salonId || ''}
				onSuccess={handleCategoryCreated}
			/>
		</div>
	);
}
