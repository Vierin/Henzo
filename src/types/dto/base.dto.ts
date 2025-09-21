import { IsOptional, IsString, IsDateString } from 'class-validator';

export class BaseDto {
	@IsOptional()
	@IsString()
	id?: string;

	@IsOptional()
	@IsDateString()
	createdAt?: string;
}

export class PaginationDto {
	@IsOptional()
	@IsString()
	page?: string = '1';

	@IsOptional()
	@IsString()
	limit?: string = '10';
}

export class SearchDto {
	@IsOptional()
	@IsString()
	search?: string;

	@IsOptional()
	@IsString()
	sortBy?: string;

	@IsOptional()
	@IsString()
	sortOrder?: 'asc' | 'desc' = 'asc';
}
