'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PublicHeader from '../../components/PublicHeader';

export default function ClientPage() {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		// Check if user is logged in
		// For now, we'll just set loading to false
		setLoading(false);
	}, []);

	if (loading) {
		return (
			<div className="min-h-screen bg-[#F8F5F2] flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5b5b] mx-auto mb-4"></div>
					<p className="text-gray-600">Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#F8F5F2]">
			<PublicHeader />

			<main className="py-16 px-6">
				<div className="mx-auto max-w-6xl">
					<div className="text-center mb-12">
						<h1 className="text-4xl font-bold text-gray-900 mb-4">
							Book Your Beauty Appointment
						</h1>
						<p className="text-lg text-gray-700">
							Choose from our network of top-rated beauty salons and book your
							perfect appointment
						</p>
					</div>

					{/* Search and Filter Section */}
					<div className="bg-white rounded-2xl p-8 mb-12 shadow-lg">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Service
								</label>
								<select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B4513]">
									<option>All Services</option>
									<option>Haircut</option>
									<option>Manicure</option>
									<option>Facial</option>
									<option>Massage</option>
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Location
								</label>
								<input
									type="text"
									placeholder="Enter your city"
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B4513]"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Date
								</label>
								<input
									type="date"
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B4513]"
								/>
							</div>
						</div>
						<div className="mt-6 text-center">
							<button className="bg-[#8B4513] text-white px-8 py-3 rounded-lg font-medium hover:bg-[#6B3410] transition-colors">
								Search Salons
							</button>
						</div>
					</div>

					{/* Featured Salons */}
					<div className="mb-12">
						<h2 className="text-3xl font-bold text-gray-900 mb-8">
							Featured Salons
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
								<div className="h-48 bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center">
									<span className="text-6xl">💇‍♀️</span>
								</div>
								<div className="p-6">
									<h3 className="text-xl font-bold text-gray-900 mb-2">
										"Orchid" Beauty Salon
									</h3>
									<p className="text-[#ff5b5b] text-sm mb-3">
										12 Lenin St, Moscow
									</p>
									<div className="flex items-center mb-4">
										<div className="flex text-yellow-400">{'★'.repeat(5)}</div>
										<span className="text-sm text-gray-600 ml-2">
											4.8 (124 reviews)
										</span>
									</div>
									<div className="flex gap-2 mb-4">
										<span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
											Haircut
										</span>
										<span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
											Manicure
										</span>
										<span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
											Facial
										</span>
									</div>
									<a
										href="/salons"
										className="block w-full bg-[#8B4513] text-white py-2 rounded-lg hover:bg-[#6B3410] transition-colors text-center"
									>
										Book Now
									</a>
								</div>
							</div>

							<div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
								<div className="h-48 bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
									<span className="text-6xl">✂️</span>
								</div>
								<div className="p-6">
									<h3 className="text-xl font-bold text-gray-900 mb-2">
										"Style" Barbershop
									</h3>
									<p className="text-[#ff5b5b] text-sm mb-3">
										34 Pushkin St, Moscow
									</p>
									<div className="flex items-center mb-4">
										<div className="flex text-yellow-400">{'★'.repeat(4)}</div>
										<span className="text-sm text-gray-600 ml-2">
											4.6 (89 reviews)
										</span>
									</div>
									<div className="flex gap-2 mb-4">
										<span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
											Haircut
										</span>
										<span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
											Beard
										</span>
									</div>
									<a
										href="/salons"
										className="block w-full bg-[#8B4513] text-white py-2 rounded-lg hover:bg-[#6B3410] transition-colors text-center"
									>
										Book Now
									</a>
								</div>
							</div>

							<div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
								<div className="h-48 bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
									<span className="text-6xl">🧘‍♀️</span>
								</div>
								<div className="p-6">
									<h3 className="text-xl font-bold text-gray-900 mb-2">
										"Relax" Spa Center
									</h3>
									<p className="text-[#ff5b5b] text-sm mb-3">
										56 Turgenev St, Moscow
									</p>
									<div className="flex items-center mb-4">
										<div className="flex text-yellow-400">{'★'.repeat(5)}</div>
										<span className="text-sm text-gray-600 ml-2">
											4.9 (203 reviews)
										</span>
									</div>
									<div className="flex gap-2 mb-4">
										<span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
											Massage
										</span>
										<span className="px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded-full">
											Facial
										</span>
										<span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
											Spa
										</span>
									</div>
									<a
										href="/salons"
										className="block w-full bg-[#8B4513] text-white py-2 rounded-lg hover:bg-[#6B3410] transition-colors text-center"
									>
										Book Now
									</a>
								</div>
							</div>
						</div>
					</div>

					{/* My Appointments Section */}
					{user && (
						<div className="bg-white rounded-2xl p-8 shadow-lg">
							<h2 className="text-2xl font-bold text-gray-900 mb-6">
								My Appointments
							</h2>
							<div className="text-center py-8">
								<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
									<span className="text-2xl">📅</span>
								</div>
								<p className="text-gray-600 mb-4">
									You don't have any appointments yet
								</p>
								<a
									href="/salons"
									className="inline-block bg-[#8B4513] text-white px-6 py-2 rounded-lg hover:bg-[#6B3410] transition-colors"
								>
									Book Your First Appointment
								</a>
							</div>
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
