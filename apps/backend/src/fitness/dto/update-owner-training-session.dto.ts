import { IsIn, IsISO8601, IsOptional } from 'class-validator';

/** PATCH body — все поля опциональны; непереданное поле не меняется. */
export class UpdateOwnerTrainingSessionDto {
  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  /** Явный `null` в JSON снимает тренера со слота. */
  @IsOptional()
  trainerId?: string | null;

  @IsOptional()
  @IsIn(['ACTIVE', 'CANCELLED', 'COMPLETED'])
  status?: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
}
