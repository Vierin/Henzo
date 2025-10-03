// Simple TypeScript interfaces for service data transfer

export interface CreateServiceDto {
	name: string;
	description?: string;
	duration: number;
	price: number;
	salonId: string;
	serviceCategoryId?: number;
}

export interface UpdateServiceDto {
	name?: string;
	description?: string;
	duration?: number;
	price?: number;
	serviceCategoryId?: number;
}

export interface ServiceResponseDto {
	id: string;
	name: string;
	description?: string;
	duration: number;
	price: number;
	salonId?: string;
	serviceCategoryId?: number;
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
