import { IsEmail, IsString, IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export enum UserRole {
	OWNER = 'OWNER',
	ADMIN = 'ADMIN',
	CLIENT = 'CLIENT',
}

export class CreateUserDto {
	@IsString()
	userId: string;

	@IsEmail()
	email: string;

	@IsString()
	name: string;

	@IsOptional()
	@IsString()
	phone?: string;

	@IsOptional()
	@IsEnum(UserRole)
	role?: UserRole = UserRole.OWNER;
}

export class UpdateUserDto {
	@IsOptional()
	@IsString()
	name?: string;

	@IsOptional()
	@IsString()
	phone?: string;
}

export class UserResponseDto {
	id: string;
	email: string;
	name?: string;
	phone?: string;
	role: UserRole;
	createdAt: string;
}
