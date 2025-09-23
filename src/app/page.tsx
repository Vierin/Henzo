'use client';

import { useRouter } from 'next/navigation';
import PublicHeader from '../components/PublicHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorDisplay from '../components/ErrorDisplay';
import { useSalonsWithServices } from '@/hooks/useSalons';
import { supabase } from '@/lib/supabase';
import { Salon, Service } from '@/types';
import Image from 'next/image';

export default function HomePage() {
	const router = useRouter();
	const {
		data: salons = [],
		isLoading: loading,
		error,
		refetch,
	} = useSalonsWithServices();

	const handleSalonClick = (salonId: string) => {
		router.push(`/salon/${salonId}`);
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
				<section className="py-16 px-6">
					<div className="mx-auto max-w-6xl">
						<div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl p-12 text-center">
							<h1 className="text-4xl font-bold text-gray-900 mb-4">
								Find Your Perfect Beauty Salon
							</h1>
							<p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
								Discover the best beauty salons, barbershops, and spas in your
								city. Book your visit online in seconds.
							</p>
							<div className="flex max-w-2xl mx-auto">
								<div className="flex-1 relative">
									<input
										type="text"
										placeholder="Search for services, salons, or specialists"
										className="w-full px-4 py-4 pl-12 pr-4 bg-white rounded-l-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8B4513] focus:border-transparent text-gray-900"
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
								</div>
								<button className="bg-[#ff5b5b] text-white px-8 py-4 rounded-r-xl font-medium hover:bg-[#e04a4a] transition-colors">
									Search
								</button>
							</div>
						</div>
					</div>
				</section>

				{/* Popular Services Section */}
				<section className="py-16 px-6">
					<div className="mx-auto max-w-6xl">
						<h2 className="text-3xl font-bold text-gray-900 mb-8">
							Popular Services
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
							<div className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
								<div className="w-20 h-20 bg-gray-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
									<span className="text-3xl">💇‍♀️</span>
								</div>
								<h3 className="text-lg font-semibold text-gray-900">Haircut</h3>
							</div>
							<div className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
								<div className="w-20 h-20 bg-gray-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
									<span className="text-3xl">💅</span>
								</div>
								<h3 className="text-lg font-semibold text-gray-900">
									Manicure
								</h3>
							</div>
							<div className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
								<div className="w-20 h-20 bg-gray-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
									<span className="text-3xl">✨</span>
								</div>
								<h3 className="text-lg font-semibold text-gray-900">Facial</h3>
							</div>
							<div className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
								<div className="w-20 h-20 bg-gray-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
									<span className="text-3xl">🧘‍♀️</span>
								</div>
								<h3 className="text-lg font-semibold text-gray-900">Massage</h3>
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

			{/* Footer */}
			<footer className="bg-[#F8F5F2] py-12 px-6">
				<div className="mx-auto max-w-6xl">
					<div className="flex flex-col md:flex-row justify-between items-center">
						<div className="flex gap-8 mb-4 md:mb-0">
							<a href="#" className="text-gray-700 hover:text-[#8B4513]">
								About Us
							</a>
							<a href="#" className="text-gray-700 hover:text-[#8B4513]">
								Contact
							</a>
							<a href="#" className="text-gray-700 hover:text-[#8B4513]">
								Privacy Policy
							</a>
							<a href="#" className="text-gray-700 hover:text-[#8B4513]">
								Terms of Use
							</a>
						</div>
						<div className="text-gray-500 text-sm">
							© 2023 Henzo. All rights reserved.
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
