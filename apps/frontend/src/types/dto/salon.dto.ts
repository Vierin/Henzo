// Simple TypeScript interfaces for salon data transfer
// These replace the class-validator DTOs for frontend usage

export interface WorkingHoursDto {
	monday?: { open: string; close: string; closed?: boolean };
	tuesday?: { open: string; close: string; closed?: boolean };
	wednesday?: { open: string; close: string; closed?: boolean };
	thursday?: { open: string; close: string; closed?: boolean };
	friday?: { open: string; close: string; closed?: boolean };
	saturday?: { open: string; close: string; closed?: boolean };
	sunday?: { open: string; close: string; closed?: boolean };
}

export interface CreateSalonDto {
	name: string;
	description?: string;
	address?: string;
	phone?: string;
	email?: string;
	website?: string;
	instagram?: string;
	photos?: string[];
	workingHours?: WorkingHoursDto;
}

export interface UpdateSalonDto {
	name?: string;
	description?: string;
	address?: string;
	phone?: string;
	email?: string;
	website?: string;
	instagram?: string;
	photos?: string[];
	workingHours?: WorkingHoursDto;
}

export interface SalonResponseDto {
	id: string;
	name: string;
	description?: string;
	address?: string;
	phone?: string;
	email?: string;
	website?: string;
	instagram?: string;
	photos?: string[];
	workingHours?: WorkingHoursDto;
	ownerId: string;
	createdAt: string;
	slug?: string;
	status?: 'DRAFT' | 'READY' | 'ACTIVE';
}

export interface SalonWithDetailsResponseDto extends SalonResponseDto {
	services: ServiceResponseDto[];
	staff: StaffResponseDto[];
	reviews?: ReviewResponseDto[];
}

// Import these from their respective DTOs
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
	email?: string;
	phone?: string;
}

interface ReviewResponseDto {
	id: string;
	salonId: string;
	userId: string;
	bookingId?: string;
	rating: number;
	comment?: string;
	createdAt: string;
	user?: {
		name?: string;
		email?: string;
	};
}
