import {
	IsString,
	IsOptional,
	IsEmail,
	IsEnum,
	IsArray,
} from 'class-validator';

export enum StaffAccessLevel {
	ADMIN = 'ADMIN',
	EMPLOYEE = 'EMPLOYEE',
}

export class CreateStaffDto {
	@IsString()
	name: string;

	@IsOptional()
	@IsEmail()
	email?: string;

	@IsOptional()
	@IsString()
	phone?: string;

	@IsOptional()
	@IsEnum(StaffAccessLevel)
	accessLevel?: StaffAccessLevel = StaffAccessLevel.EMPLOYEE;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	serviceIds?: string[];
}

export class UpdateStaffDto {
	@IsOptional()
	@IsString()
	name?: string;

	@IsOptional()
	@IsEmail()
	email?: string;

	@IsOptional()
	@IsString()
	phone?: string;

	@IsOptional()
	@IsEnum(StaffAccessLevel)
	accessLevel?: StaffAccessLevel;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	serviceIds?: string[];
}

export class StaffResponseDto {
	id: string;
	name: string;
	email?: string;
	phone?: string;
	accessLevel: StaffAccessLevel;
	salonId: string;
}

export class StaffWithServicesDto extends StaffResponseDto {
	services: ServiceResponseDto[];
}

// Import from service DTO
interface ServiceResponseDto {
	id: string;
	name: string;
	description?: string;
	duration: number;
	price: number;
}
