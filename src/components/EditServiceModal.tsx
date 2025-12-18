'use client';

import { useState, useEffect, useMemo } from 'react';
import {
	useServices,
	useCreateService,
	useUpdateService,
} from '@/hooks/useServices';
import { useSalonId } from '@/hooks/useSalons';
import {
	Service,
	ServiceGroup,
	ServiceCategory,
	ServiceSubcategory,
} from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useLanguage, useTranslation } from '@/contexts/LanguageContext';

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
		nameEn: '',
		nameVi: '',
		descriptionEn: '',
		descriptionVi: '',
		duration: 0,
		price: 0,
		serviceCategoryId: 0,
		serviceSubcategoryId: 0,
		serviceGroupId: 'none',
	});
	const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
	const [newGroupName, setNewGroupName] = useState('');
	const queryClient = useQueryClient();
	const { language } = useLanguage();
	const t = useTranslation();

	// Используем оптимизированный хук для получения данных салона
	const { salonId } = useSalonId();

	const createServiceMutation = useCreateService();
	const updateServiceMutation = useUpdateService();

	// Load categories from API
	const { data: categories = [] } = useQuery<ServiceCategory[]>({
		queryKey: ['service-categories'],
		queryFn: async () => {
			return apiClient.get<ServiceCategory[]>('/services/categories');
		},
		staleTime: 10 * 60 * 1000,
	});

	// Load subcategories when category is selected
	const { data: subcategories = [] } = useQuery<ServiceSubcategory[]>({
		queryKey: ['service-subcategories', formData.serviceCategoryId],
		queryFn: async () => {
			if (!formData.serviceCategoryId) return [];
			const params = new URLSearchParams();
			params.append('categoryId', formData.serviceCategoryId.toString());
			return apiClient.get<ServiceSubcategory[]>(
				`/services/subcategories?${params.toString()}`
			);
		},
		enabled: !!formData.serviceCategoryId,
		staleTime: 10 * 60 * 1000,
	});


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

	useEffect(() => {
		if (service) {
			setFormData({
				name: service.name,
				description: service.description || '',
				nameEn: service.nameEn || '',
				nameVi: service.nameVi || '',
				descriptionEn: service.descriptionEn || '',
				descriptionVi: service.descriptionVi || '',
				duration: service.duration,
				price: service.price,
				serviceCategoryId: service.serviceCategoryId || 0,
				serviceSubcategoryId: service.serviceSubcategoryId || 0,
				serviceGroupId: service.serviceGroupId || 'none',
			});
		} else {
			setFormData({
				name: '',
				description: '',
				nameEn: '',
				nameVi: '',
				descriptionEn: '',
				descriptionVi: '',
				duration: 0,
				price: 0,
				serviceCategoryId: 0,
				serviceSubcategoryId: 0,
				serviceGroupId: 'none',
			});
		}
	}, [service]);

	// Reset subcategory when category changes
	useEffect(() => {
		if (formData.serviceCategoryId) {
			setFormData((prev) => ({ ...prev, serviceSubcategoryId: 0 }));
		}
	}, [formData.serviceCategoryId]);

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
			if (service) {
				// Update existing service - don't send salonId
				// Note: serviceSubcategoryId is not supported in update endpoint
				const updateData = {
					name: formData.name.trim(),
					description: formData.description.trim() || undefined,
					nameEn: formData.nameEn.trim() || undefined,
					nameVi: formData.nameVi.trim() || undefined,
					descriptionEn: formData.descriptionEn.trim() || undefined,
					descriptionVi: formData.descriptionVi.trim() || undefined,
					duration: formData.duration,
					price: formData.price,
					serviceCategoryId:
						formData.serviceCategoryId > 0
							? formData.serviceCategoryId
							: undefined,
					serviceGroupId:
						formData.serviceGroupId && formData.serviceGroupId !== 'none'
							? formData.serviceGroupId
							: undefined,
				};
				const updatedService = await updateServiceMutation.mutateAsync({
					id: service.id,
					data: updateData,
				});
				onSave(updatedService);
			} else {
				// Create new service - include salonId
				const createData = {
					name: formData.name.trim(),
					description: formData.description.trim() || undefined,
					nameEn: formData.nameEn.trim() || undefined,
					nameVi: formData.nameVi.trim() || undefined,
					descriptionEn: formData.descriptionEn.trim() || undefined,
					descriptionVi: formData.descriptionVi.trim() || undefined,
					duration: formData.duration,
					price: formData.price,
					salonId,
					serviceCategoryId:
						formData.serviceCategoryId > 0
							? formData.serviceCategoryId
							: undefined,
					serviceSubcategoryId:
						formData.serviceSubcategoryId > 0
							? formData.serviceSubcategoryId
							: undefined,
					serviceGroupId:
						formData.serviceGroupId && formData.serviceGroupId !== 'none'
							? formData.serviceGroupId
							: undefined,
				};
				const newService = await createServiceMutation.mutateAsync(createData);
				onSave(newService);
			}

			onClose();
		} catch (error) {
			console.error('Failed to save service:', error);
		}
	};

	if (!isOpen) return null;

	return (
		<>
			<div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
				<div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
					<h2 className="text-xl font-bold text-gray-900 mb-4">
						{service ? t('owner.services.editService') : t('owner.services.addNewService')}
					</h2>

					<form onSubmit={handleSubmit}>
						<div className="mb-4">
							<label
								htmlFor="serviceName"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								{t('owner.services.serviceNameLabel')}
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
								{t('owner.services.descriptionLabel')}
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
								{t('owner.services.categoryLabel')}
							</label>
							<select
								id="category"
								value={formData.serviceCategoryId}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										serviceCategoryId: Number(e.target.value),
										serviceSubcategoryId: 0,
									}))
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
							>
								<option value="0">Select a category</option>
								{categories.map((category) => {
									const name =
										language === 'ru'
											? category.name_ru || category.name_en
											: language === 'vi'
												? category.name_vn || category.name_en
												: category.name_en;
									return (
										<option key={category.id} value={category.id}>
											{name}
										</option>
									);
								})}
							</select>
						</div>

						{formData.serviceCategoryId > 0 && subcategories.length > 0 && (
							<div className="mb-4">
								<label
									htmlFor="subcategory"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Subcategory
								</label>
								<select
									id="subcategory"
									value={formData.serviceSubcategoryId}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											serviceSubcategoryId: Number(e.target.value),
										}))
									}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
								>
									<option value="0">Select a subcategory (optional)</option>
									{subcategories.map((subcat) => {
										const name =
											language === 'ru'
												? subcat.nameRu || subcat.nameEn
												: language === 'vi'
													? subcat.nameVi || subcat.nameEn
													: subcat.nameEn;
										return (
											<option key={subcat.id} value={subcat.id}>
												{name}
											</option>
										);
									})}
								</select>
							</div>
						)}

						<div className="mb-4">
							<label
								htmlFor="service-group"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								{t('owner.services.serviceGroupLabel')}
							</label>
							<div className="flex items-center gap-2">
								<Select
									value={formData.serviceGroupId}
									onValueChange={(value) =>
										setFormData((prev) => ({
											...prev,
											serviceGroupId: value,
										}))
									}
								>
									<SelectTrigger className="w-full border border-gray-300 focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900 text-sm">
										<SelectValue placeholder="No group" />
									</SelectTrigger>
									<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
										<SelectItem
											value="none"
											className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer text-sm"
										>
											No group
										</SelectItem>
										{groups.map((group) => (
											<SelectItem
												key={group.id}
												value={group.id}
												className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer text-sm"
											>
												{group.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<button
									type="button"
									onClick={() => setIsGroupModalOpen(true)}
									className="px-3 py-2 bg-[#ff5b5b] text-white rounded-lg hover:bg-[#e04a4a] transition-colors"
									title="Add new group"
								>
									+
								</button>
							</div>
							<p className="text-xs text-gray-500 mt-1">
								{t('owner.services.serviceGroupHint')}
							</p>
						</div>

						<div className="grid grid-cols-2 gap-4 mb-4">
							<div>
								<label
									htmlFor="duration"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									{t('owner.services.durationLabel')}
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
									{t('owner.services.priceLabel')}
								</label>
								<input
									type="text"
									id="price"
									value={formData.price}
									onChange={(e) => {
										const value = e.target.value.replace(/\D/g, '');
										setFormData((prev) => ({
											...prev,
											price: parseInt(value) || 0,
										}));
									}}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
									placeholder="50000"
									required
								/>
								<p className="text-xs text-gray-500 mt-1">
									{t('owner.services.priceHint')}
								</p>
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
								{t('owner.services.cancel')}
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
									? t('owner.services.saving')
									: service
										? t('owner.services.updateService')
										: t('owner.services.addService')}
							</button>
						</div>
					</form>
				</div>
			</div>

			{/* Add Group Modal */}
			{isGroupModalOpen && (
				<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
					<div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-sm">
						<h2 className="text-lg font-semibold text-gray-900 mb-3">
							Add Service Group
						</h2>
						<p className="text-sm text-gray-600 mb-3">
							Create a group to organize your services (e.g., "Hair services",
							"Nails").
						</p>
						<input
							type="text"
							value={newGroupName}
							onChange={(e) => setNewGroupName(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900 text-sm mb-4"
							placeholder="Group name"
							autoFocus
						/>
						<div className="flex justify-end gap-2">
							<button
								type="button"
								onClick={() => {
									setIsGroupModalOpen(false);
									setNewGroupName('');
								}}
								className="px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={async () => {
									if (!salonId) return;
									const name = newGroupName.trim();
									if (!name) return;
									try {
										const created = await apiClient.post<any>(
											'/services/groups',
											{
												salonId,
												name,
											}
										);
										queryClient.invalidateQueries({
											queryKey: ['service-groups', salonId],
										});
										if (created?.id) {
											setFormData((prev) => ({
												...prev,
												serviceGroupId: created.id,
											}));
										}
										setIsGroupModalOpen(false);
										setNewGroupName('');
									} catch (err) {
										console.error('Failed to create service group:', err);
									}
								}}
								className="px-3 py-2 text-sm bg-[#ff5b5b] text-white rounded-md hover:bg-[#e04a4a]"
							>
								Create
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
