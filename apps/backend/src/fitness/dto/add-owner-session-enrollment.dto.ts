import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AddOwnerSessionEnrollmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsBoolean()
  sendConfirmationEmail?: boolean;

  /** Reserve capacity with no name/email/phone (synthetic guest user). */
  @IsOptional()
  @IsBoolean()
  anonymousSpot?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['en', 'ru', 'vi'])
  locale?: 'en' | 'ru' | 'vi';
}
