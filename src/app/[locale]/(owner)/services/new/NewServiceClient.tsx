'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateService } from '@/hooks/useServices';
import { STATIC_CATEGORIES } from '@/constants/categories';
import { useOwnerLayout } from '@/contexts/OwnerLayoutContext';
import { apiClient } from '@/lib/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/contexts/LanguageContext';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Validation schema factory
function createServiceSchema(t: any) {
	return z.object({
		name: z.string().min(1, t('owner.servicesNew.errors.serviceNameRequired')),
		description: z.string().optional(),
		duration: z
			.string()
			.min(1, t('owner.servicesNew.errors.durationRequired'))
			.refine(
				(val) => !isNaN(Number(val)) && Number(val) > 0,
				t('owner.servicesNew.errors.durationMustBePositive')
			),
		price: z
			.string()
			.min(1, t('owner.servicesNew.errors.priceRequired'))
			.refine((val) => {
				const num = Number(val.replace(/\D/g, ''));
				return !isNaN(num) && num > 0;
			}, t('owner.servicesNew.errors.priceMustBePositive')),
		serviceCategoryId: z.string().refine((val) => val && val !== 'none', {
			message: t('owner.servicesNew.errors.categoryRequired'),
		}),
		serviceGroupId: z.string().optional(),
	});
}

// Type for form data - defined inline to avoid initialization issues
type ServiceFormData = {
	name: string;
	description?: string;
	duration: string;
	price: string;
	serviceCategoryId: string;
	serviceGroupId?: string;
};

export default function NewServiceClient() {
	const t = useTranslation();
	const [step, setStep] = useState<1 | 2>(1);

	// Form with validation
	const {
		register,
		handleSubmit: handleFormSubmit,
		control,
		formState: { errors },
		getValues,
		setValue,
		watch,
	} = useForm<ServiceFormData>({
		resolver: zodResolver(createServiceSchema(t)),
		defaultValues: {
			name: '',
			description: '',
			duration: '',
			price: '',
			serviceCategoryId: 'none',
			serviceGroupId: 'none',
		},
	});

	// Watch form values for step 2 display
	const formValues = watch();

	// Keep formData for backward compatibility with step 2
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
	const router = useRouter();

	// Используем данные салона из контекста (избегаем дублирования запросов)
	const { salonId, isLoading: salonLoading, hasSalon } = useOwnerLayout();
	const queryClient = useQueryClient();

	const categories = STATIC_CATEGORIES;

	// Category translation mapping
	const categoryTranslationMap: Record<string, string> = {
		'hair-barber': 'hairBarber',
		'massage-spa': 'massageSpa',
		'manicure-pedicure': 'manicurePedicure',
		'cosmetic-medicine': 'cosmeticMedicine',
		'other-services': 'otherServices',
	};

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

	// Handle form submission for step 1
	const onSubmitStep1 = async (data: ServiceFormData) => {
		if (!salonId) return;

		// Update formData state for step 2
		setFormData({
			name: data.name,
			description: data.description || '',
			nameEn: '',
			nameVi: '',
			descriptionEn: '',
			descriptionVi: '',
			duration: data.duration,
			price: data.price.replace(/\D/g, ''),
			serviceCategoryId: data.serviceCategoryId,
			serviceGroupId: data.serviceGroupId || 'none',
		});

		// Generate translations and go to step 2
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
				name: data.name.trim(),
				description: data.description?.trim() || '',
			});
			setTranslations(generatedTranslations);
			setStep(2);
		} catch (err) {
			console.error('Failed to generate translations:', err);
			setStep(2);
		} finally {
			setIsGeneratingTranslations(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		// This will be called for step 2, validation already done in step 1
		if (step === 1) {
			handleFormSubmit(onSubmitStep1)();
			return;
		}

		// Step 2: Create service
		try {
			if (!salonId) {
				console.error('Salon ID is required');
				return;
			}

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
				salonId: salonId,
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
			<main
				role="main"
				className="px-0 md:px-4 max-w-7xl mx-auto"
				aria-labelledby="page-heading"
			>
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
						{t('owner.servicesNew.backToEdit')}
					</button>
					<h1
						id="page-heading"
						className="text-2xl md:text-3xl font-bold text-gray-900 md:mb-2"
					>
						{t('owner.servicesNew.confirmTitle')}
					</h1>
					<p className="text-sm md:text-base text-gray-600">
						{t('owner.servicesNew.confirmSubtitle')}
					</p>
				</div>

				<div className="bg-white rounded-xl border border-[#f1d9d7] p-3 md:p-6 space-y-6">
					{/* Service Name */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							{t('owner.servicesNew.serviceName')}
						</label>
						{translations && (
							<div className="mt-3 space-y-2">
								{translations.nameEn && (
									<div className="bg-blue-50 rounded-md p-2 border border-blue-200">
										<span className="text-xs text-gray-500">
											{t('owner.servicesNew.english')}{' '}
										</span>
										<span className="text-gray-700">{translations.nameEn}</span>
									</div>
								)}
								{translations.nameVi && (
									<div className="bg-green-50 rounded-md p-2 border border-green-200">
										<span className="text-xs text-gray-500">
											{t('owner.servicesNew.vietnamese')}{' '}
										</span>
										<span className="text-gray-700">{translations.nameVi}</span>
									</div>
								)}
								{translations.nameRu && (
									<div className="bg-purple-50 rounded-md p-2 border border-purple-200">
										<span className="text-xs text-gray-500">
											{t('owner.servicesNew.russian')}{' '}
										</span>
										<span className="text-gray-700">{translations.nameRu}</span>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Description */}
					{formData.description && (
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t('owner.servicesNew.description')}
							</label>
							{translations && (
								<div className="mt-3 space-y-2">
									{translations.descriptionEn && (
										<div className="bg-blue-50 rounded-md p-2 border border-blue-200">
											<span className="text-xs text-gray-500">
												{t('owner.servicesNew.english')}{' '}
											</span>
											<p className="text-gray-700 whitespace-pre-wrap">
												{translations.descriptionEn}
											</p>
										</div>
									)}
									{translations.descriptionVi && (
										<div className="bg-green-50 rounded-md p-2 border border-green-200">
											<span className="text-xs text-gray-500">
												{t('owner.servicesNew.vietnamese')}{' '}
											</span>
											<p className="text-gray-700 whitespace-pre-wrap">
												{translations.descriptionVi}
											</p>
										</div>
									)}
									{translations.descriptionRu && (
										<div className="bg-purple-50 rounded-md p-2 border border-purple-200">
											<span className="text-xs text-gray-500">
												{t('owner.servicesNew.russian')}{' '}
											</span>
											<p className="text-gray-700 whitespace-pre-wrap">
												{translations.descriptionRu}
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
								{t('owner.servicesNew.category')}
							</label>
							<div className="bg-gray-50 rounded-md p-3 border border-gray-200">
								<p className="text-gray-900">
									{selectedCategory
										? (() => {
												const translationKey =
													categoryTranslationMap[selectedCategory.slug];
												return translationKey
													? t.categories[translationKey]
													: selectedCategory.name;
											})()
										: t('owner.servicesNew.notSelected')}
								</p>
							</div>
						</div>
						{selectedGroup && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									{t('owner.servicesNew.serviceGroup')}
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
								{t('owner.servicesNew.duration')}
							</label>
							<div className="bg-gray-50 rounded-md p-3 border border-gray-200">
								<p className="text-gray-900">
									{formatDuration(formData.duration)}
								</p>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t('owner.servicesNew.price')}
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
							{t('owner.servicesNew.backToEdit')}
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
								? t('owner.servicesNew.creating')
								: t('owner.servicesNew.confirmCreate')}
						</button>
					</div>
				</div>
			</main>
		);
	}

	// Step 1: Form
	return (
		<main
			role="main"
			aria-labelledby="page-heading"
			className="px-0 md:px-4 max-w-7xl mx-auto"
		>
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
					{t('owner.servicesNew.back')}
				</button>
				<h1
					id="page-heading"
					className="text-2xl md:text-3xl font-bold text-gray-900 md:mb-2"
				>
					{t('owner.servicesNew.title')}
				</h1>
				<p className="text-sm md:text-base text-gray-600">
					{t('owner.servicesNew.subtitle')}
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
							{t('owner.servicesNew.serviceName')}
						</label>
						<input
							id="service-name"
							type="text"
							{...register('name')}
							className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] text-gray-900 ${
								errors.name
									? 'border-red-500 focus:border-red-500'
									: 'border-gray-300 focus:border-[#ff5b5b]'
							}`}
							placeholder={t('owner.servicesNew.serviceNamePlaceholder')}
							aria-describedby="service-name-help service-name-error"
							aria-invalid={!!errors.name}
						/>
						{errors.name && (
							<p
								id="service-name-error"
								className="mt-1 text-sm text-red-600"
								role="alert"
							>
								{errors.name.message}
							</p>
						)}
						<div id="service-name-help" className="sr-only">
							{t('owner.servicesNew.serviceNameHelp')}
						</div>
					</div>

					<div>
						<label
							htmlFor="service-description"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							{t('owner.servicesNew.description')}
						</label>
						<textarea
							id="service-description"
							rows={4}
							{...register('description')}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
							placeholder={t('owner.servicesNew.descriptionPlaceholder')}
							aria-describedby="service-description-help"
						/>
						<div id="service-description-help" className="sr-only">
							{t('owner.servicesNew.descriptionHelp')}
						</div>
					</div>

					{/* Service group (optional, always visible select + plus button) */}
					<div>
						<label
							htmlFor="service-group"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							{t('owner.servicesNew.serviceGroup')}
						</label>
						<div className="flex items-center gap-2">
							<Controller
								name="serviceGroupId"
								control={control}
								defaultValue="none"
								render={({ field }) => (
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger className="w-full border border-gray-300 focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900 text-sm">
											<SelectValue
												placeholder={t('owner.servicesNew.noGroup')}
											/>
										</SelectTrigger>
										<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
											<SelectItem
												value="none"
												className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer text-sm"
											>
												{t('owner.servicesNew.noGroup')}
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
								)}
							/>
							<button
								type="button"
								onClick={() => setIsGroupModalOpen(true)}
								className="px-3 py-2 bg-[#ff5b5b] text-white rounded-md hover:bg-[#e04a4a] text-sm"
								title={t('owner.servicesNew.addNewGroup')}
							>
								+
							</button>
						</div>
						<p className="text-xs text-gray-500 mt-1">
							{t('owner.servicesNew.serviceGroupHelp')}
						</p>
					</div>

					<div>
						<label
							htmlFor="service-category"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							{t('owner.servicesNew.category')}
						</label>
						<Controller
							name="serviceCategoryId"
							control={control}
							defaultValue="none"
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger
										className={`w-full border focus:ring-2 focus:ring-[#ff5b5b] text-gray-900 ${
											errors.serviceCategoryId
												? 'border-red-500 focus:border-red-500'
												: 'border-gray-300 focus:border-transparent'
										}`}
										aria-invalid={!!errors.serviceCategoryId}
									>
										<SelectValue
											placeholder={t('owner.servicesNew.selectCategory')}
										/>
									</SelectTrigger>
									<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
										{categories.map((category) => {
											const translationKey =
												categoryTranslationMap[category.slug];
											const translatedName = translationKey
												? t.categories[translationKey]
												: category.name;
											return (
												<SelectItem
													key={category.id}
													value={category.id.toString()}
													className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
												>
													{translatedName}
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
							)}
						/>
						{errors.serviceCategoryId && (
							<p
								id="service-category-error"
								className="mt-1 text-sm text-red-600"
								role="alert"
							>
								{errors.serviceCategoryId.message}
							</p>
						)}
						<p
							id="service-category-help"
							className="text-xs text-gray-500 mt-1"
						>
							{t('owner.servicesNew.categoryHelp')}
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label
								htmlFor="service-duration"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								{t('owner.servicesNew.duration')}
							</label>
							<input
								id="service-duration"
								type="number"
								min="1"
								{...register('duration')}
								className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] text-gray-900 ${
									errors.duration
										? 'border-red-500 focus:border-red-500'
										: 'border-gray-300 focus:border-[#ff5b5b]'
								}`}
								placeholder={t('owner.servicesNew.durationPlaceholder')}
								aria-describedby="service-duration-help service-duration-error"
								aria-invalid={!!errors.duration}
							/>
							{errors.duration && (
								<p
									id="service-duration-error"
									className="mt-1 text-sm text-red-600"
									role="alert"
								>
									{errors.duration.message}
								</p>
							)}
							<p
								id="service-duration-help"
								className="text-xs text-gray-500 mt-1"
							>
								{t('owner.servicesNew.durationHelp')}
							</p>
						</div>

						<div>
							<label
								htmlFor="service-price"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								{t('owner.servicesNew.price')}
							</label>
							<input
								id="service-price"
								type="text"
								{...register('price', {
									onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
										const value = e.target.value.replace(/\D/g, '');
										setValue('price', value, { shouldValidate: true });
									},
								})}
								className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] text-gray-900 ${
									errors.price
										? 'border-red-500 focus:border-red-500'
										: 'border-gray-300 focus:border-[#ff5b5b]'
								}`}
								placeholder={t('owner.servicesNew.pricePlaceholder')}
								aria-describedby="service-price-help service-price-error"
								aria-invalid={!!errors.price}
							/>
							{errors.price && (
								<p
									id="service-price-error"
									className="mt-1 text-sm text-red-600"
									role="alert"
								>
									{errors.price.message}
								</p>
							)}
							<p id="service-price-help" className="text-xs text-gray-500 mt-1">
								{t('owner.servicesNew.priceHelp')}
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
							aria-label={t('owner.servicesNew.cancel')}
						>
							{t('owner.servicesNew.cancel')}
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
								? t('owner.servicesNew.generatingTranslations')
								: createServiceMutation.isPending
									? t('owner.servicesNew.creating')
									: t('owner.servicesNew.continue')}
						</button>
						<div id="submit-status" className="sr-only" aria-live="polite">
							{createServiceMutation.isPending
								? t('owner.servicesNew.creatingService')
								: t('owner.servicesNew.readyToCreate')}
						</div>
					</div>
				</form>
			</div>

			{/* Add Group Modal */}
			{isGroupModalOpen && (
				<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-md">
						<h2 className="text-lg font-semibold text-gray-900 mb-3">
							{t('owner.servicesNew.addServiceGroup')}
						</h2>
						{groupModalStep === 'input' ? (
							<>
								<p className="text-sm text-gray-600 mb-3">
									{t('owner.servicesNew.addServiceGroupHelp')}
								</p>
								<input
									type="text"
									value={newGroupName}
									onChange={(e) => setNewGroupName(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900 text-sm mb-4"
									placeholder={t('owner.servicesNew.groupName')}
									autoFocus
								/>
								<div className="flex justify-end gap-2">
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
										{t('owner.servicesNew.cancel')}
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
										className="px-3 py-2 text-sm bg-[#ff5b5b] text-white rounded-md hover:bg-[#e04a4a] disabled:opacity-50"
									>
										{isGeneratingGroupTranslations
											? t('owner.servicesNew.generatingTranslations')
											: t('owner.servicesNew.continue')}
									</button>
								</div>
							</>
						) : (
							<>
								{/* Preview step with translations */}
								<div className="mb-4">
									<label className="block text-sm font-medium text-gray-700 mb-2">
										{t('owner.servicesNew.serviceName')}
									</label>
									<div className="bg-gray-50 rounded-md p-3 border border-gray-200">
										<p className="text-gray-900 font-semibold">
											{newGroupName}
										</p>
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
								</div>
								<div className="flex justify-end gap-2">
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
													setValue('serviceGroupId', created.id, {
														shouldValidate: false,
													});
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
										className="px-3 py-2 text-sm bg-[#ff5b5b] text-white rounded-md hover:bg-[#e04a4a]"
									>
										{t('owner.servicesNew.create')}
									</button>
								</div>
							</>
						)}
					</div>
				</div>
			)}
		</main>
	);
}
