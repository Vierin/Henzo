import { IsIn, IsString, MaxLength } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsString()
  @IsIn(['studio', 'enterprise'])
  plan: 'studio' | 'enterprise';

  @IsString()
  @IsIn(['monthly', 'annual'])
  interval: 'monthly' | 'annual';

  /** Absolute success URL; should include `{CHECKOUT_SESSION_ID}` placeholder. */
  @IsString()
  @MaxLength(2048)
  successUrl: string;

  @IsString()
  @MaxLength(2048)
  cancelUrl: string;
}

export class CreateBillingPortalDto {
  @IsString()
  @MaxLength(2048)
  returnUrl: string;
}
