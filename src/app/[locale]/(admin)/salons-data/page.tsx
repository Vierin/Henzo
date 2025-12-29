'use client';

import { useState, useMemo } from 'react';
import { useAdminSalons, type AdminSalon } from '@/hooks/useAdmin';
import { useTranslation } from '@/contexts/LanguageContext';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
	X,
	MapPin,
	Phone,
	Mail,
	Globe,
	Instagram,
	Calendar,
	Users,
	Scissors,
	Star,
} from 'lucide-react';

export default function AdminSalons() {
	const t = useTranslation();
	const { data: salons = [], isLoading, error } = useAdminSalons();

	// Filter and sort states
	const [searchTerm, setSearchTerm] = useState('');
	const [sortBy, setSortBy] = useState<
		'name' | 'createdAt' | 'bookings' | 'services' | 'staff' | 'reviews'
	>('createdAt');
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
	const [statusFilter, setStatusFilter] = useState<
		'all' | 'active' | 'inactive'
	>('all');

	// Modal state for salon details
	const [selectedSalon, setSelectedSalon] = useState<AdminSalon | null>(null);
	const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

	// Filter and sort salons
	const filteredSalons = useMemo(() => {
		let filtered = [...salons];

		// Search filter
		if (searchTerm) {
			filtered = filtered.filter(
				(salon) =>
					salon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					salon.owner?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					salon.owner?.email
						?.toLowerCase()
						.includes(searchTerm.toLowerCase()) ||
					salon.address?.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		// Status filter (assuming active = has bookings, inactive = no bookings)
		if (statusFilter === 'active') {
			filtered = filtered.filter((salon) => (salon._count?.bookings || 0) > 0);
		} else if (statusFilter === 'inactive') {
			filtered = filtered.filter(
				(salon) => (salon._count?.bookings || 0) === 0
			);
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
					aValue = a._count?.bookings ?? 0;
					bValue = b._count?.bookings ?? 0;
					break;
				case 'services':
					aValue = a._count?.services ?? 0;
					bValue = b._count?.services ?? 0;
					break;
				case 'staff':
					aValue = a._count?.staff ?? 0;
					bValue = b._count?.staff ?? 0;
					break;
				case 'reviews':
					aValue = a._count?.reviews ?? 0;
					bValue = b._count?.reviews ?? 0;
					break;
				default:
					aValue = a.name.toLowerCase();
					bValue = b.name.toLowerCase();
			}

			if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
			if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
			return 0;
		});

		return filtered;
	}, [salons, searchTerm, sortBy, sortOrder, statusFilter]);

	const handleViewDetails = (salon: AdminSalon) => {
		setSelectedSalon(salon);
		setIsDetailModalOpen(true);
	};

	const handleCloseModal = () => {
		setSelectedSalon(null);
		setIsDetailModalOpen(false);
	};

	if (isLoading) {
		return <LoadingSpinner size="lg" message="Loading salons..." />;
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
				<p className="text-gray-600">
					{error instanceof Error ? error.message : 'Failed to load salons'}
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-3xl font-bold text-gray-900">
					{t('salon.allSalons')}
				</h1>
				<div className="text-sm text-gray-500">
					Showing: {filteredSalons.length} of {salons.length} salons
				</div>
			</div>

			{/* Filters and Sorting */}
			<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
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
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
						/>
					</div>

					{/* Sort By */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Sort By
						</label>
						<Select
							value={sortBy}
							onValueChange={(
								value:
									| 'name'
									| 'createdAt'
									| 'bookings'
									| 'services'
									| 'staff'
									| 'reviews'
							) => setSortBy(value)}
						>
							<SelectTrigger className="w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900">
								<SelectValue />
							</SelectTrigger>
							<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
								<SelectItem
									value="createdAt"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									Date Created
								</SelectItem>
								<SelectItem
									value="name"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									Name
								</SelectItem>
								<SelectItem
									value="bookings"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									Bookings
								</SelectItem>
								<SelectItem
									value="services"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									Services
								</SelectItem>
								<SelectItem
									value="staff"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									Staff
								</SelectItem>
								<SelectItem
									value="reviews"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									Reviews
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Sort Order */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Order
						</label>
						<Select
							value={sortOrder}
							onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}
						>
							<SelectTrigger className="w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900">
								<SelectValue />
							</SelectTrigger>
							<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
								<SelectItem
									value="desc"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									Descending
								</SelectItem>
								<SelectItem
									value="asc"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									Ascending
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Status Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Status
						</label>
						<Select
							value={statusFilter}
							onValueChange={(value: 'all' | 'active' | 'inactive') =>
								setStatusFilter(value)
							}
						>
							<SelectTrigger className="w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900">
								<SelectValue />
							</SelectTrigger>
							<SelectContent className="bg-white border border-gray-300 shadow-lg rounded-md">
								<SelectItem
									value="all"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									{t('salon.allSalons')}
								</SelectItem>
								<SelectItem
									value="active"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									Active (has bookings)
								</SelectItem>
								<SelectItem
									value="inactive"
									className="bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 cursor-pointer"
								>
									Inactive (no bookings)
								</SelectItem>
							</SelectContent>
						</Select>
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
							className="px-4 py-2 text-sm text-[#ff5b5b] hover:text-white hover:bg-[#ff5b5b] font-medium border border-[#ff5b5b] rounded-lg transition-colors"
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
											<div className="ml-4">
												<div className="flex items-center">
													<p className="text-sm font-medium text-gray-900 truncate">
														{salon.name}
													</p>
												</div>
												<div className="mt-1">
													<p className="text-xs text-gray-500">
														Owner:{' '}
														{salon.owner?.name ||
															salon.owner?.email ||
															'Unknown'}
													</p>
												</div>
											</div>
										</div>
										<div className="flex items-center space-x-6">
											<div className="text-sm text-gray-500">
												<div>Bookings: {salon._count?.bookings ?? 0}</div>
												<div>Services: {salon._count?.services ?? 0}</div>
											</div>
											<div className="text-sm text-gray-500">
												<div>Staff: {salon._count?.staff ?? 0}</div>
												<div>Reviews: {salon._count?.reviews ?? 0}</div>
											</div>
											<div className="text-sm text-gray-500">
												<div>
													{new Date(salon.createdAt).toLocaleDateString(
														'en-GB'
													)}
												</div>
											</div>
											<div className="flex space-x-2">
												<button
													onClick={() => handleViewDetails(salon)}
													className="px-3 py-1.5 text-sm font-medium text-[#ff5b5b] hover:text-white hover:bg-[#ff5b5b] border border-[#ff5b5b] rounded-lg transition-colors"
												>
													View Details
												</button>
												<button className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-white hover:bg-gray-700 border border-gray-300 rounded-lg transition-colors">
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

			{/* Salon Details Modal */}
			{isDetailModalOpen && selectedSalon && (
				<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
						<div className="p-6">
							{/* Modal Header */}
							<div className="flex items-center justify-between mb-6">
								<h2 className="text-2xl font-bold text-gray-900">
									{selectedSalon.name}
								</h2>
								<button
									onClick={handleCloseModal}
									className="text-gray-400 hover:text-gray-600 transition-colors"
								>
									<X className="w-6 h-6" />
								</button>
							</div>

							{/* Salon Information Grid */}
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
								{/* Left Column - Basic Info */}
								<div className="space-y-6">
									{/* Contact Information */}
									<div className="bg-gray-50 rounded-lg p-4">
										<h4 className="text-sm font-medium text-gray-900 mb-3">
											Contact Information
										</h4>
										<div className="space-y-2">
											{selectedSalon.address && (
												<div className="flex items-center space-x-2 text-sm text-gray-600">
													<MapPin className="w-4 h-4" />
													<span>{selectedSalon.address}</span>
												</div>
											)}
											{selectedSalon.phone && (
												<div className="flex items-center space-x-2 text-sm text-gray-600">
													<Phone className="w-4 h-4" />
													<span>{selectedSalon.phone}</span>
												</div>
											)}
											{selectedSalon.email && (
												<div className="flex items-center space-x-2 text-sm text-gray-600">
													<Mail className="w-4 h-4" />
													<span>{selectedSalon.email}</span>
												</div>
											)}
											{selectedSalon.website && (
												<div className="flex items-center space-x-2 text-sm text-gray-600">
													<Globe className="w-4 h-4" />
													<a
														href={selectedSalon.website}
														target="_blank"
														rel="noopener noreferrer"
														className="text-blue-600 hover:text-blue-800"
													>
														{selectedSalon.website}
													</a>
												</div>
											)}
											{selectedSalon.instagram && (
												<div className="flex items-center space-x-2 text-sm text-gray-600">
													<Instagram className="w-4 h-4" />
													<a
														href={`https://instagram.com/${selectedSalon.instagram.replace('@', '')}`}
														target="_blank"
														rel="noopener noreferrer"
														className="text-blue-600 hover:text-blue-800"
													>
														{selectedSalon.instagram}
													</a>
												</div>
											)}
										</div>
									</div>

									{/* Owner Information */}
									<div className="bg-gray-50 rounded-lg p-4">
										<h4 className="text-sm font-medium text-gray-900 mb-3">
											Owner Information
										</h4>
										<div className="space-y-2">
											<div className="text-sm text-gray-600">
												<span className="font-medium">Name:</span>{' '}
												{selectedSalon.owner?.name || 'Not provided'}
											</div>
											<div className="text-sm text-gray-600">
												<span className="font-medium">Email:</span>{' '}
												{selectedSalon.owner?.email || 'Not provided'}
											</div>
										</div>
									</div>

									{/* Subscription Information */}
									<div className="bg-gray-50 rounded-lg p-4">
										<h4 className="text-sm font-medium text-gray-900 mb-3">
											Subscription
										</h4>
										<div className="space-y-2">
											<div className="text-sm text-gray-600">
												<span className="font-medium">Type:</span>{' '}
												{selectedSalon.subscription?.type ? (
													<span
														className={`px-2 py-0.5 text-xs font-medium rounded ${
															selectedSalon.subscription.type === 'ENTERPRISE'
																? 'bg-purple-100 text-purple-800'
																: selectedSalon.subscription.type === 'BASIC'
																	? 'bg-blue-100 text-blue-800'
																	: 'bg-gray-100 text-gray-800'
														}`}
													>
														{selectedSalon.subscription.type}
													</span>
												) : (
													<span className="text-gray-400">Not assigned</span>
												)}
											</div>
											<div className="text-sm text-gray-600">
												<span className="font-medium">Status:</span>{' '}
												{selectedSalon.subscription?.status ? (
													<span
														className={`px-2 py-0.5 text-xs font-medium rounded ${
															selectedSalon.subscription.status === 'ACTIVE'
																? 'bg-green-100 text-green-800'
																: selectedSalon.subscription.status ===
																	  'INACTIVE'
																	? 'bg-gray-100 text-gray-800'
																	: 'bg-red-100 text-red-800'
														}`}
													>
														{selectedSalon.subscription.status}
													</span>
												) : (
													<span className="text-gray-400">Unknown</span>
												)}
											</div>
										</div>
									</div>
								</div>

								{/* Right Column - Statistics */}
								<div className="space-y-6">
									{/* Statistics */}
									<div className="bg-gray-50 rounded-lg p-4">
										<h4 className="text-sm font-medium text-gray-900 mb-4">
											Salon Statistics
										</h4>
										<div className="grid grid-cols-2 gap-4">
											<div className="text-center p-3 bg-white rounded-lg">
												<div className="flex items-center justify-center mb-2">
													<Calendar className="w-5 h-5 text-blue-600" />
												</div>
												<div className="text-2xl font-bold text-gray-900">
													{selectedSalon._count?.bookings ?? 0}
												</div>
												<div className="text-xs text-gray-600">Bookings</div>
											</div>
											<div className="text-center p-3 bg-white rounded-lg">
												<div className="flex items-center justify-center mb-2">
													<Scissors className="w-5 h-5 text-green-600" />
												</div>
												<div className="text-2xl font-bold text-gray-900">
													{selectedSalon._count?.services ?? 0}
												</div>
												<div className="text-xs text-gray-600">Services</div>
											</div>
											<div className="text-center p-3 bg-white rounded-lg">
												<div className="flex items-center justify-center mb-2">
													<Users className="w-5 h-5 text-[#ff5b5b]" />
												</div>
												<div className="text-2xl font-bold text-gray-900">
													{selectedSalon._count?.staff ?? 0}
												</div>
												<div className="text-xs text-gray-600">Staff</div>
											</div>
											<div className="text-center p-3 bg-white rounded-lg">
												<div className="flex items-center justify-center mb-2">
													<Star className="w-5 h-5 text-yellow-600" />
												</div>
												<div className="text-2xl font-bold text-gray-900">
													{selectedSalon._count?.reviews ?? 0}
												</div>
												<div className="text-xs text-gray-600">Reviews</div>
											</div>
										</div>
									</div>

									{/* Working Hours */}
									{selectedSalon.workingHours && (
										<div className="bg-gray-50 rounded-lg p-4">
											<h4 className="text-sm font-medium text-gray-900 mb-3">
												Working Hours
											</h4>
											<div className="space-y-1 text-sm text-gray-600">
												{selectedSalon.workingHours &&
												typeof selectedSalon.workingHours === 'object' ? (
													Object.entries(selectedSalon.workingHours).map(
														([day, hours]: [string, any]) => (
															<div key={day} className="flex justify-between">
																<span className="capitalize font-medium">
																	{day}:
																</span>
																<span>
																	{hours
																		? `${hours.open || 'Closed'}-${hours.close || 'Closed'}`
																		: 'Closed'}
																</span>
															</div>
														)
													)
												) : (
													<div className="text-gray-500">
														No working hours set
													</div>
												)}
											</div>
										</div>
									)}
								</div>
							</div>

							{/* Modal Footer */}
							<div className="mt-8 pt-6 border-t border-gray-200 flex justify-end space-x-3">
								<button
									onClick={handleCloseModal}
									className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
								>
									Close
								</button>
								<button className="px-4 py-2 bg-[#ff5b5b] text-white rounded-lg hover:bg-[#ea4b4b] transition-colors font-medium">
									Edit Salon
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
