import {
  IsString,
  IsOptional,
  IsDateString,
  IsEmail,
  IsIn,
} from 'class-validator';

export class CreateBookingDto {
  @IsString()
  serviceId: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsDateString()
  time: string;

  @IsString()
  salonId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // Fields for owner creating booking on behalf of client
  @IsOptional()
  @IsEmail()
  clientEmail?: string;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsString()
  clientPhone?: string;

  /** Preferred locale for client booking emails; overrides Accept-Language when set */
  @IsOptional()
  @IsIn(['en', 'ru', 'vi'])
  locale?: 'en' | 'ru' | 'vi';
}
