// Simple TypeScript interfaces for booking data transfer

export enum BookingStatus {
	PENDING = 'PENDING',
	CONFIRMED = 'CONFIRMED',
	COMPLETED = 'COMPLETED',
	CANCELED = 'CANCELED',
	NOSHOW = 'NOSHOW',
}

export interface CreateBookingDto {
	salonId: string;
	serviceId: string;
	staffId?: string;
	time: string;
	notes?: string;
}

export interface UpdateBookingDto {
	serviceId?: string;
	staffId?: string;
	time?: string;
	status?: BookingStatus;
	notes?: string;
}

export interface BookingResponseDto {
	id: string;
	salonId: string;
	userId: string;
	clientId: string;
	serviceId: string;
	staffId?: string;
	time: string;
	status: BookingStatus;
	notes?: string;
	createdAt: string;
}

export interface BookingWithDetailsDto extends BookingResponseDto {
	user: UserResponseDto;
	client: ClientResponseDto;
	service: ServiceResponseDto;
	staff?: StaffResponseDto;
	salon: SalonResponseDto;
}

// Import from other DTOs
interface UserResponseDto {
	id: string;
	email: string;
	name?: string;
	phone?: string;
}

interface ClientResponseDto {
	id: string;
	name: string;
	phone: string;
	email?: string;
}

interface ServiceResponseDto {
	id: string;
	name: string;
	description?: string;
	duration: number;
	price: number;
}

interface StaffResponseDto {
	id: string;
	name: string;
	accessLevel: string;
}

interface SalonResponseDto {
	id: string;
	name: string;
	address?: string;
	phone?: string;
}
