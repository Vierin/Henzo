import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { STUDIO_DESCRIPTION_MAX } from '../../lib/text-content';
import { NoEmbeddedLinks } from '../../common/validators/no-embedded-links.validator';

/** Admin creates an unclaimed studio (tech owner + intended real owner email). */
export class CreateAdminStudioDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsEmail()
  intendedOwnerEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(STUDIO_DESCRIPTION_MAX)
  @NoEmbeddedLinks()
  description?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  sendClaimEmail?: boolean;
}
