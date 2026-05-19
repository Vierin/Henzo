import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateTrainingScheduleSlotDto {
  @IsInt()
  @Min(1)
  @Max(7)
  day: number;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime: string;
}

export class UpdateTrainingScheduleDto {
  @IsOptional()
  @IsISO8601()
  effectiveFrom?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => UpdateTrainingScheduleSlotDto)
  slots?: UpdateTrainingScheduleSlotDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  capacity?: number;

  @IsOptional()
  @IsString()
  locationId?: string;
}
