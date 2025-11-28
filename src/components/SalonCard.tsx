import { useRouter } from 'next/navigation';
import { Salon, Service } from '@/types';
import { ServiceResponseDto } from '@/types/dto/service.dto';
import { useSalonSlug } from '@/hooks/useSalonSlug';
import SalonImage from './SalonImage';
import { Phone, Star, Clock, Clock8, Heart } from 'lucide-react';
import {
	calculateAverageRating,
	getReviewCount,
	getAvailableTimeSlots,
} from '@/utils/salonUtils';
import { formatVND } from '@/utils/currency';
import {
	useAddFavorite,
	useRemoveFavorite,
	useIsFavorite,
} from '@/hooks/useFavorites';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage, useTranslation } from '@/contexts/LanguageContext';
import { getLocalizedServiceName } from '@/utils/serviceLocalization';

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
}

export default function SalonCard({
	salon,
	onBookService,
	className = '',
	selectedDate,
	selectedTimeInterval,
}: SalonCardProps) {
	const router = useRouter();
	const { getSalonUrl } = useSalonSlug();
	const { user } = useAuthStore();
	const { language } = useLanguage();
	const t = useTranslation();
	const isFavorite = useIsFavorite(salon.id, !!user);
	const addFavoriteMutation = useAddFavorite();
	const removeFavoriteMutation = useRemoveFavorite();

	const handleSalonClick = () => {
		router.push(getSalonUrl(salon));
	};

	const handleBookService = (e: React.MouseEvent, service: Service) => {
		e.stopPropagation();
		if (onBookService) {
			onBookService(service, salon.id, salon.name);
		}
	};

	const handleFavoriteClick = (e: React.MouseEvent) => {
		e.stopPropagation();

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
		<div
			onClick={handleSalonClick}
			className={`bg-white rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer ${className}`}
		>
			<div className="flex flex-col md:flex-row gap-4 md:gap-6">
				{/* Salon Image */}
				<SalonImage
					src={salon.logo}
					alt={salon.name}
					width={400}
					height={320}
					className="w-full md:w-48 aspect-[4/3] object-cover rounded-xl md:flex-shrink-0"
					style={{ width: 'auto', height: 'auto' }}
				/>

				{/* Salon Info */}
				<div className="flex-1 min-w-0">
					<div className="flex items-center justify-between mb-2 gap-2">
						<h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
							{salon.name}
						</h2>
						<div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
							{/* Rating */}
							{(() => {
								const rating = calculateAverageRating(salon);
								const reviewCount = getReviewCount(salon);

								if (rating > 0) {
									return (
										<div className="flex items-center space-x-1">
											<Star className="w-4 h-4 fill-[#ff5b5b] text-[#ff5b5b]" />
											<span className="text-sm font-medium text-gray-900">
												{rating}
											</span>
											<span className="text-sm text-gray-500">
												({reviewCount})
											</span>
										</div>
									);
								}
								return null;
							})()}
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
					<p className="text-gray-600 text-sm mb-2 truncate">{salon.address}</p>
					{salon.phone && (
						<p className="text-gray-500 text-sm mb-3 flex gap-1 items-center">
							<Phone className="w-3.5 h-3.5 flex-shrink-0" />
							<span className="truncate">{salon.phone}</span>
						</p>
					)}

					{/* Available Time Slots */}
					{selectedDate &&
						(() => {
							const availableSlots = getAvailableTimeSlots(
								salon,
								selectedDate,
								selectedTimeInterval
							);
							if (availableSlots.length > 0) {
								return (
									<div className="flex items-center space-x-1 mb-3 items-center">
										<Clock className="w-4 h-4 text-green-600" />
										<span className="text-sm text-green-600 font-medium">
											Available: {availableSlots.join(', ')}
										</span>
									</div>
								);
							}
							return null;
						})()}
				</div>
			</div>

			{/* Services */}
			{salon.services && salon.services.length > 0 ? (
				<div className="mt-4">
					<div className="flex flex-col md:flex-row md:justify-between gap-2 md:gap-3">
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
					<button
						onClick={(e) => {
							e.stopPropagation();
							handleSalonClick();
						}}
						className="text-[#ff5b5b] text-sm font-medium hover:text-[#e04a4a] transition-colors"
					>
						{t.categories.viewAllServices.replace('{count}', salon.services.length.toString())}
					</button>
				</div>
			)}
		</div>
	);
}
