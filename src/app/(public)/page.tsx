'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Service {
	id: string;
	name: string;
	description?: string;
	duration: number;
	price: number;
}

interface Salon {
	id: string;
	name: string;
	address?: string;
	phone?: string;
	logo?: string;
	services?: Service[];
}

export default function HomePage() {
	const [searchQuery, setSearchQuery] = useState('');
	const router = useRouter();

	// Mock data for demonstration
	const recommendedSalons: Salon[] = [
		{
			id: '1',
			name: 'Beauty Studio',
			address: '123 Main St, City',
			phone: '+1 (555) 123-4567',
			services: [
				{ id: '1', name: 'Haircut', duration: 60, price: 50 },
				{ id: '2', name: 'Styling', duration: 30, price: 30 },
			],
		},
		{
			id: '2',
			name: 'Elegant Salon',
			address: '456 Oak Ave, City',
			phone: '+1 (555) 987-6543',
			services: [
				{ id: '3', name: 'Manicure', duration: 45, price: 25 },
				{ id: '4', name: 'Pedicure', duration: 60, price: 35 },
			],
		},
		{
			id: '3',
			name: 'Modern Spa',
			address: '789 Pine St, City',
			phone: '+1 (555) 456-7890',
			services: [
				{ id: '5', name: 'Facial', duration: 90, price: 80 },
				{ id: '6', name: 'Massage', duration: 60, price: 70 },
			],
		},
	];

	const handleSalonClick = (salonId: string) => {
		router.push(`/salon/${salonId}`);
	};

	const handleBookService = (salon: Salon) => {
		// Redirect to salon page for booking
		router.push(`/salon/${salon.id}`);
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			router.push(`/salons?search=${encodeURIComponent(searchQuery.trim())}`);
		}
	};

	return (
		<>
			{/* Hero Section */}
			<section className="relative bg-gradient-to-br from-[#ff5b5b] to-[#ff8a80] text-white py-20">
				<div className="mx-auto max-w-7xl px-6">
					<div className="text-center">
						<h1 className="text-5xl font-bold mb-6">Find Your Perfect Salon</h1>
						<p className="text-xl mb-8 opacity-90">
							Book appointments at top-rated salons near you
						</p>

						{/* Search Bar */}
						<form onSubmit={handleSearch} className="max-w-2xl mx-auto">
							<div className="flex gap-4">
								<div className="flex-1 relative">
									<input
										type="text"
										placeholder="Search for salons, services, or locations..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="w-full px-6 py-4 rounded-full text-gray-900 focus:outline-none focus:ring-4 focus:ring-white/20"
									/>
								</div>
								<button
									type="submit"
									className="bg-white text-[#ff5b5b] px-8 py-4 rounded-full font-semibold hover:bg-gray-100 transition-colors"
								>
									Search
								</button>
							</div>
						</form>
					</div>
				</div>
			</section>

			{/* Recommended Salons */}
			<section className="py-16">
				<div className="mx-auto max-w-7xl px-6">
					<div className="text-center mb-12">
						<h2 className="text-3xl font-bold text-gray-900 mb-4">
							Recommended Salons
						</h2>
						<p className="text-gray-600">
							Discover top-rated salons in your area
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
						{recommendedSalons.map((salon) => (
							<div
								key={salon.id}
								className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
								onClick={() => handleSalonClick(salon.id)}
							>
								{/* Salon Logo/Image */}
								<div className="h-48 w-full bg-gradient-to-br from-orange-100 to-orange-200 rounded-t-xl flex items-center justify-center">
									<span className="text-4xl">💇‍♀️</span>
								</div>

								{/* Salon Info */}
								<div className="p-6">
									<h3 className="text-xl font-semibold text-gray-900 mb-2">
										{salon.name}
									</h3>
									{salon.address && (
										<p className="text-gray-600 text-sm mb-2">
											📍 {salon.address}
										</p>
									)}
									{salon.phone && (
										<p className="text-gray-600 text-sm mb-4">
											📞 {salon.phone}
										</p>
									)}

									{/* Services */}
									{salon.services && salon.services.length > 0 && (
										<div className="mb-4">
											<p className="text-sm font-medium text-gray-700 mb-2">
												Popular Services:
											</p>
											<div className="flex flex-wrap gap-1">
												{salon.services.slice(0, 3).map((service) => (
													<span
														key={service.id}
														className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
													>
														{service.name}
													</span>
												))}
												{salon.services.length > 3 && (
													<span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
														+{salon.services.length - 3} more
													</span>
												)}
											</div>
										</div>
									)}

									{/* Action Buttons */}
									<div className="flex gap-3">
										<button
											onClick={(e) => {
												e.stopPropagation();
												handleSalonClick(salon.id);
											}}
											className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
										>
											View Details
										</button>
										<button
											onClick={(e) => {
												e.stopPropagation();
												handleBookService(salon);
											}}
											className="flex-1 bg-[#ff5b5b] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
										>
											Book Now
										</button>
									</div>
								</div>
							</div>
						))}
					</div>

					{/* View All Salons Button */}
					{recommendedSalons.length > 0 && (
						<div className="text-center mt-12">
							<button
								onClick={() => router.push('/salons')}
								className="bg-[#ff5b5b] text-white px-8 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
							>
								View All Salons
							</button>
						</div>
					)}
				</div>
			</section>
		</>
	);
}
