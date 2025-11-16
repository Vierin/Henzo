'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PublicHeader from '@/components/PublicHeader';
import SearchBookingForm from '@/components/SearchBookingForm';
import MobileSearchTrigger from '@/components/MobileSearchTrigger';
import RecommendedSalons from '@/components/RecommendedSalons';
import CategoriesNavigation from '@/components/CategoriesNavigation';
import { useTranslation } from '@/contexts/LanguageContext';
import Image from 'next/image';
import Link from 'next/link';

export default function HomePageClient() {
	const queryClient = useQueryClient();
	const t = useTranslation();

	// Preload critical data for better performance
	useEffect(() => {
		const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

		// Prefetch featured salons with optimized caching
		queryClient.prefetchQuery({
			queryKey: ['salons', 'featured', 6],
			queryFn: async () => {
				const response = await fetch(`${API_URL}/salons/featured?limit=6`);
				return response.json();
			},
			staleTime: 60 * 60 * 1000, // 1 hour - featured salons change very rarely
			gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in cache for a full day
		});

		// Prefetch exactly 3 salons for the Top-Rated section
		queryClient.prefetchQuery({
			queryKey: ['salons', 'featured', 3],
			queryFn: async () => {
				const response = await fetch(`${API_URL}/salons/featured?limit=3`);
				return response.json();
			},
			staleTime: 60 * 60 * 1000, // 1 hour - featured salons change very rarely
			gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in cache for a full day
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
					className="py-8 px-4 sm:px-6 min-h-[calc(100vh-110px)] md:min-h-[75svh] flex items-center justify-around mx-auto relative bg-black"
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
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center justify-items-center lg:justify-items-start">
							{/* Right Section - Image and Slogan (First on mobile, second on desktop) */}
							<div className="relative order-1 lg:order-2 w-full max-w-md lg:max-w-none">
								{/* Slogan */}
								<div className="lg:absolute lg:left-0 lg:top-1/2 lg:transform lg:-translate-y-1/2 z-10 text-center lg:text-left">
									<h1
										className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight"
										dangerouslySetInnerHTML={{ __html: t.homepage.heroTitle }}
									/>
									<p className="text-base sm:text-lg text-muted-foreground mt-4 max-w-md mx-auto lg:mx-0">
										{t.homepage.heroSubtitle}
									</p>

									{/* Features Stats */}
									<div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-8 mt-6 sm:mt-8">
										<div className="">
											<p className="text-2xl sm:text-3xl font-bold text-primary">
												24/7
											</p>
											<p className="text-xs sm:text-sm text-muted-foreground">
												{t.homepage.onlineBooking}
											</p>
										</div>
										<div className="w-px h-8 sm:h-10 bg-gray-300"></div>
										<div className="">
											<p className="text-2xl sm:text-3xl font-bold text-primary">
												5
												<span className="text-lg sm:text-xl relative left-1">
													{t.homepage.minutesShort}
												</span>
											</p>
											<p className="text-xs sm:text-sm text-muted-foreground">
												{t.homepage.toBook}
											</p>
										</div>
										<div className="w-px h-8 sm:h-10 bg-gray-300"></div>
										<div className="">
											<p className="text-2xl sm:text-3xl font-bold text-primary">
												{t.homepage.free}
											</p>
											<p className="text-xs sm:text-sm text-muted-foreground">
												{t.homepage.booking}
											</p>
										</div>
									</div>
								</div>
							</div>

							{/* Left Panel - Search/Booking Form (Second on mobile, first on desktop) */}
							<div className="order-2 lg:order-1 w-full max-w-md lg:max-w-none">
								{/* Mobile: Compact trigger */}
								<div className="md:hidden">
									<MobileSearchTrigger />
								</div>
								{/* Desktop: Full form */}
								<div className="hidden md:block">
									<SearchBookingForm />
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Categories Navigation Section */}
				<section className="py-4 md:py-8 bg-white border-y border-gray-200">
					<div className="mx-auto max-w-7xl">
						<CategoriesNavigation />
					</div>
				</section>

				{/* Recommended Salons Section */}
				<RecommendedSalons />

				{/* Why Choose Henzo Section */}
				<section className="py-12 sm:py-16 px-4 sm:px-6 bg-[#FBF7F5]">
					<div className="mx-auto max-w-6xl">
						{/* Heading */}
						<div className="text-center mb-8 sm:mb-12">
							<h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
								{t.homepage.whyChooseHenzo}
							</h2>
							<p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
								{t.homepage.whyChooseSubtitle}
							</p>
						</div>

						{/* Features Grid */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
							{/* Easy Booking */}
							<article className="bg-white rounded-lg p-8 text-center shadow-sm">
								<div className="w-16 h-16 bg-[#ff5b5b] rounded-full flex items-center justify-center mx-auto mb-6">
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
											d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</div>
								<h3 className="text-xl font-bold text-gray-900 mb-4">
									{t.homepage.easyBooking}
								</h3>
								<p className="text-gray-600">
									{t.homepage.easyBookingDescription}
								</p>
							</article>

							{/* Flexible Scheduling */}
							<article className="bg-white rounded-lg p-8 text-center shadow-sm">
								<div className="w-16 h-16 bg-[#ff5b5b] rounded-full flex items-center justify-center mx-auto mb-6">
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
											d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</div>
								<h3 className="text-xl font-bold text-gray-900 mb-4">
									{t.homepage.flexibleScheduling}
								</h3>
								<p className="text-gray-600">
									{t.homepage.flexibleSchedulingDescription}
								</p>
							</article>

							{/* Trusted Reviews */}
							<article className="bg-white rounded-lg p-8 text-center shadow-sm">
								<div className="w-16 h-16 bg-[#ff5b5b] rounded-full flex items-center justify-center mx-auto mb-6">
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
								<h3 className="text-xl font-bold text-gray-900 mb-4">
									{t.homepage.trustedReviews}
								</h3>
								<p className="text-gray-600">
									{t.homepage.trustedReviewsDescription}
								</p>
							</article>
						</div>
					</div>
				</section>

				{/* Business CTA Section - Mobile Only */}
				<section className="md:hidden py-12 px-4 bg-gradient-to-br from-[#ff5b5b] to-[#e04a4a]">
					<div className="mx-auto max-w-md text-center">
						<div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
							<div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
								<svg
									className="w-8 h-8 text-[#ff5b5b]"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
									/>
								</svg>
							</div>
							<h2 className="text-2xl font-bold text-white mb-3">
								{t.homepage.salonOwner || 'Are you a salon owner?'}
							</h2>
							<p className="text-white/90 mb-6 text-sm">
								{t.homepage.salonOwnerSubtitle ||
									'Join Henzo and grow your business with our booking platform'}
							</p>
							<Link
								href="/business"
								className="inline-block bg-white text-[#ff5b5b] px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-lg"
							>
								{t.homepage.learnMore || 'Learn More'}
							</Link>
						</div>
					</div>
				</section>

				{/* How It Works Section - Desktop Only */}
				<section className="hidden md:block py-12 sm:py-20 px-4 sm:px-6 bg-white">
					<div className="mx-auto max-w-6xl">
						{/* Heading */}
						<div className="text-center mb-10 sm:mb-16">
							<h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
								{t.homepage.howItWorks}
							</h2>
							<p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
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

							<div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
								{/* Step 1 */}
								<article className="text-center relative">
									<div className="relative mb-6">
										{/* Main Icon Circle */}
										<div className="md:w-20 md:h-20 w-12 h-12 bg-[#ff5b5b] rounded-full flex items-center justify-center mx-auto shadow-lg">
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
										<div className="md:w-20 md:h-20 w-12 h-12 bg-[#ff5b5b] rounded-full flex items-center justify-center mx-auto shadow-lg">
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
										<div className="md:w-20 md:h-20 w-12 h-12 bg-[#ff5b5b] rounded-full flex items-center justify-center mx-auto shadow-lg">
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
