import {
	IsString,
	IsOptional,
	IsObject,
	IsEmail,
	IsUrl,
	ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WorkingHoursDto {
	@IsOptional()
	monday?: { open: string; close: string; closed?: boolean };

	@IsOptional()
	tuesday?: { open: string; close: string; closed?: boolean };

	@IsOptional()
	wednesday?: { open: string; close: string; closed?: boolean };

	@IsOptional()
	thursday?: { open: string; close: string; closed?: boolean };

	@IsOptional()
	friday?: { open: string; close: string; closed?: boolean };

	@IsOptional()
	saturday?: { open: string; close: string; closed?: boolean };

	@IsOptional()
	sunday?: { open: string; close: string; closed?: boolean };
}

export class CreateSalonDto {
	@IsString()
	name: string;

	@IsOptional()
	@IsString()
	description?: string;

	@IsOptional()
	@IsString()
	address?: string;

	@IsOptional()
	@IsString()
	phone?: string;

	@IsOptional()
	@IsEmail()
	email?: string;

	@IsOptional()
	@IsUrl()
	website?: string;

	@IsOptional()
	@IsString()
	instagram?: string;

	@IsOptional()
	@IsString()
	logo?: string;

	@IsOptional()
	@ValidateNested()
	@Type(() => WorkingHoursDto)
	workingHours?: WorkingHoursDto;
}

export class UpdateSalonDto {
	@IsOptional()
	@IsString()
	name?: string;

	@IsOptional()
	@IsString()
	description?: string;

	@IsOptional()
	@IsString()
	address?: string;

	@IsOptional()
	@IsString()
	phone?: string;

	@IsOptional()
	@IsEmail()
	email?: string;

	@IsOptional()
	@IsUrl()
	website?: string;

	@IsOptional()
	@IsString()
	instagram?: string;

	@IsOptional()
	@IsString()
	logo?: string;

	@IsOptional()
	@ValidateNested()
	@Type(() => WorkingHoursDto)
	workingHours?: WorkingHoursDto;
}

export class SalonResponseDto {
	id: string;
	name: string;
	description?: string;
	address?: string;
	phone?: string;
	email?: string;
	website?: string;
	instagram?: string;
	logo?: string;
	workingHours?: WorkingHoursDto;
	ownerId: string;
	createdAt: string;
}

export class SalonWithDetailsResponseDto extends SalonResponseDto {
	services: ServiceResponseDto[];
	staff: StaffResponseDto[];
}

// Import these from their respective DTOs (will be created next)
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
