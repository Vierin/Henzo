'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateService } from '@/hooks/useServices';
import { STATIC_CATEGORIES } from '@/constants/categories';
import { useSalonId } from '@/hooks/useSalon';
import { apiClient } from '@/lib/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

export default function NewServiceClient() {
	const [step, setStep] = useState<1 | 2>(1);
	const [formData, setFormData] = useState({
		name: '',
		description: '',
		nameEn: '',
		nameVi: '',
		descriptionEn: '',
		descriptionVi: '',
		duration: '',
		price: '',
		serviceCategoryId: 'none',
		serviceGroupId: 'none',
	});
	const [translations, setTranslations] = useState<{
		nameEn: string;
		nameVi: string;
		nameRu: string;
		descriptionEn: string;
		descriptionVi: string;
		descriptionRu: string;
	} | null>(null);
	const [isGeneratingTranslations, setIsGeneratingTranslations] =
		useState(false);
	const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
	const [newGroupName, setNewGroupName] = useState('');
	const router = useRouter();

	// Используем оптимизированный хук для получения данных салона
	const { salonId, isLoading: salonLoading, hasSalon } = useSalonId();
	const queryClient = useQueryClient();

	const categories = STATIC_CATEGORIES;

	// Load service groups for this salon
	const { data: groups = [] } = useQuery({
		queryKey: ['service-groups', salonId],
		queryFn: async () => {
			if (!salonId) return [];
			const params = new URLSearchParams();
			params.append('salonId', salonId);
			return apiClient.get<any[]>(
				`/services/groups/by-salon?${params.toString()}`
			);
		},
		enabled: !!salonId,
		staleTime: 5 * 60 * 1000,
	});
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

		// Require category
		if (!formData.serviceCategoryId || formData.serviceCategoryId === 'none') {
			return;
		}

		if (isNaN(Number(formData.duration)) || Number(formData.duration) <= 0) {
			return;
		}

		if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
			return;
		}

		// Step 1: Generate translations and go to step 2
		if (step === 1) {
			setIsGeneratingTranslations(true);
			try {
				const generatedTranslations = await apiClient.post<{
					nameEn: string;
					nameVi: string;
					nameRu: string;
					descriptionEn: string;
					descriptionVi: string;
					descriptionRu: string;
				}>('/services/translate', {
					name: formData.name.trim(),
					description: formData.description.trim() || '',
					sourceLanguage: 'ru', // Assuming Russian is default
				});
				setTranslations(generatedTranslations);
				setStep(2);
			} catch (err) {
				console.error('Failed to generate translations:', err);
				// Continue to step 2 even if translation fails
				setStep(2);
			} finally {
				setIsGeneratingTranslations(false);
			}
			return;
		}

		// Step 2: Create service
		try {
			await createServiceMutation.mutateAsync({
				name: formData.name.trim(),
				description: formData.description.trim() || undefined,
				nameEn: translations?.nameEn || formData.nameEn.trim() || undefined,
				nameVi: translations?.nameVi || formData.nameVi.trim() || undefined,
				nameRu: translations?.nameRu || formData.name.trim() || undefined,
				descriptionEn:
					translations?.descriptionEn ||
					formData.descriptionEn.trim() ||
					undefined,
				descriptionVi:
					translations?.descriptionVi ||
					formData.descriptionVi.trim() ||
					undefined,
				descriptionRu:
					translations?.descriptionRu ||
					formData.description.trim() ||
					undefined,
				duration: Number(formData.duration),
				price: Number(formData.price),
				salonId,
				serviceCategoryId:
					formData.serviceCategoryId && formData.serviceCategoryId !== 'none'
						? Number(formData.serviceCategoryId)
						: undefined,
				serviceGroupId:
					formData.serviceGroupId && formData.serviceGroupId !== 'none'
						? formData.serviceGroupId
						: undefined,
			});

			// Wait a bit for cache invalidation, then redirect
			setTimeout(() => {
				router.push('/services');
			}, 100);
		} catch (err: unknown) {
			console.error('Failed to create service:', err);
		}
	};

	// Показываем загрузку пока не получили salonId
	if (salonLoading) {
		return (
			<div
				className="flex items-center justify-center min-h-screen"
				role="status"
				aria-live="polite"
			>
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

	const selectedCategory = categories.find(
		(cat) => cat.id.toString() === formData.serviceCategoryId
	);
	const selectedGroup = groups.find(
		(group: any) => group.id === formData.serviceGroupId
	);

	const formatVND = (value: string | number) => {
		const num = typeof value === 'string' ? Number(value) : value;
		return new Intl.NumberFormat('vi-VN', {
			style: 'currency',
			currency: 'VND',
		}).format(num);
	};

	const formatDuration = (minutes: string | number) => {
		const mins = typeof minutes === 'string' ? Number(minutes) : minutes;
		const hours = Math.floor(mins / 60);
		const remainingMins = mins % 60;
		if (hours > 0) {
			return `${hours}h ${remainingMins > 0 ? `${remainingMins}m` : ''}`;
		}
		return `${mins}m`;
	};

	// Step 2: Confirmation screen
	if (step === 2) {
		return (
			<main role="main" aria-labelledby="page-heading">
				<div className="mb-8">
					<button
						onClick={() => setStep(1)}
						className="flex items-center gap-2 text-[#6b6b6b] hover:text-black mb-4 focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 rounded"
						aria-label="Go back to edit"
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
								d="M15 19l-7-7 7-7"
							/>
						</svg>
						Back to Edit
					</button>
					<h1
						id="page-heading"
						className="text-2xl md:text-3xl font-bold text-gray-900 md:mb-2"
					>
						Confirm Service Details
					</h1>
					<p className="text-sm md:text-base text-gray-600">
						Please review the service information and translations before
						creating.
					</p>
				</div>

				<div className="bg-white rounded-xl border border-[#f1d9d7] p-3 md:p-6 space-y-6">
					{/* Service Name */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Service Name
						</label>
						<div className="bg-gray-50 rounded-md p-3 border border-gray-200">
							<p className="text-gray-900 font-medium">{formData.name}</p>
						</div>
						{translations && (
							<div className="mt-3 space-y-2">
								<div className="text-xs text-gray-500">Translations:</div>
								{translations.nameEn && (
									<div className="bg-blue-50 rounded-md p-2 border border-blue-200">
										<span className="text-xs text-gray-500">English: </span>
										<span className="text-gray-700">{translations.nameEn}</span>
									</div>
								)}
								{translations.nameVi && (
									<div className="bg-green-50 rounded-md p-2 border border-green-200">
										<span className="text-xs text-gray-500">Tiếng Việt: </span>
										<span className="text-gray-700">{translations.nameVi}</span>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Description */}
					{formData.description && (
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Description
							</label>
							<div className="bg-gray-50 rounded-md p-3 border border-gray-200">
								<p className="text-gray-900 whitespace-pre-wrap">
									{formData.description}
								</p>
							</div>
							{translations && (
								<div className="mt-3 space-y-2">
									<div className="text-xs text-gray-500">Translations:</div>
									{translations.descriptionEn && (
										<div className="bg-blue-50 rounded-md p-2 border border-blue-200">
											<span className="text-xs text-gray-500">English: </span>
											<p className="text-gray-700 whitespace-pre-wrap">
												{translations.descriptionEn}
											</p>
										</div>
									)}
									{translations.descriptionVi && (
										<div className="bg-green-50 rounded-md p-2 border border-green-200">
											<span className="text-xs text-gray-500">
												Tiếng Việt:{' '}
											</span>
											<p className="text-gray-700 whitespace-pre-wrap">
												{translations.descriptionVi}
											</p>
										</div>
									)}
								</div>
							)}
						</div>
					)}

					{/* Category and Group */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Category
							</label>
							<div className="bg-gray-50 rounded-md p-3 border border-gray-200">
								<p className="text-gray-900">
									{selectedCategory?.name || 'Not selected'}
								</p>
							</div>
						</div>
						{selectedGroup && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Group
								</label>
								<div className="bg-gray-50 rounded-md p-3 border border-gray-200">
									<p className="text-gray-900">{selectedGroup.name}</p>
								</div>
							</div>
						)}
					</div>

					{/* Duration and Price */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Duration
							</label>
							<div className="bg-gray-50 rounded-md p-3 border border-gray-200">
								<p className="text-gray-900">
									{formatDuration(formData.duration)}
								</p>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Price
							</label>
							<div className="bg-gray-50 rounded-md p-3 border border-gray-200">
								<p className="text-gray-900 font-semibold text-[#ff5b5b]">
									{formatVND(formData.price)}
								</p>
							</div>
						</div>
					</div>

					{/* Actions */}
					<div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200">
						<button
							type="button"
							onClick={() => setStep(1)}
							className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
						>
							Back to Edit
						</button>
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								handleSubmit(e as any);
							}}
							disabled={createServiceMutation.isPending}
							className="flex-1 bg-[#ff5b5b] text-white px-4 py-2 rounded-md hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 disabled:opacity-50"
						>
							{createServiceMutation.isPending
								? 'Creating...'
								: 'Confirm & Create Service'}
						</button>
					</div>
				</div>
			</main>
		);
	}

	// Step 1: Form
	return (
		<main role="main" aria-labelledby="page-heading">
			<div className="mb-8">
				<button
					onClick={() => router.back()}
					className="flex items-center gap-2 text-[#6b6b6b] hover:text-black mb-4 focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 rounded"
					aria-label="Go back to previous page"
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
							d="M15 19l-7-7 7-7"
						/>
					</svg>
					Back
				</button>
				<h1
					id="page-heading"
					className="text-2xl md:text-3xl font-bold text-gray-900 md:mb-2"
				>
					Add New Service
				</h1>
				<p className="text-sm md:text-base text-gray-600">
					Create a new service for your salon with pricing and duration details.
				</p>
			</div>

			<div className="bg-white rounded-xl border border-[#f1d9d7] p-3 md:p-6">
				<form
					onSubmit={handleSubmit}
					className="space-y-6"
					role="form"
					aria-labelledby="page-heading"
				>
					<div>
						<label
							htmlFor="service-name"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Service Name *
						</label>
						<input
							id="service-name"
							type="text"
							required
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
							placeholder="e.g., Haircut, Manicure, Facial"
							aria-describedby="service-name-help"
						/>
						<div id="service-name-help" className="sr-only">
							Enter the name of the service you want to create
						</div>
					</div>

					<div>
						<label
							htmlFor="service-description"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Description
						</label>
						<textarea
							id="service-description"
							rows={4}
							value={formData.description}
							onChange={(e) =>
								setFormData({ ...formData, description: e.target.value })
							}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
							placeholder="Describe what this service includes..."
							aria-describedby="service-description-help"
						/>
						<div id="service-description-help" className="sr-only">
							Optional description of what the service includes
						</div>
					</div>

					{/* Service group (optional, always visible select + plus button) */}
					<div>
						<label
							htmlFor="service-group"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Service Group (optional)
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
									{groups.map((group: any) => (
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
								className="px-3 py-2 bg-[#ff5b5b] text-white rounded-md hover:bg-[#e04a4a] text-sm"
								title="Add new group"
							>
								+
							</button>
						</div>
						<p className="text-xs text-gray-500 mt-1">
							Use groups to structure your services on the salon page.
						</p>
					</div>

					<div>
						<label
							htmlFor="service-category"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Category *
						</label>
						<Select
							value={formData.serviceCategoryId}
							onValueChange={(value) =>
								setFormData({
									...formData,
									serviceCategoryId: value,
								})
							}
						>
							<SelectTrigger className="w-full border border-gray-300 focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900">
								<SelectValue placeholder="Select a category" />
							</SelectTrigger>
							<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
								{categories.map((category) => (
									<SelectItem
										key={category.id}
										value={category.id.toString()}
										className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
									>
										{category.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p
							id="service-category-help"
							className="text-xs text-gray-500 mt-1"
						>
							Choose a category to organize your services
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label
								htmlFor="service-duration"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Duration (minutes) *
							</label>
							<input
								id="service-duration"
								type="number"
								required
								min="1"
								value={formData.duration}
								onChange={(e) =>
									setFormData({ ...formData, duration: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="60"
								aria-describedby="service-duration-help"
							/>
							<p
								id="service-duration-help"
								className="text-xs text-gray-500 mt-1"
							>
								Enter duration in minutes (e.g., 60 for 1 hour)
							</p>
						</div>

						<div>
							<label
								htmlFor="service-price"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Price (₫) *
							</label>
							<input
								id="service-price"
								type="text"
								required
								value={formData.price}
								onChange={(e) => {
									const value = e.target.value.replace(/\D/g, '');
									setFormData({ ...formData, price: value });
								}}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="50000"
								aria-describedby="service-price-help"
							/>
							<p id="service-price-help" className="text-xs text-gray-500 mt-1">
								Enter price in Vietnamese Dong (numbers only, e.g., 50000)
							</p>
						</div>
					</div>

					<div
						className="flex flex-col sm:flex-row gap-4 pt-4"
						role="group"
						aria-label="Form actions"
					>
						<button
							type="button"
							onClick={() => router.back()}
							className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
							aria-label="Cancel and go back"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={
								createServiceMutation.isPending || isGeneratingTranslations
							}
							className="flex-1 bg-[#ff5b5b] text-white px-4 py-2 rounded-md hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 disabled:opacity-50"
							aria-describedby="submit-status"
						>
							{isGeneratingTranslations
								? 'Generating translations...'
								: createServiceMutation.isPending
									? 'Creating...'
									: 'Continue'}
						</button>
						<div id="submit-status" className="sr-only" aria-live="polite">
							{createServiceMutation.isPending
								? 'Creating service...'
								: 'Ready to create service'}
						</div>
					</div>
				</form>
			</div>

			{/* Add Group Modal */}
			{isGroupModalOpen && (
				<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-sm">
						<h2 className="text-lg font-semibold text-gray-900 mb-3">
							Add Service Group
						</h2>
						<p className="text-sm text-gray-600 mb-3">
							Create a group to organize your services (e.g., “Hair services”,
							“Nails”).
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
		</main>
	);
}
