'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PublicHeader from '@/components/PublicHeader';
import SearchBookingForm from '@/components/SearchBookingForm';
import RecommendedSalons from '@/components/RecommendedSalons';
import CategoriesNavigation from '@/components/CategoriesNavigation';
import { useTranslation } from '@/contexts/LanguageContext';
import Image from 'next/image';

export default function HomePageClient() {
	const queryClient = useQueryClient();
	const t = useTranslation();

	// Preload critical data for better performance
	useEffect(() => {
		const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

		// Prefetch featured salons
		queryClient.prefetchQuery({
			queryKey: ['salons', 'featured', 6],
			queryFn: async () => {
				const response = await fetch(`${API_URL}/salons/featured?limit=6`);
				return response.json();
			},
			staleTime: 15 * 60 * 1000, // 15 minutes
		});

		// Prefetch popular services
		queryClient.prefetchQuery({
			queryKey: ['services', 'popular', 10],
			queryFn: async () => {
				const response = await fetch(`${API_URL}/services/popular?limit=10`);
				return response.json();
			},
			staleTime: 15 * 60 * 1000, // 15 minutes
		});
	}, [queryClient]);

	return (
		<div className="min-h-screen bg-[#F8F5F2]">
			<PublicHeader />

			<main>
				{/* Hero Section */}
				<section
					className="py-8 min-h-[75svh] flex items-center justify-around mx-auto relative"
					aria-label="Book beauty appointments"
				>
					<div className="mx-auto max-w-7xl w-full relative z-10">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
							<div>
								{/* Left Panel - Search/Booking Form */}
								<SearchBookingForm />
							</div>

							{/* Right Section - Image and Slogan */}
							<div className="relative">
								{/* Slogan */}
								<div className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10">
									<h1
										className="text-4xl lg:text-5xl font-bold text-foreground leading-tight"
										dangerouslySetInnerHTML={{ __html: t.homepage.heroTitle }}
									/>
									<p className="text-lg text-muted-foreground mt-4 max-w-md">
										{t.homepage.heroSubtitle}
									</p>

									{/* Features Stats */}
									<div className="flex items-center gap-8 mt-8">
										<div className="">
											<p className="text-3xl font-bold text-primary">24/7</p>
											<p className="text-sm text-muted-foreground">
												Online Booking
											</p>
										</div>
										<div className="w-px h-10 bg-gray-300"></div>
										<div className="">
											<p className="text-3xl font-bold text-primary">
												5
												<span className="text-xl relative left-1">minutes</span>
											</p>
											<p className="text-sm text-muted-foreground">
												to book a service
											</p>
										</div>
										<div className="w-px h-10 bg-gray-300"></div>
										<div className="">
											<p className="text-3xl font-bold text-primary">Free</p>
											<p className="text-sm text-muted-foreground">
												Booking and cancellation
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Categories Navigation Section */}
				<section className="py-8 px-6 bg-white border-y border-gray-200">
					<div className="mx-auto max-w-7xl">
						<CategoriesNavigation />
					</div>
				</section>

				{/* Recommended Salons Section */}
				<RecommendedSalons />

				{/* Why Choose Henzo Section */}
				<section className="py-16 px-6 bg-[#FBF7F5]">
					<div className="mx-auto max-w-6xl">
						{/* Heading */}
						<div className="text-center mb-12">
							<h2 className="text-3xl font-bold text-gray-900 mb-4">
								{t.homepage.howItWorks}
							</h2>
							<p className="text-lg text-gray-700">{t.homepage.heroSubtitle}</p>
						</div>

						{/* Features Grid */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
							{/* Feature 1 */}
							<article className="text-center">
								<div className="w-16 h-16 bg-[#ff5b5b] rounded-full flex items-center justify-center mx-auto mb-4">
									<span className="text-2xl text-white">🔍</span>
								</div>
								<h3 className="text-xl font-semibold text-gray-900 mb-2">
									{t.homepage.step1Title}
								</h3>
								<p className="text-gray-600">{t.homepage.step1Description}</p>
							</article>

							{/* Feature 2 */}
							<article className="text-center">
								<div className="w-16 h-16 bg-[#ff5b5b] rounded-full flex items-center justify-center mx-auto mb-4">
									<span className="text-2xl text-white">📅</span>
								</div>
								<h3 className="text-xl font-semibold text-gray-900 mb-2">
									{t.homepage.step2Title}
								</h3>
								<p className="text-gray-600">{t.homepage.step2Description}</p>
							</article>

							{/* Feature 3 */}
							<article className="text-center">
								<div className="w-16 h-16 bg-[#ff5b5b] rounded-full flex items-center justify-center mx-auto mb-4">
									<span className="text-2xl text-white">⭐</span>
								</div>
								<h3 className="text-xl font-semibold text-gray-900 mb-2">
									Trusted Reviews
								</h3>
								<p className="text-gray-600">
									Read authentic reviews from real customers to make informed
									decisions.
								</p>
							</article>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
