'use client';

import { useState } from 'react';
import BookingModal from '../../components/BookingModal';
import PublicHeader from '../../components/PublicHeader';

export default function SalonsPage() {
	const [searchQuery, setSearchQuery] = useState('Nail salons in Moscow');
	const [activeFilter, setActiveFilter] = useState('Nail salons');
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState(null);

	const filters = [
		'Nail salons',
		'Hair salons',
		'Barbershops',
		'Massage',
		'Spa',
	];

	const salons = [
		{
			id: 1,
			name: 'Nail Studio "Glamour Nails"',
			address: 'Tverskaya St, 1, Moscow',
			rating: 4.8,
			reviews: 120,
			description:
				'Professional nail care services with modern equipment and experienced specialists. We offer a wide range of nail art and design services.',
			image: '💅',
			services: [
				{ name: 'Classic Manicure', price: '$40' },
				{ name: 'Gel Pedicure', price: '$65' },
				{ name: 'Nail Art Design', price: '$25+' },
			],
		},
		{
			id: 2,
			name: 'Nail Bar "Chic Nails"',
			address: 'Arbat St, 15, Moscow',
			rating: 4.7,
			reviews: 95,
			description:
				'Elegant nail salon with a cozy atmosphere. Our specialists provide high-quality nail care services using premium products.',
			image: '✨',
			services: [
				{ name: 'Express Manicure', price: '$30' },
				{ name: 'French Manicure', price: '$50' },
				{ name: 'Spa Pedicure', price: '$75' },
			],
		},
		{
			id: 3,
			name: 'Nail Salon "Elegant Touch"',
			address: 'Kuznetsky Most, 20, Moscow',
			rating: 4.9,
			reviews: 150,
			description:
				'Luxury nail salon offering personalized nail care services. We specialize in intricate nail art and premium treatments.',
			image: '💎',
			services: [
				{ name: 'Classic Manicure', price: '$45' },
				{ name: 'Paraffin Therapy', price: '$35' },
				{ name: 'Nail Repair', price: '$15' },
			],
		},
	];

	const handleBookService = (service) => {
		setSelectedService(service);
		setIsBookingModalOpen(true);
	};

	return (
		<div className="min-h-screen bg-[#F8F5F2]">
			<PublicHeader />

			<main className="py-8 px-6">
				<div className="mx-auto max-w-6xl">
					{/* Search Bar */}
					<div className="mb-8">
						<div className="relative max-w-2xl mx-auto">
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full px-6 py-4 pl-12 pr-12 bg-white rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8B4513] focus:border-transparent text-lg"
								placeholder="Search for salons, services, or locations"
							/>
							<svg
								className="absolute left-4 top-4 h-6 w-6 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
							{searchQuery && (
								<button
									onClick={() => setSearchQuery('')}
									className="absolute right-4 top-4 h-6 w-6 text-gray-400 hover:text-gray-600"
								>
									✕
								</button>
							)}
						</div>
					</div>

					{/* Category Filters */}
					<div className="mb-8">
						<div className="flex flex-wrap gap-3 justify-center">
							{filters.map((filter) => (
								<button
									key={filter}
									onClick={() => setActiveFilter(filter)}
									className={`px-6 py-3 rounded-full text-sm font-medium transition-colors ${
										activeFilter === filter
											? 'bg-[#ff5b5b] text-white'
											: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
									}`}
								>
									{filter}
								</button>
							))}
						</div>
					</div>

					{/* Results Header */}
					<div className="flex items-center justify-between mb-8">
						<h1 className="text-2xl font-bold text-gray-900">
							Results ({salons.length})
						</h1>
						<div className="flex items-center gap-4">
							<button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
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
										d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
									/>
								</svg>
								Sort
							</button>
							<button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
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
										d="M4 6h16M4 12h16M4 18h16"
									/>
								</svg>
								Filters
							</button>
						</div>
					</div>

					{/* Salon Cards */}
					<div className="space-y-6">
						{salons.map((salon) => (
							<div
								key={salon.id}
								className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
							>
								<div className="flex gap-6">
									{/* Salon Image */}
									<div className="w-48 h-48 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl flex items-center justify-center flex-shrink-0">
										<span className="text-6xl">{salon.image}</span>
									</div>

									{/* Salon Info */}
									<div className="flex-1">
										<h2 className="text-xl font-bold text-gray-900 mb-2">
											{salon.name}
										</h2>
										<p className="text-gray-600 text-sm mb-2">
											{salon.address}
										</p>
										<div className="flex items-center gap-2 mb-3">
											<div className="flex text-yellow-400">
												{'★'.repeat(Math.floor(salon.rating))}
											</div>
											<span className="text-sm text-gray-600">
												{salon.rating} ({salon.reviews} reviews)
											</span>
										</div>
										<p className="text-gray-700 text-sm mb-4 leading-relaxed">
											{salon.description}
										</p>

										{/* Services */}
										<div className="space-y-3">
											{salon.services.map((service, index) => (
												<div
													key={index}
													className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
												>
													<div className="flex items-center gap-3">
														<span className="text-sm text-gray-700">
															{service.name}
														</span>
														<span className="text-sm font-semibold text-[#ff5b5b]">
															{service.price}
														</span>
													</div>
													<button
														onClick={() => handleBookService(service)}
														className="bg-[#ff5b5b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e04a4a] transition-colors"
													>
														Book Now
													</button>
												</div>
											))}
										</div>
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Load More Button */}
					<div className="text-center mt-12">
						<button className="bg-[#ff5b5b] text-white px-8 py-4 rounded-2xl font-medium hover:bg-[#e04a4a] transition-colors">
							Load more
						</button>
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
				service={selectedService}
			/>
		</div>
	);
}
