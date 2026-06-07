import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsInt,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  language?: string;

  // Optional localized description fields
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  descriptionVi?: string;

  @IsOptional()
  @IsString()
  descriptionRu?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  duration?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @IsOptional()
  @IsInt()
  trainingCategoryId?: number | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trainerIds?: string[];
}
