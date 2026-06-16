import { IsBoolean, IsIn, IsOptional, ValidateIf } from 'class-validator';

export class PatchAdminSubscriptionDto {
  @IsOptional()
  @IsIn(['SOLO', 'STUDIO', 'ENTERPRISE'])
  type?: 'SOLO' | 'STUDIO' | 'ENTERPRISE';

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'CANCELLED', 'EXPIRED'])
  status?: 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'EXPIRED';

  /** ISO date string, or null to clear */
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  currentPeriodEnd?: string | null;

  @IsOptional()
  @IsBoolean()
  manualOverride?: boolean;
}
