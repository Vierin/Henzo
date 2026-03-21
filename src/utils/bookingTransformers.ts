import { Booking } from '@/types';
import { BookingWithDetailsDto } from '@/types/dto/booking.dto';

/**
 * Converts BookingWithDetailsDto to Booking type
 * Used across owner dashboard and calendar components
 * Handles both camelCase (service, staff, user, salon) and PascalCase (Service, Staff, User, Salon) from backend
 */
export const convertBookingDtoToBooking = (dto: BookingWithDetailsDto | any): Booking => {
	// Normalize relation names - backend returns PascalCase, but we support both
	const service = dto.service || dto.Service;
	const staff = dto.staff || dto.Staff;
	const user = dto.user || dto.User;
	const salon = dto.salon || dto.Salon;

	const rawTime = dto.time ?? dto.dateTime;
	let timeStr = '';
	if (rawTime instanceof Date) {
		timeStr = rawTime.toISOString();
	} else if (typeof rawTime === 'string') {
		timeStr = rawTime;
	} else if (rawTime != null) {
		timeStr = String(rawTime);
	}

	return {
		id: dto.id,
		salonId: dto.salonId,
		userId: dto.userId,
		clientId: dto.clientId || dto.userId,
		serviceId: dto.serviceId,
		staffId: dto.staffId,
		time: timeStr,
		status: dto.status,
		notes: dto.notes,
		createdAt: dto.createdAt,
		service: service
			? {
					id: service.id,
					name: service.name || '',
					nameEn: service.nameEn,
					nameVi: service.nameVi,
					nameRu: service.nameRu,
					description: service.description,
					duration: service.duration,
					price: service.price,
					salonId: dto.salonId,
				}
			: undefined,
		salon: salon
			? {
					id: salon.id,
					name: salon.name,
					address: salon.address,
					ownerId: salon.ownerId || '',
					createdAt: salon.createdAt || '',
				}
			: undefined,
		staff: staff
			? {
					id: staff.id,
					name: staff.name,
					role: staff.accessLevel || staff.role,
					accessLevel: (staff.accessLevel || staff.role) as 'ADMIN' | 'EMPLOYEE',
					salonId: dto.salonId,
				}
			: undefined,
		user: user
			? {
					id: user.id,
					email: user.email,
					name: user.name,
					phone: user.phone,
					role: 'CLIENT' as const,
					createdAt: user.createdAt || '',
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










