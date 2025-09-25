'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface Salon {
	id: string;
	name: string;
	description?: string;
	address?: string;
	phone?: string;
	email?: string;
	website?: string;
	instagram?: string;
	logo?: string;
	photos: string[];
	workingHours?: any;
	owner: {
		id: string;
		name?: string;
		email: string;
	};
	_count: {
		bookings: number;
		reviews: number;
		staff: number;
		services: number;
	};
	createdAt: string;
}

export default function AdminSalons() {
	const [salons, setSalons] = useState<Salon[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchSalons = async () => {
			try {
				const data = await apiClient.get('/admin/salons');
				setSalons(data);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to load salons');
			} finally {
				setLoading(false);
			}
		};

		fetchSalons();
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5b5b]"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center py-12">
				<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<span className="text-2xl">⚠️</span>
				</div>
				<h3 className="text-xl font-semibold text-gray-900 mb-2">
					Error loading salons
				</h3>
				<p className="text-gray-600">{error}</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-3xl font-bold text-gray-900">All Salons</h1>
				<div className="text-sm text-gray-500">
					Total: {salons.length} salons
				</div>
			</div>

			<div className="bg-white shadow overflow-hidden sm:rounded-md">
				<ul className="divide-y divide-gray-200">
					{salons.map((salon) => (
						<li key={salon.id}>
							<div className="px-4 py-4 sm:px-6">
								<div className="flex items-center justify-between">
									<div className="flex items-center">
										<div className="flex-shrink-0 h-12 w-12">
											{salon.logo ? (
												<img
													className="h-12 w-12 rounded-lg object-cover"
													src={salon.logo}
													alt={salon.name}
												/>
											) : (
												<div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
													<span className="text-gray-400 text-lg">🏢</span>
												</div>
											)}
										</div>
										<div className="ml-4">
											<div className="flex items-center">
												<p className="text-sm font-medium text-gray-900 truncate">
													{salon.name}
												</p>
											</div>
											<div className="mt-1">
												<p className="text-sm text-gray-500">
													Owner: {salon.owner.name || salon.owner.email}
												</p>
												{salon.address && (
													<p className="text-sm text-gray-500">
														📍 {salon.address}
													</p>
												)}
											</div>
										</div>
									</div>
									<div className="flex items-center space-x-6">
										<div className="text-sm text-gray-500">
											<div>Bookings: {salon._count.bookings}</div>
											<div>Services: {salon._count.services}</div>
										</div>
										<div className="text-sm text-gray-500">
											<div>Staff: {salon._count.staff}</div>
											<div>Reviews: {salon._count.reviews}</div>
										</div>
										<div className="text-sm text-gray-500">
											<div>
												Created:{' '}
												{new Date(salon.createdAt).toLocaleDateString()}
											</div>
										</div>
										<div className="flex space-x-2">
											<button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
												View Details
											</button>
											<button className="text-green-600 hover:text-green-900 text-sm font-medium">
												Edit
											</button>
										</div>
									</div>
								</div>
							</div>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
