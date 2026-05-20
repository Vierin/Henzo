import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateTrainingSessionDefaultsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  capacity?: number;

  @IsOptional()
  @IsString()
  locationId?: string;
}
