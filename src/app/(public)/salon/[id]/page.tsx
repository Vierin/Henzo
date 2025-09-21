'use client';

import { useParams } from 'next/navigation';
import { useSalon } from '@/hooks/useSalon';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import BookingModal from '@/components/BookingModal';
import { useState } from 'react';

export default function SalonDetailPage() {
	const params = useParams();
	const salonId = params.id as string;
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

	const { data: salon, isLoading, error } = useSalon(salonId);

	const formatWorkingHours = (workingHours: any) => {
		if (!workingHours) return null;

		const days = [
			'monday',
			'tuesday',
			'wednesday',
			'thursday',
			'friday',
			'saturday',
			'sunday',
		];

		return days
			.map((day) => {
				const dayData = workingHours[day];
				if (!dayData) return null;

				if (dayData.closed) {
					return {
						day: day.charAt(0).toUpperCase() + day.slice(1),
						hours: 'Closed',
					};
				}

				return {
					day: day.charAt(0).toUpperCase() + day.slice(1),
					hours: `${dayData.open} - ${dayData.close}`,
				};
			})
			.filter(Boolean);
	};

	if (isLoading) {
		return (
			<div className="py-8">
				<div className="mx-auto max-w-7xl px-6">
					<div className="flex justify-center py-12">
						<LoadingSpinner size="lg" />
					</div>
				</div>
			</div>
		);
	}

	if (error || !salon) {
		return (
			<div className="py-8">
				<div className="mx-auto max-w-7xl px-6">
					<ErrorDisplay error={error || new Error('Salon not found')} />
				</div>
			</div>
		);
	}

	const workingHours = formatWorkingHours(salon.workingHours);

	return (
		<div className="py-8">
			<div className="mx-auto max-w-7xl px-6">
				{/* Salon Header */}
				<div className="mb-8">
					<div className="flex items-center gap-4 mb-6">
						{salon.logo ? (
							<img
								src={salon.logo}
								alt={salon.name}
								className="w-20 h-20 rounded-full object-cover"
							/>
						) : (
							<div className="w-20 h-20 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full flex items-center justify-center">
								<span className="text-2xl">💇‍♀️</span>
							</div>
						)}
						<div>
							<h1 className="text-4xl font-bold text-gray-900 mb-2">
								{salon.name}
							</h1>
							{salon.address && (
								<p className="text-gray-600 text-lg">📍 {salon.address}</p>
							)}
							{salon.phone && <p className="text-gray-600">📞 {salon.phone}</p>}
						</div>
					</div>

					<button
						onClick={() => setIsBookingModalOpen(true)}
						className="bg-[#ff5b5b] text-white px-8 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
					>
						Book Appointment
					</button>
				</div>

				{/* Main Content */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Services */}
					<div className="lg:col-span-2">
						<h2 className="text-2xl font-bold text-gray-900 mb-6">Services</h2>
						{salon.services && salon.services.length > 0 ? (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{salon.services.map((service) => (
									<div
										key={service.id}
										className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
									>
										<div className="flex justify-between items-start mb-4">
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
											<div className="text-right">
												<p className="text-lg font-semibold text-gray-900">
													${service.price}
												</p>
												<p className="text-sm text-gray-500">
													{service.duration} min
												</p>
											</div>
										</div>
										{service.description && (
											<p className="text-gray-600 text-sm mb-4">
												{service.description}
											</p>
										)}
										<button
											onClick={() => setIsBookingModalOpen(true)}
											className="w-full bg-[#ff5b5b] text-white py-2 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
										>
											Book This Service
										</button>
									</div>
								))}
							</div>
						) : (
							<div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-200">
								<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
									<span className="text-2xl">💇‍♀️</span>
								</div>
								<h3 className="text-lg font-semibold text-gray-900 mb-2">
									No services available
								</h3>
								<p className="text-gray-600">
									This salon hasn't added any services yet.
								</p>
							</div>
						)}
					</div>

					{/* Sidebar */}
					<div className="space-y-6">
						{/* Contact Information */}
						<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">
								Contact Information
							</h3>
							<div className="space-y-3">
								{salon.address && (
									<div className="flex items-start gap-3">
										<span className="text-gray-400 mt-1">📍</span>
										<div>
											<p className="text-sm font-medium text-gray-700">
												Address
											</p>
											<p className="text-sm text-gray-600">{salon.address}</p>
										</div>
									</div>
								)}
								{salon.phone && (
									<div className="flex items-start gap-3">
										<span className="text-gray-400 mt-1">📞</span>
										<div>
											<p className="text-sm font-medium text-gray-700">Phone</p>
											<p className="text-sm text-gray-600">{salon.phone}</p>
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Working Hours */}
						{workingHours && workingHours.length > 0 && (
							<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
								<h3 className="text-lg font-semibold text-gray-900 mb-4">
									Working Hours
								</h3>
								<div className="space-y-2">
									{workingHours.map((dayData: any, index: number) => (
										<div key={index} className="flex justify-between text-sm">
											<span className="font-medium text-gray-700">
												{dayData.day}
											</span>
											<span className="text-gray-600">{dayData.hours}</span>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Staff */}
						{salon.staff && salon.staff.length > 0 && (
							<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
								<h3 className="text-lg font-semibold text-gray-900 mb-4">
									Our Staff
								</h3>
								<div className="space-y-3">
									{salon.staff.slice(0, 3).map((staffMember: any) => (
										<div
											key={staffMember.id}
											className="flex items-center gap-3"
										>
											<div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
												<span className="text-sm font-semibold text-blue-600">
													{staffMember.name.charAt(0).toUpperCase()}
												</span>
											</div>
											<div>
												<p className="text-sm font-medium text-gray-900">
													{staffMember.name}
												</p>
												<p className="text-xs text-gray-500 capitalize">
													{staffMember.accessLevel.toLowerCase()}
												</p>
											</div>
										</div>
									))}
									{salon.staff.length > 3 && (
										<p className="text-sm text-gray-500">
											+{salon.staff.length - 3} more staff members
										</p>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Booking Modal */}
			<BookingModal
				isOpen={isBookingModalOpen}
				onClose={() => setIsBookingModalOpen(false)}
				salonId={salon.id}
				salonName={salon.name}
				showServiceSelector={true}
			/>
		</div>
	);
}
