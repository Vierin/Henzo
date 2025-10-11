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

interface SalonCardProps {
	salon: Salon;
	onBookService?: (
		service: ServiceResponseDto,
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
	const isFavorite = useIsFavorite(salon.id);
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
			className={`bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer ${className}`}
		>
			<div className="flex gap-6">
				{/* Salon Image */}
				<SalonImage
					src={salon.logo}
					alt={salon.name}
					width={400}
					height={320}
					className="w-48 aspect-[4/3] object-cover rounded-xl flex-shrink-0"
					style={{ width: 'auto', height: 'auto' }}
				/>

				{/* Salon Info */}
				<div className="flex-1">
					<div className="flex items-center justify-between mb-2">
						<h2 className="text-xl font-bold text-gray-900">{salon.name}</h2>
						<div className="flex items-center gap-3">
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
					<p className="text-gray-600 text-sm mb-2">{salon.address}</p>
					{salon.phone && (
						<p className="text-gray-500 text-sm mb-3 flex gap-1">
							<Phone className="w-3.5 h-3.5 relative top-0.5" /> {salon.phone}
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
					<div className="flex justify-between gap-3">
						{salon.services
							.slice(0, 3)
							.map((service: Service, index: number) => (
								<div
									key={service.id || index}
									className="flex items-center w-full max-w-[33.33%] justify-between py-2 px-3 bg-gray-50 rounded-lg"
								>
									<div className="flex-1">
										<span className="text-sm font-medium text-gray-900">
											{service.name}
										</span>
										<div className="flex items-center gap-4 mt-1">
											<span className="text-xs text-gray-500 flex items-center gap-1">
												<Clock8 className="w-3.5 h-3.5 relative" />{' '}
												{service.duration} min
											</span>
											<span className="text-sm font-semibold text-[#ff5b5b]">
												{formatVND(service.price)}
											</span>
										</div>
									</div>
									{onBookService && (
										<button
											onClick={(e) => handleBookService(e, service)}
											className="bg-[#ff5b5b] text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-[#e04a4a] transition-colors"
										>
											Book
										</button>
									)}
								</div>
							))}
					</div>
				</div>
			) : (
				<div className="mt-4 text-center py-4">
					<p className="text-gray-500 text-sm">No services available</p>
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
						View all {salon.services.length} services →
					</button>
				</div>
			)}
		</div>
	);
}
