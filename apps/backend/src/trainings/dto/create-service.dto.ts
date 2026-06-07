import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsInt,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  name: string;

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

  @IsNumber()
  @IsPositive()
  duration: number;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsString()
  studioId: string;

  @IsOptional()
  @IsInt()
  trainingCategoryId?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trainerIds?: string[];
}
