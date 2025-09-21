'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PublicHeader from '../../components/PublicHeader';
import { supabase } from '@/lib/supabase';

export default function ClientPage() {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [salons, setSalons] = useState([]);
	const [salonsLoading, setSalonsLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		const checkAuth = async () => {
			try {
				// Check if user is logged in
				const {
					data: { session },
				} = await supabase.auth.getSession();

				if (!session) {
					router.push('/client/login');
					return;
				}

				// Get user data
				const response = await fetch('/api/user');
				const result = await response.json();

				if (!response.ok) {
					throw new Error(result.error || 'Failed to get user data');
				}

				// Check if user is a client
				if (result.user.role !== 'CLIENT') {
					router.push('/owner');
					return;
				}

				setUser(result.user);
			} catch (error) {
				console.error('Auth check error:', error);
				router.push('/client/login');
			} finally {
				setLoading(false);
			}
		};

		const fetchSalons = async () => {
			try {
				setSalonsLoading(true);
				const response = await fetch('/api/salons/with-services');
				if (!response.ok) throw new Error('Failed to fetch salons');
				const data = await response.json();
				setSalons(data.salons || []);
			} catch (error) {
				console.error('Error fetching salons:', error);
				setSalons([]);
			} finally {
				setSalonsLoading(false);
			}
		};

		checkAuth();
		fetchSalons();
	}, [router]);

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

						{salonsLoading ? (
							<div className="text-center py-8">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B4513] mx-auto mb-4"></div>
								<p className="text-gray-600">Loading salons...</p>
							</div>
						) : salons.length === 0 ? (
							<div className="text-center py-8">
								<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
									<span className="text-2xl">🏪</span>
								</div>
								<h3 className="text-xl font-semibold text-gray-900 mb-2">
									No salons available
								</h3>
								<p className="text-gray-600">
									Check back later for available salons.
								</p>
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								{salons.slice(0, 3).map((salon) => (
									<div
										key={salon.id}
										className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
									>
										<div className="h-48 bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center">
											{salon.logo ? (
												<img
													src={salon.logo}
													alt={salon.name}
													className="w-full h-full object-cover"
												/>
											) : (
												<span className="text-6xl">💇‍♀️</span>
											)}
										</div>
										<div className="p-6">
											<h3 className="text-xl font-bold text-gray-900 mb-2">
												{salon.name}
											</h3>
											<p className="text-[#ff5b5b] text-sm mb-3">
												{salon.address}
											</p>
											{salon.phone && (
												<p className="text-gray-500 text-xs mb-3">
													📞 {salon.phone}
												</p>
											)}
											{salon.services && salon.services.length > 0 && (
												<div className="flex flex-wrap gap-2 mb-4">
													{salon.services.slice(0, 3).map((service, index) => (
														<span
															key={service.id || index}
															className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
														>
															{service.name}
														</span>
													))}
													{salon.services.length > 3 && (
														<span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
															+{salon.services.length - 3} more
														</span>
													)}
												</div>
											)}
											<a
												href="/salons"
												className="block w-full bg-[#8B4513] text-white py-2 rounded-lg hover:bg-[#6B3410] transition-colors text-center"
											>
												View All Services
											</a>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{/* My Appointments Section */}
					<div className="bg-white rounded-2xl p-8 shadow-lg">
						<h2 className="text-2xl font-bold text-gray-900 mb-6">
							My Appointments
						</h2>

						{user && user.bookings && user.bookings.length > 0 ? (
							<div className="space-y-4">
								{user.bookings.slice(0, 3).map((booking) => (
									<div
										key={booking.id}
										className="border border-gray-200 rounded-lg p-4"
									>
										<div className="flex justify-between items-start">
											<div>
												<h3 className="font-semibold text-gray-900">
													{booking.service.name}
												</h3>
												<p className="text-sm text-gray-600">
													{booking.salon.name}
												</p>
												<p className="text-sm text-gray-500">
													{new Date(booking.time).toLocaleDateString()} at{' '}
													{new Date(booking.time).toLocaleTimeString([], {
														hour: '2-digit',
														minute: '2-digit',
													})}
												</p>
											</div>
											<span
												className={`px-2 py-1 rounded-full text-xs font-medium ${
													booking.status === 'CONFIRMED'
														? 'bg-green-100 text-green-800'
														: booking.status === 'PENDING'
															? 'bg-yellow-100 text-yellow-800'
															: 'bg-red-100 text-red-800'
												}`}
											>
												{booking.status}
											</span>
										</div>
									</div>
								))}
								{user.bookings.length > 3 && (
									<div className="text-center pt-4">
										<a
											href="/client/history"
											className="text-[#ff5b5b] hover:text-[#e04a4a] font-medium"
										>
											View all {user.bookings.length} appointments
										</a>
									</div>
								)}
							</div>
						) : (
							<div className="text-center py-8">
								<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
									<span className="text-2xl">📅</span>
								</div>
								<p className="text-gray-600 mb-4">
									You don't have any appointments yet
								</p>
								<div className="flex gap-4 justify-center">
									<a
										href="/salons"
										className="inline-block bg-[#8B4513] text-white px-6 py-2 rounded-lg hover:bg-[#6B3410] transition-colors"
									>
										Book Your First Appointment
									</a>
									<a
										href="/client/history"
										className="inline-block bg-[#ff5b5b] text-white px-6 py-2 rounded-lg hover:bg-[#e04a4a] transition-colors"
									>
										View Visit History
									</a>
								</div>
							</div>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}
