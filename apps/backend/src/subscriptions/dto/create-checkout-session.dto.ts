import { IsIn, IsString, MaxLength } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsString()
  @IsIn(['solo', 'studio', 'enterprise'])
  plan: 'solo' | 'studio' | 'enterprise';

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

/** Upgrade/downgrade an existing Stripe subscription (same customer). */
export class ChangePlanDto {
  @IsString()
  @IsIn(['solo', 'studio', 'enterprise'])
  plan: 'solo' | 'studio' | 'enterprise';

  @IsString()
  @IsIn(['monthly', 'annual'])
  interval: 'monthly' | 'annual';
}
