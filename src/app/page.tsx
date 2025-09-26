'use client';

import { useRouter } from 'next/navigation';
import PublicHeader from '../components/PublicHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorDisplay from '../components/ErrorDisplay';
import { useSalonsWithServices } from '@/hooks/useSalons';
import { STATIC_CATEGORIES } from '@/constants/categories';
import { supabase } from '@/lib/supabase';
import { Salon, Service } from '@/types';
import Image from 'next/image';
import { useState } from 'react';

export default function HomePage() {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<'treatments' | 'salon'>(
		'treatments'
	);
	const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [location, setLocation] = useState('');
	const [date, setDate] = useState('');

	const categories = STATIC_CATEGORIES;
	const {
		data: salons = [],
		isLoading: loading,
		error,
		refetch,
	} = useSalonsWithServices();

	const handleSalonClick = (salonId: string) => {
		router.push(`/salon/${salonId}`);
	};

	const handleSearch = () => {
		const params = new URLSearchParams();

		if (activeTab === 'treatments') {
			if (selectedCategory) {
				const category = categories.find((cat) => cat.id === selectedCategory);
				if (category) {
					params.set('category', category.name);
				}
			}
			if (searchQuery) {
				params.set('search', searchQuery);
			}
		} else {
			if (searchQuery) {
				params.set('salon', searchQuery);
			}
		}

		if (location) {
			params.set('location', location);
		}
		if (date) {
			params.set('date', date);
		}

		router.push(`/salons?${params.toString()}`);
	};

	const getPublicUrl = (filePath: string) => {
		const { data } = supabase.storage
			.from('salon-files')
			.getPublicUrl(filePath);
		return data.publicUrl;
	};

	const getSalonImage = (salon: Salon): string | undefined => {
		// If salon has photos, use the first photo
		if (salon.photos && salon.photos.length > 0) {
			return getPublicUrl(salon.photos[0]);
		}
		// If no photos but has logo, use logo
		if (salon.logo) {
			return getPublicUrl(salon.logo);
		}
		// No images available
		return undefined;
	};

	return (
		<div className="min-h-screen bg-[#F8F5F2]">
			<PublicHeader />

			<main>
				{/* Hero Section */}
				<section className="py-16 px-6 bg-[#F8F5F2]">
					<div className="mx-auto max-w-7xl">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
							{/* Left Panel - Search/Booking Form */}
							<div className="bg-white rounded-2xl p-8 shadow-lg">
								{/* Tabs */}
								<div className="flex mb-6">
									<button
										onClick={() => setActiveTab('treatments')}
										className={`flex items-center space-x-2 px-4 py-2 font-medium transition-colors ${
											activeTab === 'treatments'
												? 'border-b-2 border-red-500 text-red-500'
												: 'text-gray-600 hover:text-gray-800'
										}`}
									>
										<svg
											className="w-5 h-5"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<span>Treatments</span>
									</button>
									<button
										onClick={() => setActiveTab('salon')}
										className={`flex items-center space-x-2 px-4 py-2 font-medium transition-colors ${
											activeTab === 'salon'
												? 'border-b-2 border-red-500 text-red-500'
												: 'text-gray-600 hover:text-gray-800'
										}`}
									>
										<svg
											className="w-5 h-5"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
												clipRule="evenodd"
											/>
										</svg>
										<span>Salon Name</span>
									</button>
								</div>

								{/* Input Fields */}
								<div className="space-y-4">
									{/* Search by treatment or salon */}
									<div className="relative">
										{activeTab === 'treatments' ? (
											<div className="relative">
												<input
													type="text"
													placeholder="Search for treatments"
													value={searchQuery}
													onChange={(e) => setSearchQuery(e.target.value)}
													className="w-full px-4 py-4 pl-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
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
												{/* Category Dropdown */}
												<div className="mt-2">
													<details className="group">
														<summary className="flex items-center justify-between w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
															<span className="text-sm text-gray-700">
																{selectedCategory
																	? categories.find(
																			(cat) => cat.id === selectedCategory
																		)?.name || 'Select category'
																	: 'Select category'}
															</span>
															<svg
																className="w-4 h-4 text-gray-500 group-open:rotate-180 transition-transform"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth={2}
																	d="M19 9l-7 7-7-7"
																/>
															</svg>
														</summary>
														<div className="mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
															<div className="p-2">
																<label className="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
																	<input
																		type="radio"
																		name="category"
																		value=""
																		checked={selectedCategory === null}
																		onChange={() => setSelectedCategory(null)}
																		className="mr-3"
																	/>
																	<span className="text-sm">
																		All categories
																	</span>
																</label>
																{categories.map((category) => (
																	<label
																		key={category.id}
																		className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
																	>
																		<input
																			type="radio"
																			name="category"
																			value={category.id}
																			checked={selectedCategory === category.id}
																			onChange={() =>
																				setSelectedCategory(category.id)
																			}
																			className="mr-3"
																		/>
																		<span className="text-sm">
																			{category.name}
																		</span>
																	</label>
																))}
															</div>
														</div>
													</details>
												</div>
											</div>
										) : (
											<input
												type="text"
												placeholder="Search for salon name"
												value={searchQuery}
												onChange={(e) => setSearchQuery(e.target.value)}
												className="w-full px-4 py-4 pl-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
											/>
										)}
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
									</div>

									{/* Location */}
									<div className="relative">
										<input
											type="text"
											placeholder="Postal code or area"
											value={location}
											onChange={(e) => setLocation(e.target.value)}
											className="w-full px-4 py-4 pl-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
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
												d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
											/>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
											/>
										</svg>
									</div>

									{/* Date */}
									<div className="relative">
										<input
											type="text"
											placeholder="Any date"
											value={date}
											onChange={(e) => setDate(e.target.value)}
											className="w-full px-4 py-4 pl-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
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
												d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
											/>
										</svg>
									</div>
								</div>

								{/* Search Button */}
								<button
									onClick={handleSearch}
									className="w-full bg-red-500 text-white py-4 rounded-lg font-medium hover:bg-red-600 transition-colors mt-6"
								>
									Search
								</button>
							</div>

							{/* Right Section - Image and Slogan */}
							<div className="relative">
								{/* Slogan */}
								<div className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10">
									<h1 className="text-4xl lg:text-5xl font-bold text-blue-900 leading-tight">
										Book your
										<br />
										favorite treatments
									</h1>
								</div>

								{/* Image */}
								<div className="relative">
									<div className="w-full h-96 lg:h-[500px] bg-gradient-to-br from-pink-200 to-purple-200 rounded-2xl overflow-hidden">
										{/* Placeholder for person image */}
										<div className="w-full h-full flex items-center justify-center">
											<div className="w-64 h-64 bg-gradient-to-br from-pink-300 to-purple-300 rounded-full flex items-center justify-center">
												<span className="text-6xl">💇‍♀️</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Recommended Salons Section */}
				<section className="py-16 px-6 bg-white">
					<div className="mx-auto max-w-6xl">
						<h2 className="text-3xl font-bold text-gray-900 mb-8">
							Recommended Salons
						</h2>

						{loading ? (
							<LoadingSpinner message="Loading salons..." />
						) : error ? (
							<ErrorDisplay
								error={error}
								message="Failed to load salons"
								onRetry={() => refetch()}
							/>
						) : salons.length === 0 ? (
							<div className="text-center py-12">
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
								{salons.slice(0, 3).map((salon: Salon) => (
									<div
										key={salon.id}
										onClick={() => handleSalonClick(salon.id)}
										className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
									>
										<div className="h-48 bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center">
											{(() => {
												const imageUrl = getSalonImage(salon);
												return imageUrl ? (
													<Image
														src={imageUrl}
														alt={salon.name}
														width={400}
														height={192}
														className="w-full h-full object-cover"
													/>
												) : (
													<span className="text-6xl">💇‍♀️</span>
												);
											})()}
										</div>
										<div className="p-6">
											<h3 className="text-xl font-bold text-gray-900 mb-2">
												{salon.name}
											</h3>
											<p className="text-[#ff5b5b] text-sm mb-2">
												{salon.address}
											</p>
											{salon.phone && (
												<p className="text-gray-500 text-xs mb-3">
													📞 {salon.phone}
												</p>
											)}
											{salon.services && salon.services.length > 0 && (
												<div className="flex flex-wrap gap-1 mb-4">
													{salon.services
														.slice(0, 2)
														.map((service: Service, index: number) => (
															<span
																key={service.id || index}
																className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
															>
																{service.name}
															</span>
														))}
													{salon.services.length > 2 && (
														<span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
															+{salon.services.length - 2} more
														</span>
													)}
												</div>
											)}
											<a
												href={`/salon/${salon.id}`}
												className="block w-full bg-[#ff5b5b] text-white py-2 rounded-lg hover:bg-[#e04a4a] transition-colors text-center text-sm font-medium"
											>
												View Details
											</a>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</section>
			</main>
		</div>
	);
}
