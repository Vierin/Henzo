'use client';

import { useState, useEffect, useMemo } from 'react';
import {
	useServices,
	useCreateService,
	useUpdateService,
} from '@/hooks/useServices';
import { useSalonId } from '@/hooks/useSalons';
import { useStaffBySalon } from '@/hooks/useStaff';
import StaffSelector from './StaffSelector';
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
import CategoryAutocomplete from '@/components/CategoryAutocomplete';

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
	const [groupTranslations, setGroupTranslations] = useState<{
		nameEn: string;
		nameVi: string;
		nameRu: string;
	} | null>(null);
	const [isGeneratingGroupTranslations, setIsGeneratingGroupTranslations] =
		useState(false);
	const [groupModalStep, setGroupModalStep] = useState<'input' | 'preview'>(
		'input'
	);
	const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
	const queryClient = useQueryClient();
	const { language } = useLanguage();
	const t = useTranslation();

	// Используем оптимизированный хук для получения данных салона
	const { salonId } = useSalonId();

	// Load staff for this salon
	const { data: staffMembers = [] } = useStaffBySalon(salonId || '');

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
			// Get serviceGroupId from serviceGroup object if available, otherwise use serviceGroupId field
			const serviceGroupObj = (service as any).serviceGroup;
			const groupIdFromObject = serviceGroupObj?.id;
			const groupIdFromField = service.serviceGroupId;

			const finalGroupId =
				(groupIdFromObject || groupIdFromField) &&
				(groupIdFromObject || groupIdFromField).toString().trim() !== ''
					? (groupIdFromObject || groupIdFromField).toString()
					: 'none';

			// Get serviceCategoryId from service_categories object if available, otherwise use serviceCategoryId field
			const serviceCategoriesObj = (service as any).service_categories;
			const categoryIdFromObject = serviceCategoriesObj?.id;
			const categoryIdFromField = service.serviceCategoryId;

			const finalCategoryId = categoryIdFromObject || categoryIdFromField || 0;

			// Set selected staff IDs from service.Staff array
			// If Staff is empty or undefined, it means "all staff" (empty array)
			const serviceStaff = (service as any).Staff || [];
			// If service has no staff assigned, it means all staff (empty array)
			// If service has specific staff, use their IDs
			setSelectedStaffIds(serviceStaff.length > 0 ? serviceStaff.map((staff: any) => staff.id) : []);

			setFormData({
				name: service.name,
				description: service.description || '',
				nameEn: service.nameEn || '',
				nameVi: service.nameVi || '',
				descriptionEn: service.descriptionEn || '',
				descriptionVi: service.descriptionVi || '',
				duration: service.duration,
				price: service.price,
				serviceCategoryId: finalCategoryId,
				serviceSubcategoryId: service.serviceSubcategoryId || 0,
				serviceGroupId: finalGroupId,
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

	// Update serviceGroupId when groups are loaded and service has a group
	useEffect(() => {
		if (service && groups.length > 0) {
			const serviceGroupObj = (service as any).serviceGroup;
			const groupIdFromObject = serviceGroupObj?.id;
			const groupIdFromField = service.serviceGroupId;
			const finalGroupId =
				(groupIdFromObject || groupIdFromField) &&
				(groupIdFromObject || groupIdFromField).toString().trim() !== ''
					? (groupIdFromObject || groupIdFromField).toString()
					: 'none';

			// Only update if the value is different and valid
			if (
				finalGroupId !== 'none' &&
				groups.some((g) => g.id === finalGroupId)
			) {
				setFormData((prev) => {
					if (prev.serviceGroupId !== finalGroupId) {
						return { ...prev, serviceGroupId: finalGroupId };
					}
					return prev;
				});
			}
		}
	}, [service, groups]);

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
					staffIds: selectedStaffIds.length > 0 ? selectedStaffIds : undefined,
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
					staffIds: selectedStaffIds.length > 0 ? selectedStaffIds : undefined,
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
			<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
				<div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
					<h2 className="text-xl font-bold text-gray-900 mb-4">
						{service
							? t('owner.services.editService')
							: t('owner.services.addNewService')}
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
							<CategoryAutocomplete
								value={
									formData.serviceCategoryId > 0 &&
									categories.some((c) => c.id === formData.serviceCategoryId)
										? formData.serviceCategoryId
										: undefined
								}
								onChange={(categoryId) => {
									setFormData((prev) => ({
										...prev,
										serviceCategoryId: categoryId || 0,
										serviceSubcategoryId: 0,
									}));
								}}
								categories={categories}
								placeholder={t('owner.services.selectCategory')}
							/>
						</div>

						{formData.serviceCategoryId > 0 && subcategories.length > 0 && (
							<div className="mb-4">
								<label
									htmlFor="subcategory"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Subcategory
								</label>
								<Select
									value={formData.serviceSubcategoryId.toString()}
									onValueChange={(value) =>
										setFormData((prev) => ({
											...prev,
											serviceSubcategoryId: Number(value),
										}))
									}
								>
									<SelectTrigger className="w-full border border-gray-300 focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900 text-sm">
										<SelectValue placeholder="Select a subcategory (optional)" />
									</SelectTrigger>
									<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
										<SelectItem
											value="0"
											className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer text-sm"
										>
											Select a subcategory (optional)
										</SelectItem>
										{subcategories.map((subcat) => {
											const name =
												language === 'ru'
													? subcat.nameRu || subcat.nameEn
													: language === 'vi'
														? subcat.nameVi || subcat.nameEn
														: subcat.nameEn;
											return (
												<SelectItem
													key={subcat.id}
													value={subcat.id.toString()}
													className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer text-sm"
												>
													{name}
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
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
									key={`service-group-${service?.id || 'new'}-${formData.serviceGroupId}`}
									value={
										formData.serviceGroupId &&
										formData.serviceGroupId !== '' &&
										formData.serviceGroupId !== 'none' &&
										groups.some((g) => g.id === formData.serviceGroupId)
											? formData.serviceGroupId
											: 'none'
									}
									onValueChange={(value) => {
										setFormData((prev) => ({
											...prev,
											serviceGroupId: value || 'none',
										}));
									}}
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
									className="px-3 py-2 bg-[#ff5b5b] !text-white rounded-lg hover:bg-[#e04a4a] transition-colors"
									title="Add new group"
								>
									+
								</button>
							</div>
							<p className="text-xs text-gray-500 mt-1">
								{t('owner.services.serviceGroupHint')}
							</p>
						</div>

						<StaffSelector
							staffMembers={staffMembers}
							selectedStaffIds={selectedStaffIds}
							onChange={setSelectedStaffIds}
							label={t('owner.services.staff')}
							helpText={t('owner.services.staffHelp')}
							optional={true}
						/>

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
								className="px-4 py-2 bg-[#ff5b5b] !text-white rounded-lg font-medium hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
							{t('owner.services.addServiceGroup')}
						</h2>
						{groupModalStep === 'input' ? (
							<>
								<p className="text-sm text-gray-600 mb-3">
									{t('owner.services.addServiceGroupHelp')}
								</p>
								<input
									type="text"
									value={newGroupName}
									onChange={(e) => setNewGroupName(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900 text-sm mb-4"
									placeholder={t('owner.services.groupName')}
									autoFocus
								/>
								<div className="flex justify-end gap-2 mt-2">
									<button
										type="button"
										onClick={() => {
											setIsGroupModalOpen(false);
											setNewGroupName('');
											setGroupTranslations(null);
											setGroupModalStep('input');
										}}
										className="px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
									>
										{t('owner.services.cancel')}
									</button>
									<button
										type="button"
										onClick={async () => {
											const name = newGroupName.trim();
											if (!name) return;
											setIsGeneratingGroupTranslations(true);
											try {
												// Generate translations using the same API as services
												const generatedTranslations = await apiClient.post<{
													nameEn: string;
													nameVi: string;
													nameRu: string;
												}>('/services/translate', {
													name: name,
													description: '',
												});
												setGroupTranslations({
													nameEn: generatedTranslations.nameEn,
													nameVi: generatedTranslations.nameVi,
													nameRu: generatedTranslations.nameRu,
												});
												setGroupModalStep('preview');
											} catch (err) {
												console.error('Failed to generate translations:', err);
												// Continue to preview even if translation fails
												setGroupModalStep('preview');
											} finally {
												setIsGeneratingGroupTranslations(false);
											}
										}}
										disabled={
											!newGroupName.trim() || isGeneratingGroupTranslations
										}
										className="px-3 py-2 text-sm bg-[#ff5b5b] !text-white rounded-md hover:bg-[#e04a4a] disabled:opacity-50"
									>
										{isGeneratingGroupTranslations
											? t('owner.servicesNew.generatingTranslations')
											: t('owner.servicesNew.continue')}
									</button>
								</div>
							</>
						) : (
							<>
								<div className="mb-3">
									<p className="text-sm text-gray-600 mb-2">
										{t('owner.servicesNew.groupName')}:
									</p>
									<p className="text-gray-900 font-medium">{newGroupName}</p>
								</div>
								{groupTranslations && (
									<div className="mt-3 space-y-2">
										{groupTranslations.nameEn && (
											<div className="bg-blue-50 rounded-md p-2 border border-blue-200">
												<span className="text-xs text-gray-500">
													{t('owner.servicesNew.english')}{' '}
												</span>
												<span className="text-gray-700">
													{groupTranslations.nameEn}
												</span>
											</div>
										)}
										{groupTranslations.nameVi && (
											<div className="bg-green-50 rounded-md p-2 border border-green-200">
												<span className="text-xs text-gray-500">
													{t('owner.servicesNew.vietnamese')}{' '}
												</span>
												<span className="text-gray-700">
													{groupTranslations.nameVi}
												</span>
											</div>
										)}
										{groupTranslations.nameRu && (
											<div className="bg-purple-50 rounded-md p-2 border border-purple-200">
												<span className="text-xs text-gray-500">
													{t('owner.servicesNew.russian')}{' '}
												</span>
												<span className="text-gray-700">
													{groupTranslations.nameRu}
												</span>
											</div>
										)}
									</div>
								)}
								<div className="flex justify-end gap-2 mt-4">
									<button
										type="button"
										onClick={() => {
											setGroupModalStep('input');
											setGroupTranslations(null);
										}}
										className="px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
									>
										{t('owner.servicesNew.backToEdit')}
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
														nameEn: groupTranslations?.nameEn,
														nameVi: groupTranslations?.nameVi,
														nameRu: groupTranslations?.nameRu,
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
												setGroupTranslations(null);
												setGroupModalStep('input');
											} catch (err) {
												console.error('Failed to create service group:', err);
											}
										}}
										className="px-3 py-2 text-sm bg-[#ff5b5b] !text-white rounded-md hover:bg-[#e04a4a]"
									>
										{t('owner.services.create')}
									</button>
								</div>
							</>
						)}
					</div>
				</div>
			)}
		</>
	);
}
