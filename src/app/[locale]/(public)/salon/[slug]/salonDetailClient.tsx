'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import BookingModal from '@/components/BookingModal';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';

// Dynamically import MapComponentWithCoords to avoid SSR issues with Leaflet
const MapComponentWithCoords = dynamic(
	() => import('@/components/MapComponentWithCoords'),
	{ ssr: false }
);
import MobileSearchTrigger from '@/components/MobileSearchTrigger';
import { Service, WorkingHours, Salon } from '@/types';
import { supabase } from '@/lib/supabase';
import SalonPhotoSlider from '@/components/SalonPhotoSlider';
import { generateSalonSlug } from '@/utils/slug';
import ReviewsSection from '@/components/ReviewsSection';
import {
	Clock,
	Clock1,
	Globe,
	Instagram,
	MapPin,
	Phone,
	Star,
	Heart,
	ChevronDown,
} from 'lucide-react';
import { calculateAverageRating, getReviewCount } from '@/utils/salonUtils';
import { formatVND } from '@/utils/currency';
import {
	useAddFavorite,
	useRemoveFavorite,
	useIsFavorite,
} from '@/hooks/useFavorites';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation, useLanguage } from '@/contexts/LanguageContext';
import {
	getLocalizedServiceName,
	getLocalizedServiceDescription,
} from '@/utils/serviceLocalization';

interface SalonDetailClientProps {
	salon: Salon;
}

export default function SalonDetailClient({ salon }: SalonDetailClientProps) {
	const t = useTranslation();
	const { language } = useLanguage();
	const router = useRouter();
	const { user } = useAuthStore();
	const isFavorite = useIsFavorite(salon.id, !!user);
	const addFavoriteMutation = useAddFavorite();
	const removeFavoriteMutation = useRemoveFavorite();

	const [activeTab, setActiveTab] = useState<
		'Services' | 'Reviews' | 'Information'
	>('Services');
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<Service | null>(null);
	const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
	const groupsInitialized = useRef(false);

	const handleBookService = useCallback((service: Service) => {
		setSelectedService(service);
		setIsBookingModalOpen(true);
	}, []);

	const handleCloseBookingModal = useCallback(() => {
		setIsBookingModalOpen(false);
		setSelectedService(null);
	}, []);

	const handleFavoriteClick = useCallback(() => {
		// Check if user is logged in
		if (!user) {
			router.push(
				`/login?returnTo=${encodeURIComponent(window.location.href)}`
			);
			return;
		}

		// Toggle favorite
		if (isFavorite) {
			removeFavoriteMutation.mutate(salon.id);
		} else {
			addFavoriteMutation.mutate(salon.id);
		}
	}, [
		user,
		isFavorite,
		salon.id,
		router,
		addFavoriteMutation,
		removeFavoriteMutation,
	]);

	const handleGetDirections = useCallback(() => {
		if (salon.address) {
			const encodedAddress = encodeURIComponent(salon.address);
			const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
			window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
		}
	}, [salon.address]);

	const renderStars = useCallback((rating: number) => {
		return Array.from({ length: 5 }, (_, i) => {
			const starIndex = i + 1;
			let className = 'text-gray-300';
			let style = {};

			if (starIndex <= Math.floor(rating)) {
				// Полная звезда
				className = 'text-[#ff5b5b] fill-[#ff5b5b]';
			} else if (starIndex - 0.5 <= rating && rating < starIndex) {
				// Половина звезды - используем градиент
				className = 'text-gray-300';
				style = {
					background: 'linear-gradient(90deg, #ff5b5b 50%, transparent 50%)',
					WebkitBackgroundClip: 'text',
					WebkitTextFillColor: 'transparent',
					backgroundClip: 'text',
				};
			}

			return (
				<Star
					key={i}
					size={16}
					className={className}
					style={style}
					aria-hidden="true"
				/>
			);
		});
	}, []);

	const formatWorkingHours = useCallback(
		(workingHours: WorkingHours | undefined) => {
			if (!workingHours) return t.salon.hoursNotSpecified;

			const days: (keyof WorkingHours)[] = [
				'monday',
				'tuesday',
				'wednesday',
				'thursday',
				'friday',
				'saturday',
				'sunday',
			];
			const dayNames = [
				t('weekdays.short.mon'),
				t('weekdays.short.tue'),
				t('weekdays.short.wed'),
				t('weekdays.short.thu'),
				t('weekdays.short.fri'),
				t('weekdays.short.sat'),
				t('weekdays.short.sun'),
			];

			return days
				.map((day, index) => {
					const hours = workingHours[day];
					if (!hours || hours.closed) {
						return `${dayNames[index]}: ${t.salon.closed}`;
					}
					return `${dayNames[index]}: ${hours.open} - ${hours.close}`;
				})
				.join('\n');
		},
		[t.salon.closed, t.salon.hoursNotSpecified]
	);

	// Group services by serviceGroup
	const serviceGroups = useMemo(() => {
		if (!salon.services) return { groups: [], ungrouped: [] };

		const groupsMap = new Map<
			string,
			{ group: NonNullable<Service['serviceGroup']>; services: Service[] }
		>();
		const ungrouped: Service[] = [];

		salon.services.forEach((service) => {
			// Get group from service.serviceGroup (should always be loaded from backend)
			const group: Service['serviceGroup'] | undefined = service.serviceGroup;

			// Check if service has a valid active group
			if (group && group.isActive !== false) {
				const groupId = group.id;

				if (!groupsMap.has(groupId)) {
					groupsMap.set(groupId, {
						group: group as NonNullable<Service['serviceGroup']>,
						services: [],
					});
				}
				groupsMap.get(groupId)!.services.push(service);
			} else {
				// Service without group or with inactive group
				ungrouped.push(service);
			}
		});

		// Sort groups by position
		const groups = Array.from(groupsMap.values()).sort(
			(a, b) => a.group.position - b.group.position
		);

		return { groups, ungrouped };
	}, [salon.services, salon.id]);

	// Toggle group expansion
	const toggleGroup = useCallback((groupId: string) => {
		setExpandedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(groupId)) {
				next.delete(groupId);
			} else {
				next.add(groupId);
			}
			return next;
		});
	}, []);

	// Initialize: expand all groups by default (only once)
	useEffect(() => {
		if (serviceGroups.groups.length > 0 && !groupsInitialized.current) {
			const allGroupIds = new Set(serviceGroups.groups.map((g) => g.group.id));
			setExpandedGroups(allGroupIds);
			groupsInitialized.current = true;
		}
	}, [serviceGroups.groups.length]);

	const getPublicUrl = useCallback((filePath: string) => {
		const { data } = supabase.storage
			.from('salon-files')
			.getPublicUrl(filePath);
		return data.publicUrl;
	}, []);

	const tabs = ['Services', 'Information', 'Reviews'] as const;
	const tabLabel = (tab: (typeof tabs)[number]) => {
		switch (tab) {
			case 'Services':
				return t.salon.services;
			case 'Reviews':
				return t.salon.reviews;
			case 'Information':
				return t.salon.information;
			default:
				return tab;
		}
	};

	return (
		<main className="py-6 sm:py-8 px-4 sm:px-6" role="main">
			<div className="mx-auto max-w-6xl">
				{/* Salon Title */}
				<header className="flex items-start justify-between mb-6 sm:mb-8 gap-2">
					<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 flex-1 min-w-0">
						{salon.name}
					</h1>
					<button
						onClick={handleFavoriteClick}
						className={`p-1 sm:p-3 rounded-full transition-all hover:bg-gray-100 flex-shrink-0 ${
							isFavorite ? 'text-[#ff5b5b]' : 'text-gray-400'
						}`}
						aria-label={
							isFavorite ? 'Remove from favorites' : 'Add to favorites'
						}
					>
						<Heart
							className={`w-6 h-6 ${isFavorite ? 'fill-[#ff5b5b]' : ''}`}
						/>
					</button>
				</header>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Left Column - Main Content */}
					<section className="lg:col-span-2" aria-label="Salon information">
						{/* Photo Slider */}
						<div className="mb-8">
							<SalonPhotoSlider
								photos={salon.photos || []}
								logo={salon.logo}
								salonName={salon.name}
							/>
						</div>

						{/* Navigation Tabs */}
						<nav
							role="tablist"
							aria-label="Salon information tabs"
							className="flex md:gap-8 gap-4 mb-8 border-b border-gray-200"
						>
							{tabs.map((tab) => (
								<button
									key={tab}
									role="tab"
									aria-selected={activeTab === tab}
									aria-controls={`tabpanel-${tab.toLowerCase()}`}
									id={`tab-${tab.toLowerCase()}`}
									onClick={() => setActiveTab(tab)}
									className={`pb-2 md:pb-4 px-1 text-sm md:text-lg font-medium transition-colors rounded-t ${
										activeTab === tab
											? 'text-[#ff5b5b] border-b-2 border-[#ff5b5b]'
											: 'text-gray-600 hover:text-gray-900'
									} ${tab === 'Information' ? 'md:hidden' : ''}`}
								>
									{tabLabel(tab)}
								</button>
							))}
						</nav>

						{/* Tab Content */}
						{activeTab === 'Services' && (
							<div
								role="tabpanel"
								id="tabpanel-services"
								aria-labelledby="tab-services"
								className="min-h-[400px]"
							>
								{serviceGroups.groups.length > 0 ||
								serviceGroups.ungrouped.length > 0 ? (
									<>
										{/* Service Groups */}
										{serviceGroups.groups.map(({ group, services }) => {
											const isExpanded = expandedGroups.has(group.id);
											return (
												<section
													key={group.id}
													className="mb-6 bg-white rounded-lg border border-gray-200"
												>
													<button
														type="button"
														onClick={(e) => {
															e.preventDefault();
															toggleGroup(group.id);
														}}
														className="w-full flex items-center justify-between p-4"
														aria-expanded={isExpanded}
														aria-controls={`group-${group.id}`}
													>
														<h2 className="text-xl font-bold text-gray-900">
															{group.name}
														</h2>
														<div className="flex items-center gap-2">
															<span className="text-sm text-gray-500">
																{services.length}{' '}
																{(() => {
																	const count = services.length;
																	// Russian pluralization rules
																	if (language === 'ru') {
																		if (count === 1) {
																			return t.salon.serviceSingular;
																		} else if (count >= 2 && count <= 4) {
																			return t.salon.servicePlural;
																		} else {
																			return t.salon.serviceGenitive;
																		}
																	}
																	// English and Vietnamese: simple singular/plural
																	return count === 1
																		? t.salon.serviceSingular
																		: t.salon.servicePlural;
																})()}
															</span>
															<ChevronDown
																className={`w-5 h-5 text-gray-600 transition-transform ${
																	isExpanded ? 'rotate-180' : ''
																}`}
															/>
														</div>
													</button>
													{isExpanded && (
														<div id={`group-${group.id}`} className="space-y-4">
															{services.map((service) => {
																const localizedName = getLocalizedServiceName(
																	service,
																	language
																);
																const localizedDescription =
																	getLocalizedServiceDescription(
																		service,
																		language
																	);
																return (
																	<article
																		key={service.id}
																		className="  px-3 py-4 md:p-6 border border-gray-100"
																	>
																		<div className="flex justify-between items-start">
																			<div className="flex-1">
																				<h3 className="text-md md:text-xl font-semibold text-gray-900 mb-2">
																					{localizedName}
																				</h3>
																				{localizedDescription && (
																					<p className="text-gray-600 mb-3 hidden md:block">
																						{localizedDescription}
																					</p>
																				)}
																				<div className="flex items-center gap-4 text-sm md:text-md text-gray-500">
																					<span className="flex gap-1">
																						<span className="sr-only">
																							Duration:{' '}
																						</span>
																						<Clock className="w-4 h-4 md:w-5 md:h-5 md:mt-[2px]" />{' '}
																						<span className="text-xs md:text-sm">
																							{service.duration} min
																						</span>
																					</span>
																					<span className="text-[#ff5b5b] font-semibold text-sm md:text-lg">
																						<span className="sr-only">
																							Price:{' '}
																						</span>
																						{formatVND(service.price)}
																					</span>
																				</div>
																			</div>
																			<button
																				onClick={() =>
																					handleBookService(service)
																				}
																				className="ml-4 bg-[#ff5b5b] text-white px-4 md:px-6 md:py-2 py-1 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 text-sm md:text-base"
																				aria-label={`${t.salon.bookNow} ${localizedName}`}
																			>
																				<span className="md:hidden">
																					{t.salon.bookNow}
																				</span>
																				<span className="hidden md:inline">
																					{t.salon.bookNow}
																				</span>
																			</button>
																		</div>
																	</article>
																);
															})}
														</div>
													)}
												</section>
											);
										})}

										{/* Ungrouped Services */}
										{serviceGroups.ungrouped.length > 0 && (
											<section className="mt-8">
												<div className="space-y-4">
													{serviceGroups.ungrouped.map((service) => {
														const localizedName = getLocalizedServiceName(
															service,
															language
														);
														const localizedDescription =
															getLocalizedServiceDescription(service, language);
														return (
															<article
																key={service.id}
																className="bg-white rounded-lg px-3 py-4 md:p-6 hover:shadow-md transition-shadow border border-gray-100"
															>
																<div className="flex justify-between items-start">
																	<div className="flex-1">
																		<h3 className="text-md md:text-xl font-semibold text-gray-900 mb-2">
																			{localizedName}
																		</h3>
																		{localizedDescription && (
																			<p className="text-gray-600 mb-3 hidden md:block">
																				{localizedDescription}
																			</p>
																		)}
																		<div className="flex items-center gap-4 text-sm md:text-md text-gray-500">
																			<span className="flex gap-1">
																				<span className="sr-only">
																					Duration:{' '}
																				</span>
																				<Clock className="w-4 h-4 md:w-5 md:h-5 md:mt-[2px]" />{' '}
																				<span className="text-xs md:text-sm">
																					{service.duration} min
																				</span>
																			</span>
																			<span className="text-[#ff5b5b] font-semibold text-sm md:text-lg">
																				<span className="sr-only">Price: </span>
																				{formatVND(service.price)}
																			</span>
																		</div>
																	</div>
																	<button
																		onClick={() => handleBookService(service)}
																		className="ml-4 bg-[#ff5b5b] text-white px-4 md:px-6 md:py-2 py-1 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 text-sm md:text-base"
																		aria-label={`${t.salon.bookNow} ${localizedName}`}
																	>
																		<span className="md:hidden">
																			{t.salon.bookNow}
																		</span>
																		<span className="hidden md:inline">
																			{t.salon.bookNow}
																		</span>
																	</button>
																</div>
															</article>
														);
													})}
												</div>
											</section>
										)}
									</>
								) : (
									<div className="text-center py-12">
										<h3 className="text-xl font-semibold text-gray-900 mb-2">
											{t.emptyStates.noServicesAvailable}
										</h3>
										<p className="text-gray-600">
											{t.emptyStates.noServicesDescription}
										</p>
									</div>
								)}
							</div>
						)}

						{activeTab === 'Reviews' && (
							<div
								role="tabpanel"
								id="tabpanel-reviews"
								aria-labelledby="tab-reviews"
								className="min-h-[400px]"
							>
								<ReviewsSection
									reviews={salon.reviews || []}
									className="w-full"
								/>
							</div>
						)}

						{activeTab === 'Information' && (
							<div
								role="tabpanel"
								id="tabpanel-information"
								aria-labelledby="tab-information"
								className="min-h-[400px]"
							>
								{/* Mobile Information Content - Same as sidebar */}
								<div className="md:hidden rounded-xl py-3">
									<h2 className="text-xl font-bold text-gray-900 mb-4">
										{salon.name}
									</h2>

									{salon.description && (
										<p className="text-gray-700 leading-relaxed mb-6">
											{salon.description}
										</p>
									)}

									{/* Mini Map */}
									{(salon.address || (salon.latitude && salon.longitude)) && (
										<div className="mb-6">
											<h3 className="text-lg font-semibold text-gray-900 mb-3">
												{t.salon.location}
											</h3>
											<div className="w-full rounded-lg overflow-hidden border border-gray-200">
												<MapComponentWithCoords
													lat={salon.latitude}
													lon={salon.longitude}
													address={salon.address}
													showPopup={false}
													interactive={false}
													height="250px"
												/>
											</div>
											<button
												onClick={handleGetDirections}
												className="w-full mt-3 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
												aria-label={t.salon.getDirections}
											>
												{t.salon.getDirections}
											</button>
										</div>
									)}

									<div>
										{(() => {
											const rating = calculateAverageRating(salon);
											const reviewCount = getReviewCount(salon);

											if (rating > 0) {
												return (
													<div className="flex items-center gap-2 mb-3">
														<div
															className="flex"
															role="img"
															aria-label={`${rating} star rating`}
														>
															{renderStars(rating)}
														</div>
														<span className="text-gray-600 text-sm">
															{rating}/5 ({reviewCount} {t.salon.reviews})
														</span>
													</div>
												);
											}
										})()}
									</div>

									<div className="space-y-4">
										{salon.address && (
											<div>
												<div className="flex items-center gap-1.5 mb-1">
													<span
														className="text-gray-600"
														role="img"
														aria-label="Location"
													>
														<MapPin className="w-4 h-4" />
													</span>
													<span className="font-medium text-gray-900">
														{t.salon.address}
													</span>
												</div>
												<address className="text-gray-600 text-sm ml-6 not-italic">
													{salon.address}
												</address>
											</div>
										)}

										<div>
											<div className="flex items-center gap-1.5 mb-1">
												<span
													className="text-gray-600"
													role="img"
													aria-label="Clock"
												>
													<Clock className="w-4 h-4" />
												</span>
												<span className="font-medium text-gray-900">
													{t.salon.workingHours}
												</span>
											</div>
											<div className="text-gray-600 text-sm ml-6">
												<pre
													className="whitespace-pre-line text-xs"
													role="text"
												>
													{formatWorkingHours(salon.workingHours)}
												</pre>
											</div>
										</div>

										{salon.phone && (
											<div>
												<a
													href={`tel:${salon.phone}`}
													className="text-gray-600 text-sm hover:text-[#ff5b5b] transition-colors flex gap-1.5"
												>
													<Phone className="w-4 h-4" /> {salon.phone}
												</a>
											</div>
										)}

										{salon.website && (
											<div>
												<a
													href={salon.website}
													target="_blank"
													rel="noopener noreferrer"
													className="text-gray-600 text-sm flex gap-1.5 hover:text-[#ff5b5b] transition-colors break-all"
												>
													<Globe className="w-4 h-4" /> {salon.website}
												</a>
											</div>
										)}

										{salon.instagram && (
											<div>
												<a
													href={
														salon.instagram.startsWith('@')
															? `https://instagram.com/${salon.instagram.substring(1)}`
															: salon.instagram
													}
													target="_blank"
													rel="noopener noreferrer"
													className="text-gray-600 text-sm flex gap-1.5 hover:text-[#ff5b5b] transition-colors"
												>
													<Instagram className="w-4 h-4" />
													{salon.instagram}
												</a>
											</div>
										)}
									</div>
								</div>
							</div>
						)}
					</section>

					{/* Right Column - Sidebar */}
					<aside
						className="hidden md:block bg-white rounded-xl p-6 h-fit shadow-sm"
						aria-label="Salon details"
					>
						<h2 className="text-xl font-bold text-gray-900 mb-4">
							{salon.name}
						</h2>

						{salon.description && (
							<p className="text-gray-700 leading-relaxed mb-6">
								{salon.description}
							</p>
						)}

						{/* Mini Map */}
						{(salon.address || (salon.latitude && salon.longitude)) && (
							<div className="mb-6">
								<h3 className="text-lg font-semibold text-gray-900 mb-3">
									{t.salon.location}
								</h3>
								{(() => {
									console.log('🗺️ Salon map data:', {
										latitude: salon.latitude,
										longitude: salon.longitude,
										address: salon.address,
										hasCoords: !!(salon.latitude && salon.longitude),
										hasAddress: !!salon.address,
									});
									return null;
								})()}
								<div className="w-full rounded-lg overflow-hidden border border-gray-200">
									<MapComponentWithCoords
										lat={salon.latitude}
										lon={salon.longitude}
										address={salon.address}
										showPopup={false}
										interactive={false}
										height="250px"
									/>
								</div>
								<button
									onClick={handleGetDirections}
									className="w-full mt-3 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
									aria-label={t.salon.getDirections}
								>
									{t.salon.getDirections}
								</button>
							</div>
						)}

						<div>
							{(() => {
								const rating = calculateAverageRating(salon);
								const reviewCount = getReviewCount(salon);

								if (rating > 0) {
									return (
										<div className="flex items-center gap-2 mb-3">
											<div
												className="flex"
												role="img"
												aria-label={`${rating} star rating`}
											>
												{renderStars(rating)}
											</div>
											<span className="text-gray-600 text-sm">
												{rating}/5 ({reviewCount} {t.salon.reviews})
											</span>
										</div>
									);
								}
							})()}
						</div>

						<div className="space-y-4">
							{salon.address && (
								<div>
									<div className="flex items-center gap-1.5 mb-1">
										<span
											className="text-gray-600"
											role="img"
											aria-label="Location"
										>
											<MapPin className="w-4 h-4" />
										</span>
										<span className="font-medium text-gray-900">
											{t.salon.address}
										</span>
									</div>
									<address className="text-gray-600 text-sm ml-6 not-italic">
										{salon.address}
									</address>
								</div>
							)}

							<div>
								<div className="flex items-center gap-1.5 mb-1">
									<span className="text-gray-600" role="img" aria-label="Clock">
										<Clock className="w-4 h-4" />
									</span>
									<span className="font-medium text-gray-900">
										{t.salon.workingHours}
									</span>
								</div>
								<div className="text-gray-600 text-sm ml-6">
									<pre className="whitespace-pre-line text-xs" role="text">
										{formatWorkingHours(salon.workingHours)}
									</pre>
								</div>
							</div>

							{salon.phone && (
								<div>
									<a
										href={`tel:${salon.phone}`}
										className="text-gray-600 text-sm hover:text-[#ff5b5b] transition-colors flex gap-1.5"
									>
										<Phone className="w-4 h-4" /> {salon.phone}
									</a>
								</div>
							)}

							{salon.website && (
								<div>
									<a
										href={salon.website}
										target="_blank"
										rel="noopener noreferrer"
										className="text-gray-600 text-sm flex gap-1.5 hover:text-[#ff5b5b] transition-colors break-all"
									>
										<Globe className="w-4 h-4" /> {salon.website}
									</a>
								</div>
							)}

							{salon.instagram && (
								<div>
									<a
										href={
											salon.instagram.startsWith('@')
												? `https://instagram.com/${salon.instagram.substring(1)}`
												: salon.instagram
										}
										target="_blank"
										rel="noopener noreferrer"
										className="text-gray-600 text-sm flex gap-1.5 hover:text-[#ff5b5b] transition-colors"
									>
										<Instagram className="w-4 h-4" />
										{salon.instagram}
									</a>
								</div>
							)}
						</div>
					</aside>
				</div>
			</div>

			{/* Booking Modal */}
			<BookingModal
				isOpen={isBookingModalOpen}
				onClose={handleCloseBookingModal}
				salonId={salon.id}
				service={selectedService || undefined}
				salonName={salon.name}
				workingHours={salon.workingHours}
			/>
		</main>
	);
}
