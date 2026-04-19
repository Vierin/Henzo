import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMemo, memo } from 'react';
import { Salon, Service } from '@/types';
import { ServiceResponseDto } from '@/types/dto/service.dto';
import { useSalonSlug } from '@/hooks/useSalonSlug';
import SalonImage from './SalonImage';
import { Phone, Star, Clock, Clock8, Heart } from 'lucide-react';
import {
	calculateAverageRating,
	getReviewCount,
	getWorkingHoursOnSelectedDate,
	formatWorkingHoursRange,
} from '@/utils/salonUtils';
import RatingBadge from '@/components/RatingBadge';
import { formatVND } from '@/utils/currency';
import {
	useAddFavorite,
	useRemoveFavorite,
	useIsFavorite,
} from '@/hooks/useFavorites';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage, useTranslation } from '@/contexts/LanguageContext';
import { getLocalizedServiceName } from '@/utils/serviceLocalization';
import { haversineDistanceKm } from '@/utils/mapUtils';

interface SalonCardProps {
	salon: Salon;
	onBookService?: (
		service: Service | ServiceResponseDto,
		salonId: string,
		salonName: string
	) => void;
	className?: string;
	selectedDate?: Date | null;
	selectedTimeInterval?: string;
	priority?: boolean;
	/** When set, show approximate distance from user before the address */
	userLocation?: { lat: number; lng: number } | null;
}

function SalonCard({
	salon,
	onBookService,
	className = '',
	selectedDate,
	selectedTimeInterval: _selectedTimeInterval,
	priority = false,
	userLocation = null,
}: SalonCardProps) {
	const router = useRouter();
	const { getSalonUrl } = useSalonSlug();
	const { user } = useAuthStore();
	const { language } = useLanguage();
	const t = useTranslation();
	const isFavorite = useIsFavorite(salon.id, !!user);
	const addFavoriteMutation = useAddFavorite();
	const removeFavoriteMutation = useRemoveFavorite();

	const scheduleForSelectedDay = useMemo(() => {
		if (!selectedDate) return null;
		return getWorkingHoursOnSelectedDate(salon, selectedDate);
	}, [salon, selectedDate]);

	const addr = salon.address?.trim() ?? '';
	let addressLine = addr;
	if (
		userLocation &&
		salon.latitude != null &&
		salon.longitude != null
	) {
		const km = haversineDistanceKm(userLocation, {
			lat: salon.latitude,
			lng: salon.longitude,
		});
		const prefix = `${km.toFixed(1)} ${t.salon.km}`;
		addressLine = addr ? `${prefix} — ${addr}` : prefix;
	}

	// Мемоизируем URL салона
	const salonUrl = useMemo(
		() => getSalonUrl(salon),
		[salon.id, salon.name, salon.address, getSalonUrl]
	);

	const handleBookService = (e: React.MouseEvent, service: Service) => {
		e.stopPropagation();
		e.preventDefault();
		if (onBookService) {
			onBookService(service, salon.id, salon.name);
		}
	};

	const handleFavoriteClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();

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
	};

	return (
		<Link
			href={salonUrl}
			prefetch={true}
			className={`bg-white rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-shadow block ${className}`}
		>
			<div className="flex flex-col md:flex-row gap-4 md:gap-6">
				{/* Salon Image */}
				<div className="w-full md:w-[360px] aspect-[4/3] flex-shrink-0 overflow-hidden rounded-xl">
					<SalonImage
						src={
							// Use first photo if available
							salon.photos && salon.photos.length > 0
								? salon.photos[0]
								: undefined
						}
						alt={salon.name}
						width={360}
						height={270}
						className="w-full h-full object-cover rounded-xl"
						priority={priority} // Критично: Priority для первых изображений
					/>
				</div>

				{/* Salon Info */}
				<div className="flex-1 min-w-0">
					<div className="flex items-center justify-between mb-2 gap-2">
						<h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
							{salon.name}
						</h2>
						<div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
							{/* Rating */}
							<RatingBadge salon={salon} variant="inline" />
							{/* Favorite Button */}
							<button
								onClick={handleFavoriteClick}
								className={`p-2 rounded-full transition-all hover:bg-gray-100 ${
									isFavorite ? 'text-[#ff5b5b]' : 'text-gray-400'
								}`}
								aria-label={
									isFavorite ? 'Remove from favorites' : 'Add to favorites'
								}
							>
								<Heart
									className={`w-5 h-5 ${isFavorite ? 'fill-[#ff5b5b]' : ''}`}
								/>
							</button>
						</div>
					</div>
					<p className="text-gray-600 text-sm mb-2 truncate">{addressLine}</p>
					{salon.phone && (
						<p className="text-gray-500 text-sm mb-3 flex gap-1 items-center">
							<Phone className="w-3.5 h-3.5 flex-shrink-0" />
							<span className="truncate">{salon.phone}</span>
						</p>
					)}

					{/* Working hours on user-selected search date */}
					{selectedDate && scheduleForSelectedDay && (
						<div
							className={`flex items-center gap-1 mb-3 ${
								scheduleForSelectedDay.status === 'open'
									? 'text-green-600'
									: 'text-gray-500'
							}`}
						>
							<Clock className="w-4 h-4 flex-shrink-0" />
							<span className="text-sm font-medium">
								{t('salon.worksOnSelectedDay')}{' '}
								{scheduleForSelectedDay.status === 'open'
									? formatWorkingHoursRange(
											scheduleForSelectedDay.open,
											scheduleForSelectedDay.close,
											language
										)
									: t('salon.closedOnSelectedDay')}
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Services */}
			{salon.services && salon.services.length > 0 ? (
				<div className="mt-4">
					<div className="flex flex-col md:flex-row gap-2 md:gap-3">
						{salon.services
							.slice(0, 3)
							.map((service: Service, index: number) => {
								const localizedName = getLocalizedServiceName(
									service,
									language
								);
								return (
									<div
										key={service.id || index}
										className="flex items-center w-full md:max-w-[33.33%] justify-between py-3 px-3 sm:px-4 bg-gray-50 rounded-lg gap-2"
									>
										<div className="flex-1 min-w-0">
											<span className="text-sm font-medium text-gray-900 block truncate">
												{localizedName}
											</span>
											<div className="flex items-center gap-2 sm:gap-4 mt-1">
												<span className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
													<Clock8 className="w-3.5 h-3.5" /> {service.duration}{' '}
													min
												</span>
												<span className="text-sm font-semibold text-[#ff5b5b] truncate">
													{formatVND(service.price)}
												</span>
											</div>
										</div>
										{onBookService && (
											<button
												onClick={(e) => handleBookService(e, service)}
												className="bg-[#ff5b5b] text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-[#e04a4a] transition-colors flex-shrink-0"
											>
												{t.salon.book || t.salon.bookNow}
											</button>
										)}
									</div>
								);
							})}
					</div>
				</div>
			) : (
				<div className="mt-4 text-center py-4">
					<p className="text-gray-500 text-sm">
						{t.emptyStates.noServicesAvailable}
					</p>
				</div>
			)}

			{salon.services && salon.services.length > 3 && (
				<div className="text-center py-2">
					<span className="text-[#ff5b5b] text-sm font-medium hover:text-[#e04a4a] transition-colors">
						{t.salon.viewAllServices.replace(
							'{count}',
							salon.services.length.toString()
						)}
					</span>
				</div>
			)}
		</Link>
	);
}

export default memo(SalonCard);
