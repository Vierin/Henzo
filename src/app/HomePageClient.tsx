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
					className="py-8 min-h-[75svh] flex items-center justify-around mx-auto relative bg-black"
					aria-label="Book beauty appointments"
				>
					<Image
						src="/images/hero-bg.webp"
						alt="Hero Image"
						width={1000}
						height={1000}
						className="absolute top-0 left-0 w-full h-full object-cover opacity-30"
					/>

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
										className="text-4xl lg:text-5xl font-bold text-white leading-tight"
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

				{/* How It Works Section */}
				<section className="py-20 px-6 bg-white">
					<div className="mx-auto max-w-6xl">
						{/* Heading */}
						<div className="text-center mb-16">
							<h2 className="text-4xl font-bold text-gray-900 mb-4">
								{t.homepage.howItWorks}
							</h2>
							<p className="text-lg text-gray-600 max-w-2xl mx-auto">
								{t.homepage.howItWorksSubtitle}
							</p>
						</div>

						{/* Steps */}
						<div className="relative">
							{/* Connection Lines */}
							<div className="hidden md:block absolute top-10 left-0 right-0">
								<div className="flex justify-center items-center">
									{/* Line from step 1 to step 2 */}
									<div className="w-1/3 h-0.5 bg-[#ff5b5b]"></div>
									{/* Gap between steps */}
									<div className="w-12"></div>
									{/* Line from step 2 to step 3 */}
									<div className="w-1/3 h-0.5 bg-[#ff5b5b]"></div>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-12">
								{/* Step 1 */}
								<article className="text-center relative">
									<div className="relative mb-6">
										{/* Main Icon Circle */}
										<div className="w-20 h-20 bg-[#ff5b5b] rounded-full flex items-center justify-center mx-auto shadow-lg">
											<svg
												className="w-8 h-8 text-white"
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
									</div>
									<h3 className="text-2xl font-bold text-gray-900 mb-4">
										{t.homepage.step1Title}
									</h3>
									<p className="text-gray-600 leading-relaxed">
										{t.homepage.step1Description}
									</p>
								</article>

								{/* Step 2 */}
								<article className="text-center relative">
									<div className="relative mb-6">
										{/* Main Icon Circle */}
										<div className="w-20 h-20 bg-[#ff5b5b] rounded-full flex items-center justify-center mx-auto shadow-lg">
											<svg
												className="w-8 h-8 text-white"
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
									<h3 className="text-2xl font-bold text-gray-900 mb-4">
										{t.homepage.step2Title}
									</h3>
									<p className="text-gray-600 leading-relaxed">
										{t.homepage.step2Description}
									</p>
								</article>

								{/* Step 3 */}
								<article className="text-center relative">
									<div className="relative mb-6">
										{/* Main Icon Circle */}
										<div className="w-20 h-20 bg-[#ff5b5b] rounded-full flex items-center justify-center mx-auto shadow-lg">
											<svg
												className="w-8 h-8 text-white"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
												/>
											</svg>
										</div>
									</div>
									<h3 className="text-2xl font-bold text-gray-900 mb-4">
										{t.homepage.step3Title}
									</h3>
									<p className="text-gray-600 leading-relaxed">
										{t.homepage.step3Description}
									</p>
								</article>
							</div>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
