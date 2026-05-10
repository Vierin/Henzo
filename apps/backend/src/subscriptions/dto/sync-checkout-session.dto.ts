import { IsNotEmpty, IsString } from 'class-validator';

export class SyncCheckoutSessionDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;
}
