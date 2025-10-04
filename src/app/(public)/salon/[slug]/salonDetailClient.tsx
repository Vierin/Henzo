'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import BookingModal from '../../../../components/BookingModal';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import ErrorDisplay from '../../../../components/ErrorDisplay';
import MapComponent from '../../../../components/MapComponent';
import { Service, WorkingHours, Salon } from '@/types';
import { supabase } from '@/lib/supabase';
import SalonPhotoSlider from '../../../../components/SalonPhotoSlider';
import { generateSalonSlug } from '@/utils/slug';

interface SalonDetailClientProps {
	salon: Salon;
}

export default function SalonDetailClient({ salon }: SalonDetailClientProps) {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<'Services' | 'Reviews'>(
		'Services'
	);
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<Service | null>(null);

	const handleBookService = useCallback((service: Service) => {
		setSelectedService(service);
		setIsBookingModalOpen(true);
	}, []);

	const handleCloseBookingModal = useCallback(() => {
		setIsBookingModalOpen(false);
		setSelectedService(null);
	}, []);

	const handleGetDirections = useCallback(() => {
		if (salon.address) {
			const encodedAddress = encodeURIComponent(salon.address);
			const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
			window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
		}
	}, [salon.address]);

	const renderStars = useCallback((rating: number) => {
		return Array.from({ length: 5 }, (_, i) => (
			<span
				key={i}
				className={`text-lg ${
					i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'
				}`}
				aria-hidden="true"
			>
				★
			</span>
		));
	}, []);

	const formatWorkingHours = useCallback(
		(workingHours: WorkingHours | undefined) => {
			if (!workingHours) return 'Hours not specified';

			const days: (keyof WorkingHours)[] = [
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
		},
		[]
	);

	const serviceCategories = useMemo(() => {
		if (!salon.services) return {};

		const categories: { [key: string]: Service[] } = {};

		salon.services.forEach((service) => {
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
	}, [salon.services]);

	const getPublicUrl = useCallback((filePath: string) => {
		const { data } = supabase.storage
			.from('salon-files')
			.getPublicUrl(filePath);
		return data.publicUrl;
	}, []);

	const tabs = ['Services', 'Reviews'] as const;

	return (
		<main className="py-8 px-6" role="main">
			<div className="mx-auto max-w-6xl">
				{/* Salon Title */}
				<header>
					<h1 className="text-4xl font-bold text-gray-900 mb-8">
						{salon.name}
					</h1>
				</header>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Left Column - Main Content */}
					<section className="lg:col-span-2" aria-label="Salon information">
						{/* Photo Slider */}
						<div className="mb-8">
							<SalonPhotoSlider
								photos={salon.photos || []}
								logo={salon.logo}
								salonName={salon.name}
							/>
						</div>

						{/* Navigation Tabs */}
						<nav
							role="tablist"
							aria-label="Salon information tabs"
							className="flex gap-8 mb-8 border-b border-gray-200"
						>
							{tabs.map((tab) => (
								<button
									key={tab}
									role="tab"
									aria-selected={activeTab === tab}
									aria-controls={`tabpanel-${tab.toLowerCase()}`}
									id={`tab-${tab.toLowerCase()}`}
									onClick={() => setActiveTab(tab)}
									className={`pb-4 px-1 text-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 rounded-t ${
										activeTab === tab
											? 'text-[#ff5b5b] border-b-2 border-[#ff5b5b]'
											: 'text-gray-600 hover:text-gray-900'
									}`}
								>
									{tab}
								</button>
							))}
						</nav>

						{/* Tab Content */}
						{activeTab === 'Services' && (
							<div
								role="tabpanel"
								id="tabpanel-services"
								aria-labelledby="tab-services"
								className="min-h-[400px]"
							>
								{Object.keys(serviceCategories).length > 0 ? (
									Object.entries(serviceCategories).map(
										([category, services]) => (
											<section key={category} className="mb-12">
												<h2 className="text-2xl font-bold text-gray-900 mb-6">
													{category}
												</h2>
												<div className="space-y-4">
													{services.map((service) => (
														<article
															key={service.id}
															className="bg-white rounded-lg p-6 hover:shadow-md transition-shadow border border-gray-100"
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
																		<span>
																			<span className="sr-only">
																				Duration:{' '}
																			</span>
																			⏱️ {service.duration} min
																		</span>
																		<span className="text-[#ff5b5b] font-semibold">
																			<span className="sr-only">Price: </span>$
																			{service.price}
																		</span>
																	</div>
																</div>
																<button
																	onClick={() => handleBookService(service)}
																	className="ml-4 bg-[#ff5b5b] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
																	aria-label={`Book ${service.name} service`}
																>
																	Book Now
																</button>
															</div>
														</article>
													))}
												</div>
											</section>
										)
									)
								) : (
									<div className="text-center py-12">
										<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
											<span
												className="text-2xl"
												role="img"
												aria-label="Beauty services"
											>
												💇‍♀️
											</span>
										</div>
										<h3 className="text-xl font-semibold text-gray-900 mb-2">
											No services available
										</h3>
										<p className="text-gray-600">
											This salon hasn&apos;t added any services yet.
										</p>
									</div>
								)}
							</div>
						)}

						{activeTab === 'Reviews' && (
							<div
								role="tabpanel"
								id="tabpanel-reviews"
								aria-labelledby="tab-reviews"
								className="min-h-[400px]"
							>
								<h2 className="text-2xl font-bold text-gray-900 mb-6">
									Customer Reviews
								</h2>

								{/* Mock reviews - would come from reviews API */}
								<div className="space-y-6">
									<article className="border-b border-gray-200 pb-6">
										<div className="flex items-center gap-2 mb-2">
											<div
												className="flex"
												role="img"
												aria-label="5 star rating"
											>
												{renderStars(5)}
											</div>
											<span className="font-medium text-gray-900">
												Sarah M.
											</span>
											<span className="text-gray-500 text-sm">2 days ago</span>
										</div>
										<p className="text-gray-700">
											Amazing experience! The staff was professional and the
											service was top-notch. I&apos;ll definitely be coming
											back.
										</p>
									</article>

									<article className="border-b border-gray-200 pb-6">
										<div className="flex items-center gap-2 mb-2">
											<div
												className="flex"
												role="img"
												aria-label="4 star rating"
											>
												{renderStars(4)}
											</div>
											<span className="font-medium text-gray-900">John D.</span>
											<span className="text-gray-500 text-sm">1 week ago</span>
										</div>
										<p className="text-gray-700">
											Great salon with excellent service. The only minor issue
											was the wait time, but the quality made up for it.
										</p>
									</article>

									<article className="border-b border-gray-200 pb-6">
										<div className="flex items-center gap-2 mb-2">
											<div
												className="flex"
												role="img"
												aria-label="5 star rating"
											>
												{renderStars(5)}
											</div>
											<span className="font-medium text-gray-900">Emma L.</span>
											<span className="text-gray-500 text-sm">2 weeks ago</span>
										</div>
										<p className="text-gray-700">
											Perfect haircut and styling! The stylist really understood
											what I wanted and delivered beyond my expectations.
										</p>
									</article>
								</div>

								<div className="mt-6 text-center">
									<button className="text-[#ff5b5b] hover:text-[#e04a4a] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 rounded">
										View All Reviews
									</button>
								</div>
							</div>
						)}
					</section>

					{/* Right Column - Sidebar */}
					<aside
						className="bg-white rounded-xl p-6 h-fit shadow-sm"
						aria-label="Salon details"
					>
						<h2 className="text-xl font-bold text-gray-900 mb-4">
							{salon.name}
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
								<div className="w-full rounded-lg overflow-hidden border border-gray-200">
									<MapComponent
										address={salon.address}
										showPopup={false}
										interactive={false}
									/>
								</div>
								<button
									onClick={handleGetDirections}
									className="w-full mt-3 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
									aria-label="Get directions to salon"
								>
									Get Directions
								</button>
							</div>
						)}

						<div className="space-y-4">
							{salon.address && (
								<div>
									<div className="flex items-center gap-2 mb-1">
										<span
											className="text-gray-600"
											role="img"
											aria-label="Location"
										>
											📍
										</span>
										<span className="font-medium text-gray-900">Address</span>
									</div>
									<address className="text-gray-600 text-sm ml-6 not-italic">
										{salon.address}
									</address>
								</div>
							)}

							<div>
								<div className="flex items-center gap-2 mb-1">
									<span className="text-gray-600" role="img" aria-label="Clock">
										🕒
									</span>
									<span className="font-medium text-gray-900">
										Opening Hours
									</span>
								</div>
								<div className="text-gray-600 text-sm ml-6">
									<pre className="whitespace-pre-line text-xs" role="text">
										{formatWorkingHours(salon.workingHours)}
									</pre>
								</div>
							</div>

							<div>
								<div className="flex items-center gap-2 mb-1">
									<span
										className="text-gray-600"
										role="img"
										aria-label="Star rating"
									>
										⭐
									</span>
									<span className="font-medium text-gray-900">Rating</span>
								</div>
								<div className="flex items-center gap-2 ml-6">
									<div className="flex" role="img" aria-label="4.9 star rating">
										{renderStars(4.9)}
									</div>
									<span className="text-gray-600 text-sm">
										4.9 (245 reviews)
									</span>
								</div>
							</div>
						</div>
					</aside>
				</div>
			</div>

			{/* Booking Modal */}
			<BookingModal
				isOpen={isBookingModalOpen}
				onClose={handleCloseBookingModal}
				salonId={salon.id}
				service={selectedService || undefined}
				salonName={salon.name}
				workingHours={salon.workingHours}
			/>
		</main>
	);
}
