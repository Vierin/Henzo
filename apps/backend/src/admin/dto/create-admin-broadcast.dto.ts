import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export const BROADCAST_CHANNELS = ['push', 'email', 'both'] as const;
export const BROADCAST_AUDIENCES = [
  'all_owners',
  'activity_tier',
  'onboarding_incomplete',
  'studio_ids',
] as const;
export const BROADCAST_ACTIVITY_TIERS = [
  'active',
  'warming',
  'sleeping',
  'never_used',
  'draft',
] as const;

export type BroadcastChannel = (typeof BROADCAST_CHANNELS)[number];
export type BroadcastAudience = (typeof BROADCAST_AUDIENCES)[number];

export class CreateAdminBroadcastDto {
  @IsIn(BROADCAST_CHANNELS)
  channels: BroadcastChannel;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  body: string;

  @IsIn(BROADCAST_AUDIENCES)
  audience: BroadcastAudience;

  @ValidateIf((o: CreateAdminBroadcastDto) => o.audience === 'activity_tier')
  @IsIn(BROADCAST_ACTIVITY_TIERS)
  activityTier?: (typeof BROADCAST_ACTIVITY_TIERS)[number];

  @ValidateIf((o: CreateAdminBroadcastDto) => o.audience === 'studio_ids')
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  studioIds?: string[];

  /** Preview mode: resolve audience and return counts without sending. */
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
