import { useRouter } from 'next/navigation';
import { Salon, Service } from '@/types';
import { ServiceResponseDto } from '@/types/dto/service.dto';
import { useSalonSlug } from '@/hooks/useSalonSlug';
import SalonImage from './SalonImage';

interface SalonCardProps {
	salon: Salon;
	onBookService?: (
		service: ServiceResponseDto,
		salonId: string,
		salonName: string
	) => void;
	className?: string;
}

export default function SalonCard({
	salon,
	onBookService,
	className = '',
}: SalonCardProps) {
	const router = useRouter();
	const { getSalonUrl } = useSalonSlug();

	const handleSalonClick = () => {
		router.push(getSalonUrl(salon));
	};

	const handleBookService = (e: React.MouseEvent, service: Service) => {
		e.stopPropagation();
		if (onBookService) {
			onBookService(service, salon.id, salon.name);
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
					className="w-48 h-48 object-cover rounded-xl flex-shrink-0"
					style={{ width: 'auto', height: 'auto' }}
				/>

				{/* Salon Info */}
				<div className="flex-1">
					<h2 className="text-xl font-bold text-gray-900 mb-2">{salon.name}</h2>
					<p className="text-gray-600 text-sm mb-2">{salon.address}</p>
					{salon.phone && (
						<p className="text-gray-500 text-sm mb-3">📞 {salon.phone}</p>
					)}
				</div>
			</div>

			{/* Services */}
			{salon.services && salon.services.length > 0 ? (
				<div className="mt-4">
					<div className="space-y-2 flex justify-between gap-3">
						{salon.services
							.slice(0, 3)
							.map((service: Service, index: number) => (
								<div
									key={service.id || index}
									className="flex items-center w-full justify-between py-2 px-3 bg-gray-50 rounded-lg"
								>
									<div className="flex-1">
										<span className="text-sm font-medium text-gray-900">
											{service.name}
										</span>
										<div className="flex items-center gap-4 mt-1">
											<span className="text-xs text-gray-500">
												⏱️ {service.duration} min
											</span>
											<span className="text-sm font-semibold text-[#ff5b5b]">
												${service.price}
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
