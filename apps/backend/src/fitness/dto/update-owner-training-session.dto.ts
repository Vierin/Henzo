import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** PATCH body — все поля опциональны; непереданное поле не меняется. */
export class UpdateOwnerTrainingSessionDto {
  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  /** Явный `null` в JSON снимает тренера со слота. */
  @IsOptional()
  trainerId?: string | null;

  /** Venue id (`default` = main studio) or explicit `null` for main. */
  @IsOptional()
  locationId?: string | null;

  @IsOptional()
  @IsIn(['ACTIVE', 'CANCELLED', 'COMPLETED'])
  status?: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';

  /**
   * When true with startsAt, trainerId, and/or locationId: apply the same
   * time shift (relative to this session), trainer, and/or location to every
   * ACTIVE session for the same training with startsAt >= this session's
   * original start.
   */
  @IsOptional()
  @IsBoolean()
  applyToFollowing?: boolean;

  /**
   * Optional free-text note shown to enrolled clients when the session is
   * cancelled (status = CANCELLED). Ignored for non-cancel updates.
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
