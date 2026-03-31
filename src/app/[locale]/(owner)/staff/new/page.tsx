'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOwnerLayout } from '@/contexts/OwnerLayoutContext';
import { useCreateStaff } from '@/hooks/useStaff';
import { useServices } from '@/hooks/useServices';
import { useTranslation } from '@/contexts/LanguageContext';
import ServiceSelector from '@/components/ServiceSelector';

export default function NewStaffPage() {
	const t = useTranslation();
	const [formData, setFormData] = useState({
		name: '',
		accessLevel: 'EMPLOYEE',
		email: '',
		phone: '',
	});
	const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
	const [error, setError] = useState('');
	const router = useRouter();

	// Используем данные салона из контекста (избегаем дублирования запросов)
	const { salonId, isLoading: salonLoading, hasSalon } = useOwnerLayout();

	// Load services for this salon
	const { data: services = [] } = useServices(salonId || '', {});
	// selectedServiceIds starts as empty array, which means "all services" by default

	// Хук для создания работника
	const createStaffMutation = useCreateStaff();

	// Перенаправляем на создание салона, если салон не найден
	if (!salonLoading && !hasSalon) {
		router.push('/salon-info');
		return null;
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		// Validate form
		if (!formData.name) {
			setError(t('owner.staffNew.fillRequiredFields'));
			return;
		}

		// Если salonId еще не загружен, показываем ошибку
		if (!salonId) {
			setError(t('owner.staffNew.loading'));
			return;
		}

		try {
			// Create staff member using mutation
			await createStaffMutation.mutateAsync({
				...formData,
				salonId,
				accessLevel: formData.accessLevel as 'ADMIN' | 'EMPLOYEE',
				serviceIds: selectedServiceIds.length > 0 ? selectedServiceIds : undefined,
			});

			// Redirect to staff page after successful creation
			setTimeout(() => {
				router.push('/staff');
			}, 100);
		} catch (err: unknown) {
			const errorMessage =
				err instanceof Error ? err.message : t('owner.staffNew.failedToCreate');
			setError(errorMessage);
		}
	};

	return (
		<div className="px-4 md:px-8 py-6 w-full max-w-7xl mx-auto">
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
					{t('owner.staffNew.back')}
				</button>
				<h1 className="text-2xl md:text-3xl font-bold text-gray-900 md:mb-2">
					{t('owner.staffNew.title')}
				</h1>
				<p className="text-sm md:text-base text-gray-600">
					{t('owner.staffNew.subtitle')}
				</p>
			</div>

			<div className="bg-white rounded-xl border border-[#f1d9d7] p-3 md:p-6">
				<form onSubmit={handleSubmit} className="space-y-6">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							{t('owner.staffNew.fullName')}
						</label>
						<input
							type="text"
							required
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
							placeholder={t('owner.staffNew.fullNamePlaceholder')}
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t('owner.staffNew.email')}
							</label>
							<input
								type="email"
								value={formData.email}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder={t('owner.staffNew.emailPlaceholder')}
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t('owner.staffNew.phone')}
							</label>
							<input
								type="tel"
								value={formData.phone}
								onChange={(e) =>
									setFormData({ ...formData, phone: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder={t('owner.staffNew.phonePlaceholder')}
							/>
						</div>
					</div>

					{services.length > 0 && (
						<ServiceSelector
							services={services}
							selectedServiceIds={selectedServiceIds}
							onChange={setSelectedServiceIds}
							helpText={t('owner.staffNew.servicesHelp')}
						/>
					)}

					{error && (
						<div className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-md p-3">
							{error}
						</div>
					)}

					<div className="flex flex-col sm:flex-row gap-4 pt-4">
						<button
							type="button"
							onClick={() => router.back()}
							className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
						>
							{t('owner.staffNew.cancel')}
						</button>
						<button
							type="submit"
							disabled={createStaffMutation.isPending || salonLoading || !salonId}
							className="flex-1 bg-[#ff5b5b] text-white px-4 py-2 rounded-md hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 disabled:opacity-50"
						>
							{createStaffMutation.isPending
								? t('owner.staffNew.adding')
								: salonLoading || !salonId
								? t('owner.staffNew.loading')
								: t('owner.staffNew.addStaffMember')}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
