import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateAdminTrainerDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsIn(['ADMIN', 'EMPLOYEE'])
  accessLevel: 'ADMIN' | 'EMPLOYEE';
}
