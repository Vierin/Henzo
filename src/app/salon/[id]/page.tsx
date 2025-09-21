'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import BookingModal from '../../../components/BookingModal';
import PublicHeader from '../../../components/PublicHeader';

export default function SalonDetailPage() {
	const params = useParams();
	const [activeTab, setActiveTab] = useState('Services');
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState(null);

	const salon = {
		id: params.id,
		name: 'The Glamour Studio',
		address: '123 Beauty Lane, Glamour City, 12345',
		rating: 4.9,
		reviews: 245,
		description:
			'Your one-stop destination for beauty and relaxation. We offer a wide range of services to make you look and feel your best.',
		openingHours: {
			weekdays: 'Mon-Fri: 9am - 7pm',
			weekend: 'Sat: 10am - 5pm',
		},
		image: '💇‍♀️',
		services: {
			'Hair Services': [
				{
					name: "Women's Haircut",
					duration: '1h',
					description: 'Includes wash and style',
					price: '$65',
				},
				{
					name: "Men's Haircut",
					duration: '45m',
					description: 'Precision cut and styling',
					price: '$40',
				},
				{
					name: 'Full Color',
					duration: '2h 30m',
					description: 'Root to tip color application',
					price: '$120',
				},
				{
					name: 'Balayage',
					duration: '3h',
					description: 'Hand-painted highlights',
					price: '$180',
				},
			],
			'Nail Care': [
				{
					name: 'Classic Manicure',
					duration: '45m',
					description: 'Shaping, cuticle care, and polish',
					price: '$35',
				},
				{
					name: 'Gel Pedicure',
					duration: '1h 15m',
					description: 'Long-lasting gel polish',
					price: '$55',
				},
			],
			Skincare: [
				{
					name: 'Signature Facial',
					duration: '1h',
					description: 'Customized for your skin type',
					price: '$90',
				},
				{
					name: 'Eyebrow Waxing',
					duration: '15m',
					description: 'Shaping and grooming',
					price: '$20',
				},
			],
		},
	};

	const tabs = ['Services', 'Reviews'];

	const handleBookService = (service: any) => {
		setSelectedService(service);
		setIsBookingModalOpen(true);
	};

	return (
		<div className="min-h-screen bg-[#F8F5F2]">
			<PublicHeader />

			<main className="py-8 px-6">
				<div className="mx-auto max-w-6xl">
					{/* Salon Title */}
					<h1 className="text-3xl font-bold text-gray-900 mb-6">
						{salon.name}
					</h1>

					{/* Navigation Tabs */}
					<div className="flex gap-8 mb-8 border-b border-gray-200">
						{tabs.map((tab) => (
							<button
								key={tab}
								onClick={() => setActiveTab(tab)}
								className={`pb-3 text-lg font-medium transition-colors ${
									activeTab === tab
										? 'text-[#8B4513] border-b-2 border-[#8B4513]'
										: 'text-gray-600 hover:text-gray-900'
								}`}
							>
								{tab}
							</button>
						))}
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
						{/* Main Content - Left Side */}
						<div className="lg:col-span-2">
							{/* Salon Image */}
							<div className="w-full h-64 bg-gradient-to-br from-pink-100 to-pink-200 rounded-2xl mb-8 flex items-center justify-center">
								<span className="text-8xl">{salon.image}</span>
							</div>

							{/* Services Tab Content */}
							{activeTab === 'Services' && (
								<div className="space-y-8">
									{Object.entries(salon.services).map(
										([category, services]) => (
											<div key={category}>
												<h3 className="text-xl font-semibold text-gray-900 mb-4">
													{category}
												</h3>
												<div className="space-y-4">
													{services.map((service, index) => (
														<div
															key={index}
															className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
														>
															<div className="flex items-center justify-between">
																<div className="flex-1">
																	<div className="flex items-center gap-4 mb-2">
																		<h4 className="text-lg font-semibold text-gray-900">
																			{service.name}
																		</h4>
																		<span className="text-sm text-gray-500">
																			{service.duration}
																		</span>
																	</div>
																	<p className="text-gray-600 text-sm mb-3">
																		{service.description}
																	</p>
																</div>
																<div className="flex items-center gap-4">
																	<span className="text-lg font-bold text-[#8B4513]">
																		{service.price}
																	</span>
																	<button
																		onClick={() => handleBookService(service)}
																		className="bg-[#ff5b5b] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
																	>
																		Book Now
																	</button>
																</div>
															</div>
														</div>
													))}
												</div>
											</div>
										)
									)}
								</div>
							)}

							{/* Reviews Tab Content */}
							{activeTab === 'Reviews' && (
								<div className="space-y-6">
									<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
										<h3 className="text-lg font-semibold text-gray-900 mb-4">
											Customer Reviews
										</h3>
										<div className="space-y-4">
											<div className="border-b border-gray-100 pb-4">
												<div className="flex items-center gap-2 mb-2">
													<div className="flex text-yellow-400">
														{'★'.repeat(5)}
													</div>
													<span className="text-sm font-medium text-gray-900">
														Sarah M.
													</span>
													<span className="text-sm text-gray-500">
														2 days ago
													</span>
												</div>
												<p className="text-gray-700">
													Amazing experience! The staff was professional and the
													results exceeded my expectations. Highly recommend!
												</p>
											</div>
											<div className="border-b border-gray-100 pb-4">
												<div className="flex items-center gap-2 mb-2">
													<div className="flex text-yellow-400">
														{'★'.repeat(5)}
													</div>
													<span className="text-sm font-medium text-gray-900">
														Jessica L.
													</span>
													<span className="text-sm text-gray-500">
														1 week ago
													</span>
												</div>
												<p className="text-gray-700">
													Great service and beautiful salon. The balayage turned
													out perfect!
												</p>
											</div>
										</div>
									</div>
								</div>
							)}
						</div>

						{/* Sidebar - Right Side */}
						<div className="lg:col-span-1">
							<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-8">
								<h2 className="text-xl font-semibold text-gray-900 mb-4">
									{salon.name}
								</h2>
								{/* Mini Map */}
								<div className="mt-6">
									<div className="w-full h-48 bg-gray-100 rounded-lg border border-gray-200 relative overflow-hidden">
										{/* Map placeholder with marker */}
										<div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
											<div className="text-center">
												<div className="w-16 h-16 bg-[#ff5b5b] rounded-full flex items-center justify-center mb-2 mx-auto shadow-lg">
													<span className="text-white text-xl">📍</span>
												</div>
												<p className="text-sm text-gray-600 font-medium">
													{salon.address}
												</p>
											</div>
										</div>
										{/* Map overlay pattern */}
										<div className="absolute inset-0 opacity-10">
											<svg
												className="w-full h-full"
												viewBox="0 0 100 100"
												fill="none"
											>
												<defs>
													<pattern
														id="grid"
														width="10"
														height="10"
														patternUnits="userSpaceOnUse"
													>
														<path
															d="M 10 0 L 0 0 0 10"
															fill="none"
															stroke="#8B4513"
															strokeWidth="0.5"
														/>
													</pattern>
												</defs>
												<rect width="100" height="100" fill="url(#grid)" />
											</svg>
										</div>
									</div>
								</div>
								<p className="text-gray-700 mb-6 leading-relaxed">
									{salon.description}
								</p>

								<div className="space-y-4">
									<div className="flex items-start gap-3">
										<span className="text-[#8B4513] mt-1">📍</span>
										<div>
											<p className="text-sm font-medium text-gray-900">
												Address
											</p>
											<p className="text-sm text-gray-600">{salon.address}</p>
										</div>
									</div>

									<div className="flex items-start gap-3">
										<span className="text-[#8B4513] mt-1">🕒</span>
										<div>
											<p className="text-sm font-medium text-gray-900">
												Opening Hours
											</p>
											<p className="text-sm text-gray-600">
												{salon.openingHours.weekdays}
											</p>
											<p className="text-sm text-gray-600">
												{salon.openingHours.weekend}
											</p>
										</div>
									</div>

									<div className="flex items-start gap-3">
										<span className="text-[#8B4513] mt-1">⭐</span>
										<div>
											<p className="text-sm font-medium text-gray-900">
												Rating
											</p>
											<p className="text-sm text-gray-600">
												{salon.rating} ({salon.reviews} reviews)
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</main>

			{/* Footer */}
			<footer className="bg-[#F8F5F2] py-8 px-6 mt-16">
				<div className="mx-auto max-w-6xl text-center">
					<p className="text-gray-500 text-sm">
						© 2024 Henzo. All rights reserved.
					</p>
				</div>
			</footer>

			{/* Booking Modal */}
			<BookingModal
				isOpen={isBookingModalOpen}
				onClose={() => setIsBookingModalOpen(false)}
				service={selectedService as any}
			/>
		</div>
	);
}
