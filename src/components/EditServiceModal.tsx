'use client';

import { useState, useEffect } from 'react';
import {
	useServices,
	useCreateService,
	useUpdateService,
} from '@/hooks/useServices';
import { useCategoriesBySalon, useCreateCategory } from '@/hooks/useCategories';
import { useSalonId } from '@/hooks/useSalon';
import CreateCategoryModal from './CreateCategoryModal';
import { Service, Category } from '@/types';

interface EditServiceModalProps {
	isOpen: boolean;
	onClose: () => void;
	service: Service | null;
	onSave: (service: Service) => void;
}

export default function EditServiceModal({
	isOpen,
	onClose,
	service,
	onSave,
}: EditServiceModalProps) {
	const [formData, setFormData] = useState({
		name: '',
		description: '',
		duration: 0,
		price: 0,
		categoryId: '',
	});
	const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

	// Используем оптимизированный хук для получения данных салона
	const { salonId } = useSalonId();

	const { data: categories = [] } = useCategoriesBySalon(salonId || '');
	const createServiceMutation = useCreateService();
	const updateServiceMutation = useUpdateService();
	const createCategoryMutation = useCreateCategory();

	useEffect(() => {
		if (service) {
			setFormData({
				name: service.name,
				description: service.description || '',
				duration: service.duration,
				price: service.price,
				categoryId: service.categoryId || '',
			});
		} else {
			setFormData({
				name: '',
				description: '',
				duration: 0,
				price: 0,
				categoryId: '',
			});
		}
	}, [service]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (
			!formData.name.trim() ||
			formData.duration <= 0 ||
			formData.price <= 0 ||
			!salonId
		) {
			return;
		}

		try {
			const serviceData = {
				name: formData.name.trim(),
				description: formData.description.trim() || undefined,
				duration: formData.duration,
				price: formData.price,
				salonId,
				categoryId: formData.categoryId || undefined,
			};

			if (service) {
				// Update existing service
				const updatedService = await updateServiceMutation.mutateAsync({
					id: service.id,
					data: serviceData,
				});
				onSave(updatedService);
			} else {
				// Create new service
				const newService = await createServiceMutation.mutateAsync(serviceData);
				onSave(newService);
			}

			onClose();
		} catch (error) {
			console.error('Failed to save service:', error);
		}
	};

	const handleCategoryCreated = (newCategory: Category) => {
		setFormData((prev) => ({
			...prev,
			categoryId: newCategory.id,
		}));
	};

	if (!isOpen) return null;

	return (
		<>
			<div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
				<div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
					<h2 className="text-xl font-bold text-gray-900 mb-4">
						{service ? 'Edit Service' : 'Add New Service'}
					</h2>

					<form onSubmit={handleSubmit}>
						<div className="mb-4">
							<label
								htmlFor="serviceName"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Service Name
							</label>
							<input
								type="text"
								id="serviceName"
								value={formData.name}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, name: e.target.value }))
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
								placeholder="e.g., Haircut, Manicure"
								required
							/>
						</div>

						<div className="mb-4">
							<label
								htmlFor="description"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Description
							</label>
							<textarea
								id="description"
								value={formData.description}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										description: e.target.value,
									}))
								}
								rows={3}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
								placeholder="Service description..."
							/>
						</div>

						<div className="mb-4">
							<label
								htmlFor="category"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Category
							</label>
							<div className="flex gap-2">
								<select
									id="category"
									value={formData.categoryId}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											categoryId: e.target.value,
										}))
									}
									className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
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
									className="px-3 py-2 bg-[#ff5b5b] text-white rounded-lg hover:bg-[#e04a4a] transition-colors"
									title="Add new category"
								>
									+
								</button>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4 mb-4">
							<div>
								<label
									htmlFor="duration"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Duration (minutes)
								</label>
								<input
									type="number"
									id="duration"
									value={formData.duration}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											duration: parseInt(e.target.value) || 0,
										}))
									}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
									min="1"
									required
								/>
							</div>
							<div>
								<label
									htmlFor="price"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Price ($)
								</label>
								<input
									type="number"
									id="price"
									value={formData.price}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											price: parseFloat(e.target.value) || 0,
										}))
									}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
									min="0"
									step="0.01"
									required
								/>
							</div>
						</div>

						<div className="flex justify-end gap-3">
							<button
								type="button"
								onClick={onClose}
								className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
								disabled={
									createServiceMutation.isPending ||
									updateServiceMutation.isPending
								}
							>
								Cancel
							</button>
							<button
								type="submit"
								className="px-4 py-2 bg-[#ff5b5b] text-white rounded-lg font-medium hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								disabled={
									createServiceMutation.isPending ||
									updateServiceMutation.isPending
								}
							>
								{createServiceMutation.isPending ||
								updateServiceMutation.isPending
									? 'Saving...'
									: service
										? 'Update Service'
										: 'Add Service'}
							</button>
						</div>
					</form>
				</div>
			</div>

			<CreateCategoryModal
				isOpen={isCategoryModalOpen}
				onClose={() => setIsCategoryModalOpen(false)}
				salonId={salonId || ''}
				onSuccess={handleCategoryCreated}
			/>
		</>
	);
}
