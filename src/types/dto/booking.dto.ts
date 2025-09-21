import {
	IsString,
	IsOptional,
	IsEnum,
	IsDateString,
	IsArray,
} from 'class-validator';

export enum BookingStatus {
	PENDING = 'PENDING',
	CONFIRMED = 'CONFIRMED',
	CANCELED = 'CANCELED',
}

export class CreateBookingDto {
	@IsString()
	salonId: string;

	@IsString()
	serviceId: string;

	@IsOptional()
	@IsString()
	staffId?: string;

	@IsDateString()
	time: string;

	@IsOptional()
	@IsString()
	notes?: string;
}

export class UpdateBookingDto {
	@IsOptional()
	@IsString()
	serviceId?: string;

	@IsOptional()
	@IsString()
	staffId?: string;

	@IsOptional()
	@IsDateString()
	time?: string;

	@IsOptional()
	@IsEnum(BookingStatus)
	status?: BookingStatus;

	@IsOptional()
	@IsString()
	notes?: string;
}

export class BookingResponseDto {
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

export class BookingWithDetailsDto extends BookingResponseDto {
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
