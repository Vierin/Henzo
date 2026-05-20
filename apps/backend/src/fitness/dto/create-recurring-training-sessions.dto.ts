import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecurringSlotDto {
  @IsInt()
  @Min(1)
  @Max(7)
  day: number;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime: string;
}

export class CreateRecurringTrainingSessionsDto {
  @IsString()
  studioId: string;

  @IsString()
  trainingId: string;

  @IsOptional()
  @IsString()
  trainerId?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsInt()
  @Min(1)
  @Max(500)
  capacity: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(26)
  weeksCount?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => RecurringSlotDto)
  slots?: RecurringSlotDto[];

  @IsOptional()
  @IsString()
  startsFromDate?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
