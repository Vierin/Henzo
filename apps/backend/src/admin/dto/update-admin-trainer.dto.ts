import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateAdminTrainerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(['ADMIN', 'EMPLOYEE'])
  accessLevel?: 'ADMIN' | 'EMPLOYEE';
}
