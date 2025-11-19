import { Booking } from '@/types';
import { BookingWithDetailsDto } from '@/types/dto/booking.dto';

/**
 * Converts BookingWithDetailsDto to Booking type
 * Used across owner dashboard and calendar components
 */
export const convertBookingDtoToBooking = (dto: BookingWithDetailsDto | any): Booking => {
	return {
		id: dto.id,
		salonId: dto.salonId,
		userId: dto.userId,
		clientId: dto.clientId || dto.userId,
		serviceId: dto.serviceId,
		staffId: dto.staffId,
		time: dto.time || dto.dateTime,
		status: dto.status,
		notes: dto.notes,
		createdAt: dto.createdAt,
		service: dto.service
			? {
					id: dto.service.id,
					name: dto.service.name || '',
					description: dto.service.description,
					duration: dto.service.duration,
					price: dto.service.price,
					salonId: dto.salonId,
				}
			: undefined,
		salon: dto.salon
			? {
					id: dto.salon.id,
					name: dto.salon.name,
					address: dto.salon.address,
					ownerId: dto.salon.ownerId || '',
					createdAt: dto.salon.createdAt || '',
				}
			: undefined,
		staff: dto.staff
			? {
					id: dto.staff.id,
					name: dto.staff.name,
					role: dto.staff.accessLevel,
					accessLevel: dto.staff.accessLevel as 'ADMIN' | 'EMPLOYEE',
					salonId: dto.salonId,
				}
			: undefined,
		user: dto.user
			? {
					id: dto.user.id,
					email: dto.user.email,
					name: dto.user.name,
					phone: dto.user.phone,
					role: 'CLIENT' as const,
					createdAt: dto.user.createdAt || '',
				}
			: undefined,
	};
};

/**
 * Converts array of BookingWithDetailsDto to Booking array
 */
export const convertBookingDtoArray = (dtos: BookingWithDetailsDto[] | any[]): Booking[] => {
	return dtos.map(convertBookingDtoToBooking);
};




