import {
  IsOptional,
  IsString,
  IsEmail,
  IsArray,
  IsNumber,
  IsBoolean,
  IsIn,
  Min,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { InputJsonValue } from '@prisma/client/runtime/library';
import { NoEmbeddedLinks } from '../../common/validators/no-embedded-links.validator';
import { STUDIO_DESCRIPTION_MAX } from '../../lib/text-content';
import { STUDIO_CURRENCIES } from '../studio-currency';

export class UpdateStudioDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(STUDIO_DESCRIPTION_MAX, {
    message: `Description must be ${STUDIO_DESCRIPTION_MAX} characters or less`,
  })
  @NoEmbeddedLinks()
  description?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsIn([...STUDIO_CURRENCIES], {
    message: `currency must be one of: ${STUDIO_CURRENCIES.join(', ')}`,
  })
  currency?: (typeof STUDIO_CURRENCIES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @ValidateIf((_, value) => value !== '' && value != null)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  photoGallery?: InputJsonValue;

  @IsOptional()
  workingHours?: InputJsonValue;

  @IsOptional()
  reminderSettings?: InputJsonValue;

  @IsOptional()
  @IsBoolean()
  autoConfirmBookings?: boolean;
}
