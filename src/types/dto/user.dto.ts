// Simple TypeScript interfaces for user data transfer

export enum UserRole {
	OWNER = 'OWNER',
	ADMIN = 'ADMIN',
	CLIENT = 'CLIENT',
}

export interface CreateUserDto {
	userId: string;
	email: string;
	name: string;
	phone?: string;
	role?: UserRole;
}

export interface UpdateUserDto {
	name?: string;
	phone?: string;
}

export interface UserResponseDto {
	id: string;
	email: string;
	name?: string;
	phone?: string;
	role: UserRole;
	createdAt: string;
}
