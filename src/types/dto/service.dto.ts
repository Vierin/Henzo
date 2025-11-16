// Simple TypeScript interfaces for service data transfer
import { ServiceGroup } from '../index';

export interface CreateServiceDto {
	name: string;
	description?: string;
	nameEn?: string;
	nameVi?: string;
	nameRu?: string;
	descriptionEn?: string;
	descriptionVi?: string;
	descriptionRu?: string;
	duration: number;
	price: number;
	salonId: string;
	serviceCategoryId?: number;
	serviceGroupId?: string;
}

export interface UpdateServiceDto {
	name?: string;
	description?: string;
	nameEn?: string;
	nameVi?: string;
	nameRu?: string;
	descriptionEn?: string;
	descriptionVi?: string;
	descriptionRu?: string;
	duration?: number;
	price?: number;
	serviceCategoryId?: number;
	serviceGroupId?: string;
}

export interface ServiceResponseDto {
	id: string;
	name: string;
	description?: string;
	nameEn?: string;
	nameVi?: string;
	nameRu?: string;
	descriptionEn?: string;
	descriptionVi?: string;
	descriptionRu?: string;
	duration: number;
	price: number;
	salonId?: string;
	serviceCategoryId?: number;
	serviceGroupId?: string | null;
	serviceGroup?: ServiceGroup;
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
