'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import SalonLogo from '@/components/admin/SalonLogo';

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
	const [filteredSalons, setFilteredSalons] = useState<Salon[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Filter and sort states
	const [searchTerm, setSearchTerm] = useState('');
	const [sortBy, setSortBy] = useState<
		'name' | 'createdAt' | 'bookings' | 'services' | 'staff' | 'reviews'
	>('createdAt');
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
	const [statusFilter, setStatusFilter] = useState<
		'all' | 'active' | 'inactive'
	>('all');

	useEffect(() => {
		const fetchSalons = async () => {
			try {
				const data = await apiClient.get<Salon[]>('/admin/salons');
				setSalons(data);
				setFilteredSalons(data);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to load salons');
			} finally {
				setLoading(false);
			}
		};

		fetchSalons();
	}, []);

	// Filter and sort salons
	useEffect(() => {
		let filtered = [...salons];

		// Search filter
		if (searchTerm) {
			filtered = filtered.filter(
				(salon) =>
					salon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					salon.owner.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					salon.owner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
					salon.address?.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		// Status filter (assuming active = has bookings, inactive = no bookings)
		if (statusFilter === 'active') {
			filtered = filtered.filter((salon) => salon._count.bookings > 0);
		} else if (statusFilter === 'inactive') {
			filtered = filtered.filter((salon) => salon._count.bookings === 0);
		}

		// Sort
		filtered.sort((a, b) => {
			let aValue: any;
			let bValue: any;

			switch (sortBy) {
				case 'name':
					aValue = a.name.toLowerCase();
					bValue = b.name.toLowerCase();
					break;
				case 'createdAt':
					aValue = new Date(a.createdAt).getTime();
					bValue = new Date(b.createdAt).getTime();
					break;
				case 'bookings':
					aValue = a._count.bookings;
					bValue = b._count.bookings;
					break;
				case 'services':
					aValue = a._count.services;
					bValue = b._count.services;
					break;
				case 'staff':
					aValue = a._count.staff;
					bValue = b._count.staff;
					break;
				case 'reviews':
					aValue = a._count.reviews;
					bValue = b._count.reviews;
					break;
				default:
					aValue = a.name.toLowerCase();
					bValue = b.name.toLowerCase();
			}

			if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
			if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
			return 0;
		});

		setFilteredSalons(filtered);
	}, [salons, searchTerm, sortBy, sortOrder, statusFilter]);

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
					Showing: {filteredSalons.length} of {salons.length} salons
				</div>
			</div>

			{/* Filters and Sorting */}
			<div className="bg-white p-6 rounded-lg shadow-sm border">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					{/* Search */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Search
						</label>
						<input
							type="text"
							placeholder="Search salons, owners, addresses..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
						/>
					</div>

					{/* Sort By */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Sort By
						</label>
						<select
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value as any)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
						>
							<option value="createdAt">Date Created</option>
							<option value="name">Name</option>
							<option value="bookings">Bookings</option>
							<option value="services">Services</option>
							<option value="staff">Staff</option>
							<option value="reviews">Reviews</option>
						</select>
					</div>

					{/* Sort Order */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Order
						</label>
						<select
							value={sortOrder}
							onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
						>
							<option value="desc">Descending</option>
							<option value="asc">Ascending</option>
						</select>
					</div>

					{/* Status Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Status
						</label>
						<select
							value={statusFilter}
							onChange={(e) =>
								setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')
							}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
						>
							<option value="all">All Salons</option>
							<option value="active">Active (has bookings)</option>
							<option value="inactive">Inactive (no bookings)</option>
						</select>
					</div>
				</div>

				{/* Clear Filters */}
				{(searchTerm ||
					statusFilter !== 'all' ||
					sortBy !== 'createdAt' ||
					sortOrder !== 'desc') && (
					<div className="mt-4 pt-4 border-t border-gray-200">
						<button
							onClick={() => {
								setSearchTerm('');
								setStatusFilter('all');
								setSortBy('createdAt');
								setSortOrder('desc');
							}}
							className="text-sm text-orange-600 hover:text-orange-800 font-medium"
						>
							Clear all filters
						</button>
					</div>
				)}
			</div>

			<div className="bg-white shadow overflow-hidden sm:rounded-md">
				{filteredSalons.length === 0 ? (
					<div className="text-center py-12">
						<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<span className="text-2xl">🔍</span>
						</div>
						<h3 className="text-lg font-medium text-gray-900 mb-2">
							No salons found
						</h3>
						<p className="text-gray-500">
							Try adjusting your search criteria or filters.
						</p>
					</div>
				) : (
					<ul className="divide-y divide-gray-200">
						{filteredSalons.map((salon) => (
							<li key={salon.id}>
								<div className="px-4 py-4 sm:px-6">
									<div className="flex items-center justify-between">
										<div className="flex items-center">
											<div className="flex-shrink-0">
												<div
													className={`w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center`}
												>
													<span className="text-gray-400 text-lg">🏢</span>
												</div>
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
													{new Date(salon.createdAt).toLocaleDateString(
														'en-GB'
													)}
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
				)}
			</div>
		</div>
	);
}
