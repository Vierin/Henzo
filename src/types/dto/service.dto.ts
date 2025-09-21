import {
	IsString,
	IsOptional,
	IsNumber,
	IsPositive,
	IsArray,
} from 'class-validator';

export class CreateServiceDto {
	@IsString()
	name: string;

	@IsOptional()
	@IsString()
	description?: string;

	@IsNumber()
	@IsPositive()
	duration: number;

	@IsNumber()
	@IsPositive()
	price: number;
}

export class UpdateServiceDto {
	@IsOptional()
	@IsString()
	name?: string;

	@IsOptional()
	@IsString()
	description?: string;

	@IsOptional()
	@IsNumber()
	@IsPositive()
	duration?: number;

	@IsOptional()
	@IsNumber()
	@IsPositive()
	price?: number;
}

export class ServiceResponseDto {
	id: string;
	name: string;
	description?: string;
	duration: number;
	price: number;
	salonId: string;
}

export class ServiceWithStaffDto extends ServiceResponseDto {
	staff: StaffResponseDto[];
}

// Import from staff DTO (will be created next)
interface StaffResponseDto {
	id: string;
	name: string;
	accessLevel: string;
}
