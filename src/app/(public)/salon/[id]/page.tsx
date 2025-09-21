'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import BookingModal from '../../../../components/BookingModal';
import PublicHeader from '../../../../components/PublicHeader';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import ErrorDisplay from '../../../../components/ErrorDisplay';
import MapComponent from '../../../../components/MapComponent';
import { useSalon } from '@/hooks/useSalon';
import { Service } from '@/types';

export default function SalonDetailPage() {
	const params = useParams();
	const [activeTab, setActiveTab] = useState('Services');
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<Service | null>(null);

	const salonId = params.id as string;
	const { data: salon, isLoading, error } = useSalon(salonId);

	// Loading and error states
	if (isLoading) {
		return (
			<div className="min-h-screen bg-[#F8F5F2]">
				<div className="container mx-auto px-4 py-8">
					<LoadingSpinner />
				</div>
			</div>
		);
	}

	if (error || !salon) {
		return (
			<div className="min-h-screen bg-[#F8F5F2]">
				<div className="container mx-auto px-4 py-8">
					<ErrorDisplay
						message="Failed to load salon details"
						error={error || new Error('Unknown error')}
					/>
				</div>
			</div>
		);
	}

	const tabs = ['Services', 'Reviews', 'Contacts'];

	const handleBookService = (service: Service) => {
		setSelectedService(service);
		setIsBookingModalOpen(true);
	};

	const renderStars = (rating: number) => {
		return Array.from({ length: 5 }, (_, i) => (
			<span
				key={i}
				className={`text-lg ${
					i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'
				}`}
			>
				★
			</span>
		));
	};

	const formatWorkingHours = (workingHours: any) => {
		if (!workingHours) return 'Hours not specified';

		const days = [
			'monday',
			'tuesday',
			'wednesday',
			'thursday',
			'friday',
			'saturday',
			'sunday',
		];
		const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

		return days
			.map((day, index) => {
				const hours = workingHours[day];
				if (!hours || hours.closed) {
					return `${dayNames[index]}: Closed`;
				}
				return `${dayNames[index]}: ${hours.open} - ${hours.close}`;
			})
			.join('\n');
	};

	// Group services by category for better display
	const groupServicesByCategory = (services: Service[]) => {
		const categories: { [key: string]: Service[] } = {};

		services.forEach((service) => {
			// Simple categorization based on service name
			let category = 'Other Services';
			const serviceName = service.name.toLowerCase();

			if (
				serviceName.includes('hair') ||
				serviceName.includes('cut') ||
				serviceName.includes('color') ||
				serviceName.includes('styling')
			) {
				category = 'Hair Services';
			} else if (
				serviceName.includes('nail') ||
				serviceName.includes('manicure') ||
				serviceName.includes('pedicure')
			) {
				category = 'Nail Care';
			} else if (
				serviceName.includes('facial') ||
				serviceName.includes('skin') ||
				serviceName.includes('massage') ||
				serviceName.includes('wax')
			) {
				category = 'Skincare';
			}

			if (!categories[category]) {
				categories[category] = [];
			}
			categories[category].push(service);
		});

		return categories;
	};

	const serviceCategories = salon.services
		? groupServicesByCategory(salon.services)
		: {};

	return (
		<div className="min-h-screen bg-[#F8F5F2]">
			<main className="py-8 px-6">
				<div className="mx-auto max-w-6xl">
					{/* Salon Title */}
					<h1 className="text-4xl font-bold text-gray-900 mb-8">
						{salon.name}
					</h1>

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
						{/* Left Column - Main Content */}
						<div className="lg:col-span-2">
							{/* Hero Image */}
							<div className="mb-8">
								<div className="w-full h-80 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl flex items-center justify-center overflow-hidden">
									{salon.logo ? (
										<img
											src={salon.logo}
											alt={salon.name}
											className="w-full h-full object-cover rounded-xl"
											onError={(e) => {
												e.currentTarget.style.display = 'none';
												const nextSibling = e.currentTarget
													.nextElementSibling as HTMLElement;
												if (nextSibling) {
													nextSibling.style.display = 'flex';
												}
											}}
										/>
									) : null}
									<div
										className="w-full h-full bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl flex items-center justify-center"
										style={{ display: salon.logo ? 'none' : 'flex' }}
									>
										<span className="text-6xl">💇‍♀️</span>
									</div>
								</div>
							</div>
							{/* Navigation Tabs */}
							<div className="flex gap-8 mb-8 border-b border-gray-200">
								{tabs.map((tab) => (
									<button
										key={tab}
										onClick={() => setActiveTab(tab)}
										className={`pb-4 px-1 text-lg font-medium transition-colors ${
											activeTab === tab
												? 'text-[#ff5b5b] border-b-2 border-[#ff5b5b]'
												: 'text-gray-600 hover:text-gray-900'
										}`}
									>
										{tab}
									</button>
								))}
							</div>

							{/* Tab Content */}
							{activeTab === 'Services' && (
								<div>
									{Object.keys(serviceCategories).length > 0 ? (
										Object.entries(serviceCategories).map(
											([category, services]) => (
												<div key={category} className="mb-12">
													<h2 className="text-2xl font-bold text-gray-900 mb-6">
														{category}
													</h2>
													<div className="space-y-4">
														{services.map((service) => (
															<div
																key={service.id}
																className="bg-white rounded-lg p-6 hover:shadow-md transition-shadow"
															>
																<div className="flex justify-between items-start">
																	<div className="flex-1">
																		<h3 className="text-xl font-semibold text-gray-900 mb-2">
																			{service.name}
																		</h3>
																		{service.description && (
																			<p className="text-gray-600 mb-3">
																				{service.description}
																			</p>
																		)}
																		<div className="flex items-center gap-4 text-sm text-gray-500">
																			<span>⏱️ {service.duration} min</span>
																			<span className="text-[#ff5b5b] font-semibold">
																				${service.price}
																			</span>
																		</div>
																	</div>
																	<button
																		onClick={() => handleBookService(service)}
																		className="ml-4 bg-[#ff5b5b] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
																	>
																		Book Now
																	</button>
																</div>
															</div>
														))}
													</div>
												</div>
											)
										)
									) : (
										<div className="text-center py-12">
											<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
												<span className="text-2xl">💇‍♀️</span>
											</div>
											<h3 className="text-xl font-semibold text-gray-900 mb-2">
												No services available
											</h3>
											<p className="text-gray-600">
												This salon hasn't added any services yet.
											</p>
										</div>
									)}
								</div>
							)}

							{activeTab === 'Reviews' && (
								<div>
									<h2 className="text-2xl font-bold text-gray-900 mb-6">
										Customer Reviews
									</h2>

									{/* Mock reviews - would come from reviews API */}
									<div className="space-y-6">
										<div className="border-b border-gray-200 pb-6">
											<div className="flex items-center gap-2 mb-2">
												{renderStars(5)}
												<span className="font-medium text-gray-900">
													Sarah M.
												</span>
												<span className="text-gray-500 text-sm">
													2 days ago
												</span>
											</div>
											<p className="text-gray-700">
												Amazing experience! The staff was professional and the
												service was top-notch. I'll definitely be coming back.
											</p>
										</div>

										<div className="border-b border-gray-200 pb-6">
											<div className="flex items-center gap-2 mb-2">
												{renderStars(4)}
												<span className="font-medium text-gray-900">
													John D.
												</span>
												<span className="text-gray-500 text-sm">
													1 week ago
												</span>
											</div>
											<p className="text-gray-700">
												Great salon with excellent service. The only minor issue
												was the wait time, but the quality made up for it.
											</p>
										</div>

										<div className="border-b border-gray-200 pb-6">
											<div className="flex items-center gap-2 mb-2">
												{renderStars(5)}
												<span className="font-medium text-gray-900">
													Emma L.
												</span>
												<span className="text-gray-500 text-sm">
													2 weeks ago
												</span>
											</div>
											<p className="text-gray-700">
												Perfect haircut and styling! The stylist really
												understood what I wanted and delivered beyond my
												expectations.
											</p>
										</div>
									</div>

									<div className="mt-6 text-center">
										<button className="text-[#ff5b5b] hover:text-[#e04a4a] font-medium transition-colors">
											View All Reviews
										</button>
									</div>
								</div>
							)}

							{activeTab === 'Contacts' && (
								<div>
									<h2 className="text-2xl font-bold text-gray-900 mb-6">
										Contact Information
									</h2>

									<div className="space-y-6">
										<div className="bg-white rounded-lg p-6 shadow-sm">
											<h3 className="text-lg font-semibold text-gray-900 mb-4">
												Get in Touch
											</h3>
											<div className="space-y-3">
												{salon.phone && (
													<div className="flex items-center gap-3">
														<span className="text-gray-600">📞</span>
														<span className="text-gray-700">{salon.phone}</span>
													</div>
												)}
												{salon.address && (
													<div className="flex items-center gap-3">
														<span className="text-gray-600">📍</span>
														<span className="text-gray-700">
															{salon.address}
														</span>
													</div>
												)}
											</div>
										</div>
									</div>
								</div>
							)}
						</div>

						{/* Right Column - Sidebar */}
						<div className="bg-white rounded-xl p-6 h-fit shadow-sm">
							<h2 className="text-xl font-bold text-gray-900 mb-4">
								About {salon.name}
							</h2>

							<p className="text-gray-700 leading-relaxed mb-6">
								{salon.description ||
									'Your one-stop destination for beauty and relaxation. We offer a wide range of services to make you look and feel your best.'}
							</p>

							{/* Mini Map */}
							{salon.address && (
								<div className="mb-6">
									<h3 className="text-lg font-semibold text-gray-900 mb-3">
										Location
									</h3>
									<div className="h-48 w-full rounded-lg overflow-hidden border border-gray-200">
										<MapComponent address={salon.address} showPopup={false} />
									</div>
								</div>
							)}

							<div className="space-y-4">
								{salon.address && (
									<div>
										<div className="flex items-center gap-2 mb-1">
											<span className="text-gray-600">📍</span>
											<span className="font-medium text-gray-900">Address</span>
										</div>
										<p className="text-gray-600 text-sm ml-6">
											{salon.address}
										</p>
									</div>
								)}

								<div>
									<div className="flex items-center gap-2 mb-1">
										<span className="text-gray-600">🕒</span>
										<span className="font-medium text-gray-900">
											Opening Hours
										</span>
									</div>
									<div className="text-gray-600 text-sm ml-6">
										<pre className="whitespace-pre-line text-xs">
											{formatWorkingHours((salon as any).workingHours)}
										</pre>
									</div>
								</div>

								<div>
									<div className="flex items-center gap-2 mb-1">
										<span className="text-gray-600">⭐</span>
										<span className="font-medium text-gray-900">Rating</span>
									</div>
									<div className="flex items-center gap-2 ml-6">
										{renderStars(4.9)}
										<span className="text-gray-600 text-sm">
											4.9 (245 reviews)
										</span>
									</div>
								</div>
							</div>

							{/* Action Buttons */}
							<div className="mt-6 space-y-3">
								<button
									onClick={() => setIsBookingModalOpen(true)}
									className="w-full bg-[#ff5b5b] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
								>
									Book Appointment
								</button>

								{salon.phone && (
									<button className="w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-50 transition-colors">
										Call Now
									</button>
								)}

								<button className="w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-50 transition-colors">
									Get Directions
								</button>
							</div>
						</div>
					</div>
				</div>
			</main>

			{/* Footer */}
			<footer className="bg-white border-t border-gray-200 py-6">
				<div className="container mx-auto px-6 text-center">
					<p className="text-gray-500 text-sm">
						© 2024 Henzo. All rights reserved.
					</p>
				</div>
			</footer>

			{/* Booking Modal */}
			<BookingModal
				isOpen={isBookingModalOpen}
				onClose={() => {
					setIsBookingModalOpen(false);
					setSelectedService(null);
				}}
				salonId={salonId}
				service={selectedService || undefined}
				salonName={salon.name}
			/>
		</div>
	);
}
