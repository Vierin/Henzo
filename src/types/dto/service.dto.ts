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
	serviceSubcategoryId?: number;
	serviceGroupId?: string;
	tagIds?: number[];
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
	serviceSubcategoryId?: number | null;
	serviceGroupId?: string | null;
	tagIds?: number[];
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
	serviceSubcategoryId?: number | null;
	tags?: Array<{
		id: number;
		nameEn: string;
		nameRu?: string;
		nameVi?: string;
	}>;
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
