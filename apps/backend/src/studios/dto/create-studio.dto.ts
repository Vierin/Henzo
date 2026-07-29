import {
  IsOptional,
  IsString,
  IsEmail,
  IsUrl,
  IsArray,
  IsInt,
  IsNumber,
  Min,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { InputJsonValue } from '@prisma/client/runtime/library';
import { NoEmbeddedLinks } from '../../common/validators/no-embedded-links.validator';
import { STUDIO_DESCRIPTION_MAX } from '../../lib/text-content';

export class CreateStudioDto {
  @IsString()
  name: string;

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
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
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
  logoUrl?: string;

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

  // categoryIds removed: categories are derived from services
}
