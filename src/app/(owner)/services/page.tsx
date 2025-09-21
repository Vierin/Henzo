'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import EditServiceModal from '@/components/EditServiceModal';
import { useServices, useDeleteService } from '@/hooks/useServices';
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
		if (minutes < 60) {
			return `${minutes}m`;
		}
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;
		return remainingMinutes > 0
			? `${hours}h ${remainingMinutes}m`
			: `${hours}h`;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	if (error) {
		return <ErrorDisplay error={error} onRetry={refetch} />;
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold text-gray-900 mb-2">Services</h1>
					<p className="text-gray-600">
						Manage your salon services, pricing, and availability
					</p>
				</div>
				<button
					onClick={() => router.push('/services/new')}
					className="bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
				>
					Add New Service
				</button>
			</div>

			{services.length === 0 ? (
				<div className="text-center py-12">
					<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<span className="text-2xl">💇‍♀️</span>
					</div>
					<h3 className="text-xl font-semibold text-gray-900 mb-2">
						No services yet
					</h3>
					<p className="text-gray-600 mb-6">
						Get started by adding your first service to your salon
					</p>
					<button
						onClick={() => router.push('/services/new')}
						className="bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
					>
						Add Your First Service
					</button>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{services.map((service) => (
						<div
							key={service.id}
							className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
						>
							<div className="flex items-start justify-between mb-4">
								<div>
									<h3 className="text-lg font-semibold text-gray-900 mb-1">
										{service.name}
									</h3>
									{service.category && (
										<span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
											{service.category.name}
										</span>
									)}
								</div>
								<div className="flex gap-2">
									<button
										onClick={() => handleEditService(service)}
										className="text-gray-400 hover:text-gray-600 transition-colors"
										title="Edit service"
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
												d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
											/>
										</svg>
									</button>
									<button
										onClick={() => handleDeleteService(service.id)}
										className="text-gray-400 hover:text-red-600 transition-colors"
										title="Delete service"
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
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											/>
										</svg>
									</button>
								</div>
							</div>

							{service.description && (
								<p className="text-gray-600 text-sm mb-4 line-clamp-2">
									{service.description}
								</p>
							)}

							<div className="flex items-center justify-between text-sm">
								<div className="flex items-center gap-4">
									<span className="text-gray-500">
										⏱️ {formatDuration(service.duration)}
									</span>
								</div>
								<span className="font-semibold text-gray-900">
									{formatPrice(service.price)}
								</span>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Edit Service Modal */}
			{selectedService && (
				<EditServiceModal
					isOpen={isEditModalOpen}
					onClose={() => {
						setIsEditModalOpen(false);
						setSelectedService(null);
					}}
					service={selectedService}
					onSuccess={handleSaveService}
				/>
			)}
		</div>
	);
}
