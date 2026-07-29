import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RequestStudioClaimDto {
  @IsEmail()
  ownerEmail!: string;

  @IsOptional()
  sendEmail?: boolean;
}

export class LookupStudioClaimDto {
  @IsEmail()
  email!: string;
}

export class CompleteStudioClaimDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  confirmBooking?: boolean;
}

export class AcceptStudioClaimDto {
  @IsOptional()
  confirmBooking?: boolean;
}
