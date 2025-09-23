// Simple TypeScript interfaces for service data transfer

export interface CreateServiceDto {
	name: string;
	description?: string;
	duration: number;
	price: number;
	salonId: string;
	categoryId?: string;
}

export interface UpdateServiceDto {
	name?: string;
	description?: string;
	duration?: number;
	price?: number;
	categoryId?: string;
}

export interface ServiceResponseDto {
	id: string;
	name: string;
	description?: string;
	duration: number;
	price: number;
	salonId?: string;
	categoryId?: string;
}

export interface ServiceWithStaffDto extends ServiceResponseDto {
	staff: StaffResponseDto[];
}

// Import from staff DTO
interface StaffResponseDto {
	id: string;
	name: string;
	accessLevel: string;
}
