import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class PatchAdminFeedbackDto {
  @IsOptional()
  @IsIn(['open', 'in_progress', 'resolved'])
  status?: 'open' | 'in_progress' | 'resolved';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}
