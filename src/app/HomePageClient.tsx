'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import PublicHeader from '@/components/PublicHeader';
import SearchBookingForm from '@/components/SearchBookingForm';
import MobileSearchTrigger from '@/components/MobileSearchTrigger';
import RecommendedSalons from '@/components/RecommendedSalons';
import CategoriesNavigation from '@/components/CategoriesNavigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { extractLocaleFromPath, withLocale } from '@/i18n/routing';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock4, Timer } from 'lucide-react';

interface HomePageClientProps {
	initialDictionary?: any; // Переводы, загруженные на сервере
}

export default function HomePageClient({ initialDictionary }: HomePageClientProps = {}) {
	const queryClient = useQueryClient();
	
	// Используем переводы из window если они есть (от сервера), иначе загружаем через хук
	const [serverDictionary] = useState(() => {
		if (typeof window !== 'undefined') {
			return (window as any).__HOMEPAGE_DICTIONARY__;
		}
		return undefined;
	});
	
	const effectiveInitialDictionary = initialDictionary || serverDictionary;
	
	// Передаем initialDictionary в LanguageProvider через window для предотвращения мерцания
	useEffect(() => {
		if (effectiveInitialDictionary && typeof window !== 'undefined') {
			// Объединяем с базовым словарем если он есть
			const existing = (window as any).__INITIAL_DICTIONARY__ || {};
			(window as any).__INITIAL_DICTIONARY__ = {
				...existing,
				...effectiveInitialDictionary,
			};
		}
	}, [effectiveInitialDictionary]);
	
	const t = useTranslation();
	const router = useRouter();

	// Обработка hash токенов от Supabase magic link на главной странице
	useEffect(() => {
		const handleHashTokens = async () => {
			// Проверяем hash фрагмент на наличие токенов
			const hash = window.location.hash.substring(1);
			if (!hash) return;

			const hashParams = new URLSearchParams(hash);
			const accessToken = hashParams.get('access_token');
			const refreshToken = hashParams.get('refresh_token');
			const type = hashParams.get('type');

			// Если это magic link токены
			if (accessToken && refreshToken && type === 'magiclink') {
				try {
					console.log('✅ Found magic link tokens in hash on homepage, setting session...');
					
					// Устанавливаем сессию
					const { data: sessionData, error: sessionError } =
						await supabase.auth.setSession({
							access_token: accessToken,
							refresh_token: refreshToken,
						});

					if (sessionError) {
						console.error('❌ Failed to set session from hash:', sessionError);
						// Очищаем hash и редиректим на страницу регистрации с ошибкой
						window.history.replaceState(null, '', '/business/register?error=auth_failed');
						return;
					}

					if (sessionData?.session) {
						console.log('✅ Session set successfully from hash tokens');
						
						// Проверяем роль пользователя для редиректа
						const userRole = sessionData.session.user.app_metadata?.role || 
							sessionData.session.user.user_metadata?.role;
						
						// Очищаем hash из URL
						window.history.replaceState(null, '', '/');
						
						// Редиректим в зависимости от роли с учетом локали
						const currentPath = window.location.pathname;
						const locale = extractLocaleFromPath(currentPath) ?? 'en';
						
						if (userRole === 'OWNER') {
							console.log('🔄 Redirecting OWNER to complete-setup');
							router.push(withLocale('/business/complete-setup', locale as 'en' | 'ru' | 'vi'));
						} else if (userRole === 'CLIENT') {
							console.log('🔄 Redirecting CLIENT to dashboard');
							router.push(withLocale('/dashboard', locale as 'en' | 'ru' | 'vi'));
						} else {
							// Обновляем страницу для применения изменений
							router.refresh();
						}
					}
				} catch (error) {
					console.error('❌ Error handling hash tokens:', error);
					// Очищаем hash при ошибке и редиректим
					window.history.replaceState(null, '', '/business/register?error=auth_failed');
				}
			}
		};

		handleHashTokens();
	}, [router]);

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
					className="py-8 px-4 sm:px-6 min-h-[calc(100vh-110px)] md:min-h-[75svh] flex items-center justify-around mx-auto relative bg-white"
					aria-label="Book beauty appointments"
				>
					{/* Mobile Image */}
					<Image
						src="/images/hero-mobile.webp"
						alt="Hero Image"
						width={1000}
						height={1000}
						className="absolute top-0 left-0 w-full h-full   object-cover md:hidden"
					/>
					{/* Desktop Image */}
					<Image
						src="/images/hero-bg.webp"
						alt="Hero Image"
						width={1000}
						height={1000}
						className="absolute top-0 left-0 w-full h-full object-cover hidden md:block"
					/>

					<div className="mx-auto max-w-7xl w-full relative z-10">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center justify-items-center lg:justify-items-start bg-white/60 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none rounded-2xl p-8 md:p-10 shadow-xl sm:shadow-none">
							{/* Right Section - Image and Slogan (First on mobile, second on desktop) */}
							<div className="relative order-1 lg:order-2 w-full max-w-md lg:max-w-none">
								{/* Slogan */}
								<div className="relative z-10 mx-auto text-center lg:text-left w-[fit-content]">
									<h1
										className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black leading-tight"
										dangerouslySetInnerHTML={{
											__html: t('homepage.heroTitle'),
										}}
									/>
									<p className="text-base sm:text-lg leading-[1.2] text-black/70 mt-4 max-w-md mx-auto lg:mx-0">
										{t('homepage.heroSubtitle')}
									</p>

									{/* Features Stats */}
									<div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-8 mt-6 sm:mt-8">
										<div className="flex items-center gap-2">
											<div>
												<Clock4 className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
											</div>
											<div className='leading-[1.2]'>
												<p className="text-2xl font-bold text-primary flex items-center gap-1">
												24/7
												</p>
												<p className="text-xs sm:text-sm text-black/70 font-medium">
													{t('homepage.onlineBooking')}
												</p>
											</div>
											
										</div>
										<div className="w-px h-8 sm:h-10 bg-gray-300"></div>
										<div className="flex items-center gap-2">
									    <div>
													<Timer className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
												</div>
											<div className="leading-[1]">
												<p className="text-xs sm:text-sm text-black/70">
													{t('homepage.toBook')}
												</p>
												<p className="text-2xl font-bold text-primary flex items-center gap-1 leading-[1]">
													5 <span className="text-lg relative">
														{t('homepage.minutesShort')}
													</span>
												</p>
											</div>
										</div>
										<div className="w-px h-8 sm:h-10 bg-gray-300"></div>
										<div className="leading-[1.2]">
											<p className="text-xs sm:text-sm text-black/70">
												{t('homepage.booking')}
											</p>
											<p className="text-xl sm:text-3xl font-bold text-primary">
												{t('homepage.free')}
											</p>
										</div>
									</div>
								</div>
							</div>

							{/* Left Panel - Search/Booking Form (Second on mobile, first on desktop) */}
							<div className="order-2 lg:order-1 w-full max-w-md lg:max-w-none flex justify-center">
								{/* Mobile: Compact trigger */}
								<div className="md:hidden w-full">
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

				{/* How It Works Section - Desktop Only */}
				<section className="hidden md:block py-12 sm:py-20 px-4 sm:px-6 bg-[#F3F5F9]">
					<div className="mx-auto max-w-7xl">
						<div className="grid lg:grid-cols-2 gap-12 items-center">
							{/* Left Section - Image */}
							<div className="relative rounded-2xl overflow-hidden">
								<Image
									src="/images/how.webp"
									alt="Woman getting hair styled in salon"
									width={600}
									height={600}
									className="w-full h-auto object-cover"
								/>
							</div>

							{/* Right Section - Content */}
							<div>
								{/* Heading */}
								<h2
									className="text-5xl font-bold text-black mb-4"
									dangerouslySetInnerHTML={{
										__html: t('homepage.howItWorks'),
									}}
								/>
								<p className="text-lg text-gray-700 mb-10">
									{t('homepage.howItWorksSubtitle')}
								</p>

								{/* Steps */}
								<div className="relative space-y-8 mb-10">
									{/* Connecting Line */}
									<div className="absolute left-[20px] top-[15%] bottom-[10%] w-0.5 bg-gray-200"></div>

									{/* Step 1 */}
									<div className="relative flex items-center gap-6 h-41">
										<div className="relative z-10 flex-shrink-0">
											<div className="w-10 h-10 border border-[#ff5b5b] bg-white rounded-full flex items-center justify-center">
												<span className="text-[#ff5b5b] font-bold text-lg">1</span>
											</div>
										</div>
										<div className="flex-1 bg-white rounded-lg p-6 h-full">
											<div className="mb-2 flex items-center gap-2">
												<svg
													className="w-6 h-6 text-[#ff5b5b]"
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
												<h3 className="text-xl font-bold text-black">
												{t('homepage.step1Title')}
											</h3>
											</div>
											
											<p className="text-gray-600 leading-relaxed">
												{t('homepage.step1Description')}
											</p>
										</div>
									</div>

									{/* Step 2 */}
									<div className="relative flex items-center gap-6 h-41">
										<div className="relative z-10 flex-shrink-0">
											<div className="w-10 h-10 border border-[#ff5b5b] bg-white rounded-full flex items-center justify-center">
												<span className="text-[#ff5b5b] font-bold text-lg">2</span>
											</div>
										</div>
										<div className="flex-1 bg-white rounded-lg p-6 h-full">
											<div className="mb-2 flex items-center gap-2">
												<CalendarDays className="w-6 h-6 text-[#ff5b5b]" />
												<h3 className="text-xl font-bold text-gray-900">
													{t('homepage.step2Title')}
												</h3>
											</div>
											<p className="text-gray-600 leading-relaxed">
												{t('homepage.step2Description')}
											</p>
										</div>
									</div>

									{/* Step 3 */}
									<div className="relative flex items-center gap-6 h-41">
										<div className="relative z-10 flex-shrink-0">
											<div className="w-10 h-10 border border-[#ff5b5b] bg-white rounded-full flex items-center justify-center">
												<span className="text-[#ff5b5b] font-bold text-lg">3</span>
											</div>
										</div>
										<div className="flex-1 bg-white rounded-lg p-6 h-full">
											<div className="mb-2 flex items-center gap-2">
												<svg
													className="w-6 h-6 text-[#ff5b5b]"
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
												<h3 className="text-xl font-bold text-gray-900">
													{t('homepage.step3Title')}
												</h3>
											</div>
											<p className="text-gray-600 leading-relaxed">
												{t('homepage.step3Description')}
											</p>
										</div>
									</div>
								</div>

								{/* CTA Button */}
								<Link
									href="/salons"
									className="inline-block bg-gradient-to-r from-[#ff5b5b] to-[#e04a4a] text-white px-8 py-4 rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-lg"
								>
									{t('homepage.bookNow')}
								</Link>
							</div>
						</div>
					</div>
				</section>

				{/* Why Choose Henzo Section */}
				<section className="py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-r from-pink-50/30 via-white to-purple-50/30">
					<div className="mx-auto max-w-6xl">
						{/* Heading */}
						<div className="text-center mb-12 sm:mb-16">
							<h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
								{t('homepage.whyChooseHenzo')}
							</h2>
							<p className="text-base sm:text-lg text-gray-700 max-w-2xl mx-auto">
								{t('homepage.whyChooseSubtitle')}
							</p>
						</div>

						{/* Features Grid */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-10">
							{/* Easy Booking */}
							<article className="bg-white rounded-xl p-8 shadow-sm">
								<div className="flex items-start gap-4">
									<div className="w-12 h-12 rounded-lg border-1 border-gray-300 flex items-center justify-center flex-shrink-0">
										<svg
											className="w-6 h-6 text-[#ff5b5b]"
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
									<div>
										<h3 className="text-xl font-bold text-gray-900 mb-2">
											{t('homepage.easyBooking')}
										</h3>
										<p className="text-gray-700 leading-relaxed">
											{t('homepage.easyBookingDescription')}
										</p>
									</div>
								</div>
							</article>

							{/* Flexible Schedule */}
							<article className="bg-white rounded-xl p-8 shadow-sm">
								<div className="flex items-start gap-4">
									<div className="w-12 h-12 rounded-lg border-1 border-gray-300 flex items-center justify-center flex-shrink-0">
										<svg
											className="w-6 h-6 text-[#ff5b5b]"
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
									<div>
										<h3 className="text-xl font-bold text-gray-900 mb-2">
											{t('homepage.flexibleScheduling')}
										</h3>
										<p className="text-gray-700 leading-relaxed">
											{t('homepage.flexibleSchedulingDescription')}
										</p>
									</div>
								</div>
							</article>

							{/* Reliable Reviews */}
							<article className="bg-white rounded-xl p-8 shadow-sm">
								<div className="flex items-start gap-4">
									<div className="w-12 h-12 rounded-lg border-1 border-gray-300 flex items-center justify-center flex-shrink-0">
										<svg
											className="w-6 h-6 text-[#ff5b5b]"
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
									<div>
										<h3 className="text-xl font-bold text-gray-900 mb-2">
											{t('homepage.trustedReviews')}
										</h3>
										<p className="text-gray-700 leading-relaxed">
											{t('homepage.trustedReviewsDescription')}
										</p>
									</div>
								</div>
							</article>
						</div>

						{/* CTA Link */}
						<div className="text-center">
							<Link
								href="/salons"
								className="flex justify-center w-fit mx-auto items-center gap-2 text-[#ff5b5b] hover:text-[#e04a4a] font-medium text-lg transition-colors "
							>
								{t('homepage.startExploring')} <ArrowRight className="w-4 h-4" />
							</Link>
						</div>
					</div>
				</section>

				{/* Business CTA Section */}
				<section className="relative py-0 px-0 overflow-hidden">
					<div className="relative min-h-[500px] flex items-center">
						{/* Background Image */}
						<div className="absolute inset-0 w-full h-full">
							<Image
								src="/images/business.webp"
								alt="Modern salon interior"
								fill
								className="object-cover"
								priority
							/>
						</div>

						{/* Overlay Content */}
						<div className="relative z-10 w-full">
							<div className="mx-auto max-w-7xl px-4 sm:px-6">
								<div className="flex justify-end">
									<div className="w-full md:w-[40%] bg-white/60 backdrop-blur-md rounded-2xl p-8 md:p-10 shadow-xl">
										<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
											{t('homepage.salonOwner')}
										</h2>
										<p className="text-gray-700 mb-8 leading-relaxed">
											{t('homepage.salonOwnerSubtitle')}
										</p>
										<Link
											href="/business"
											className="inline-block bg-white border-2 border-[#ff5b5b] text-[#ff5b5b] px-6 py-3 rounded-lg font-semibold hover:bg-red-50 transition-colors"
										>
											{t('homepage.registerBusiness')}
										</Link>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
