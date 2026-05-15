import { IsString, MinLength } from 'class-validator';

export class ConfirmClientInvitationDto {
  @IsString()
  @MinLength(8)
  token!: string;
}
