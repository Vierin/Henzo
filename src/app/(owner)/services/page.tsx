'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import EditServiceModal from '@/components/EditServiceModal';
import { useServices, useDeleteService } from '@/hooks/useServices';
import { useCategoriesBySalon } from '@/hooks/useCategories';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import { Service } from '@/types';

export default function ServicesPage() {
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<Service | null>(null);
	const router = useRouter();

	// Временное решение - используем salonId = "1" для тестирования
	// В реальном приложении это должно браться из контекста пользователя
	const salonId = '1';

	const {
		data: services = [],
		isLoading: loading,
		error,
		refetch,
	} = useServices(salonId);

	const { data: categories = [] } = useCategoriesBySalon(salonId);
	const deleteServiceMutation = useDeleteService();

	const handleEditService = (service: Service) => {
		setSelectedService(service);
		setIsEditModalOpen(true);
	};

	const handleDeleteService = async (serviceId: string) => {
		if (!confirm('Are you sure you want to delete this service?')) return;
		deleteServiceMutation.mutate(serviceId);
	};

	const handleSaveService = (updatedService: Service) => {
		refetch(); // Обновляем данные после изменения
	};

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(price);
	};

	const formatDuration = (minutes: number) => {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 0) {
			return `${hours}h ${mins}m`;
		}
		return `${mins}m`;
	};

	const getCategoryName = (categoryId?: string) => {
		if (!categoryId) return null;
		const category = categories.find((cat) => cat.id === categoryId);
		return category?.name || null;
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-[#fff7f6] flex items-center justify-center">
				<LoadingSpinner />
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-[#fff7f6] flex items-center justify-center">
				<ErrorDisplay
					error={
						error instanceof Error ? error : new Error('An error occurred')
					}
					onRetry={refetch}
				/>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-8">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-black mb-2">Services</h1>
						<p className="text-gray-800">
							Manage your salon services and pricing
						</p>
					</div>
					<button
						onClick={() => router.push('/services/new')}
						className="inline-flex items-center gap-2 rounded-full bg-[#ff5b5b] text-white px-4 py-2 text-sm shadow-sm hover:opacity-95"
					>
						<span className="text-lg leading-none">＋</span>
						Add New Service
					</button>
				</div>
			</div>

			{services.length === 0 ? (
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
								d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
							/>
						</svg>
					</div>
					<h3 className="text-lg font-semibold text-gray-900 mb-2">
						No services yet
					</h3>
					<p className="text-gray-600 mb-6">
						Start by adding your first service to your salon
					</p>
					<button
						onClick={() => router.push('/services/new')}
						className="inline-flex items-center gap-2 bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
					>
						<span className="text-lg">＋</span>
						Add Your First Service
					</button>
				</div>
			) : (
				<div className="bg-white rounded-xl border border-[#f1d9d7] overflow-hidden">
					<div className="grid grid-cols-5 px-6 py-3 text-[13px] text-gray-700 bg-[#fff2f1] font-semibold">
						<div>Service Name</div>
						<div>Category</div>
						<div>Duration</div>
						<div>Price</div>
						<div>Actions</div>
					</div>
					<div className="divide-y divide-[#f1d9d7]">
						{services.map((service) => (
							<div
								key={service.id}
								className="grid grid-cols-5 px-6 py-4 text-[15px] text-gray-800"
							>
								<div className="font-semibold">{service.name}</div>
								<div className="text-gray-600">
									{getCategoryName(service.categoryId) ? (
										<span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
											{getCategoryName(service.categoryId)}
										</span>
									) : (
										<span className="text-gray-400 italic">No category</span>
									)}
								</div>
								<div>{formatDuration(service.duration)}</div>
								<div className="font-semibold text-[#ff5b5b]">
									{formatPrice(service.price)}
								</div>
								<div className="flex gap-2">
									<button
										onClick={() => handleEditService(service)}
										className="text-[#ff5b5b] hover:text-[#e04a4a] text-sm font-medium"
									>
										Edit
									</button>
									<button
										onClick={() => handleDeleteService(service.id)}
										className="text-red-600 hover:text-red-700 text-sm font-medium"
									>
										Delete
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Edit Service Modal */}
			<EditServiceModal
				isOpen={isEditModalOpen}
				onClose={() => {
					setIsEditModalOpen(false);
					setSelectedService(null);
				}}
				service={selectedService}
				onSave={handleSaveService}
			/>
		</div>
	);
}
