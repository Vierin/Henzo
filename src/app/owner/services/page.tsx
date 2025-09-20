'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import EditServiceModal from '../../../components/EditServiceModal';

interface Service {
	id: string;
	name: string;
	description: string;
	duration: number;
	price: number;
	createdAt: string;
}

export default function ServicesPage() {
	const [services, setServices] = useState<Service[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<Service | null>(null);
	const router = useRouter();

	useEffect(() => {
		fetchServices();
	}, []);

	const fetchServices = async () => {
		try {
			const response = await fetch('/api/services');
			if (!response.ok) throw new Error('Failed to fetch services');
			const data = await response.json();
			setServices(data.services || []);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleEditService = (service: Service) => {
		setSelectedService(service);
		setIsEditModalOpen(true);
	};

	const handleDeleteService = async (serviceId: string) => {
		if (!confirm('Are you sure you want to delete this service?')) return;

		const deleteToast = toast.loading('Deleting service...');

		try {
			const response = await fetch(`/api/services/${serviceId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete service');
			}

			// Remove service from local state
			setServices(services.filter((service) => service.id !== serviceId));
			toast.success('Service deleted successfully!', { id: deleteToast });
		} catch (err: any) {
			setError(err.message);
			toast.error(err.message || 'Failed to delete service', {
				id: deleteToast,
			});
		}
	};

	const handleSaveService = (updatedService: Service) => {
		setServices(
			services.map((service) =>
				service.id === updatedService.id ? updatedService : service
			)
		);
		toast.success('Service updated successfully!');
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

	if (loading) {
		return (
			<div className="min-h-screen bg-[#fff7f6] flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5b5b] mx-auto mb-4"></div>
					<p className="text-gray-600">Loading services...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#fff7f6]">
			{/* Header */}
			<header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-[#f1d9d7]">
				<div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="h-8 w-8 rounded-full bg-[#ff5b5b]" />
						<span className="text-xl font-semibold">Henzo</span>
					</div>
					<nav className="hidden md:flex items-center gap-8 text-[15px]">
						<a
							className="text-gray-800 hover:text-black font-medium"
							href="/owner"
						>
							Dashboard
						</a>
						<a className="text-gray-800 hover:text-black font-medium" href="#">
							Calendar
						</a>
						<a className="text-[#ff5b5b] font-medium" href="/owner/services">
							Services
						</a>
						<a
							className="text-gray-800 hover:text-black font-medium"
							href="/owner/staff"
						>
							Staff
						</a>
						<a className="text-gray-800 hover:text-black font-medium" href="#">
							Marketing
						</a>
					</nav>
					<div className="flex items-center gap-4">
						<button
							aria-label="notifications"
							className="h-9 w-9 rounded-full border border-[#ead2d0] grid place-items-center text-gray-700"
						>
							🔔
						</button>
						<div className="h-9 w-9 rounded-full bg-[#ffd6d2]" />
					</div>
				</div>
			</header>

			<main className="mx-auto max-w-7xl px-6 py-8">
				<div className="mb-8">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-3xl font-bold text-black mb-2">Services</h1>
							<p className="text-gray-800">
								Manage your salon services and pricing
							</p>
						</div>
						<a
							href="/owner/services/new"
							className="inline-flex items-center gap-2 rounded-full bg-[#ff5b5b] text-white px-4 py-2 text-sm shadow-sm hover:opacity-95"
						>
							<span className="text-lg leading-none">＋</span>
							Add New Service
						</a>
					</div>
				</div>

				{error && (
					<div className="mb-6 text-red-600 text-center bg-red-50 border border-red-200 rounded-md p-3">
						{error}
					</div>
				)}

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
						<a
							href="/owner/services/new"
							className="inline-flex items-center gap-2 bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
						>
							<span className="text-lg">＋</span>
							Add Your First Service
						</a>
					</div>
				) : (
					<div className="bg-white rounded-xl border border-[#f1d9d7] overflow-hidden">
						<div className="grid grid-cols-5 px-6 py-3 text-[13px] text-gray-700 bg-[#fff2f1] font-semibold">
							<div>Service Name</div>
							<div>Description</div>
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
										{service.description || 'No description'}
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
			</main>

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
