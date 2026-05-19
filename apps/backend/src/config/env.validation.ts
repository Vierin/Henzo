import { plainToClass } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsIn,
  validateSync,
} from 'class-validator';

export class EnvironmentVariables {
  // Database
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  DIRECT_URL: string;

  // Supabase
  @IsString()
  @IsNotEmpty()
  SUPABASE_URL: string;

  // SUPABASE_KEY / SUPABASE_ANON_KEY - optional
  // Can use either SUPABASE_KEY or SUPABASE_ANON_KEY
  @IsString()
  @IsOptional()
  SUPABASE_KEY?: string;

  @IsString()
  @IsOptional()
  SUPABASE_ANON_KEY?: string;

  @IsString()
  @IsNotEmpty()
  SUPABASE_SERVICE_ROLE_KEY: string;

  // JWT
  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  // Email (Brevo)
  @IsString()
  @IsNotEmpty()
  BREVO_API_KEY: string;

  @IsString()
  @IsOptional()
  EMAIL_FROM?: string;

  @IsString()
  @IsOptional()
  EMAIL_FROM_NAME?: string;

  @IsString()
  @IsOptional()
  TELEGRAM_BOT_TOKEN?: string;

  @IsString()
  @IsOptional()
  TELEGRAM_FEEDBACK_CHAT_ID?: string;

  // Application
  @IsNumberString()
  @IsOptional()
  PORT?: string;

  @IsString()
  @IsIn(['development', 'production', 'test'])
  @IsOptional()
  NODE_ENV?: string;

  // Frontend
  @IsString()
  @IsOptional()
  FRONTEND_URL?: string;

  // Mapbox (optional)
  @IsString()
  @IsOptional()
  MAPBOX_ACCESS_TOKEN?: string;

  // Stripe (optional — Pro prices for mobile; fallback VND if unset / API error)
  @IsString()
  @IsOptional()
  STRIPE_SECRET_KEY?: string;

  @IsString()
  @IsOptional()
  STRIPE_MONTHLY_PRICE_ID?: string;

  @IsString()
  @IsOptional()
  STRIPE_YEARLY_PRICE_ID?: string;

  @IsNumberString()
  @IsOptional()
  STRIPE_PRICES_CACHE_TTL_SEC?: string;

  @IsNumberString()
  @IsOptional()
  FALLBACK_PRO_PRICE_MONTHLY_VND?: string;

  @IsNumberString()
  @IsOptional()
  FALLBACK_PRO_PRICE_ANNUAL_VND?: string;

  @IsString()
  @IsOptional()
  MOBILE_DEEP_LINK_SCHEME?: string;

  @IsString()
  @IsOptional()
  STRIPE_CHECKOUT_SUCCESS_URL?: string;

  @IsString()
  @IsOptional()
  STRIPE_CHECKOUT_CANCEL_URL?: string;

  // GA4 Measurement Protocol (optional — server-side events)
  @IsString()
  @IsOptional()
  GA4_MEASUREMENT_ID?: string;

  @IsString()
  @IsOptional()
  GA4_API_SECRET?: string;

  // Sentry (optional — backend error tracking)
  @IsString()
  @IsOptional()
  SENTRY_DSN?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const missingVars = errors.map((error) => {
      const constraints = Object.values(error.constraints || {});
      return `  - ${error.property}: ${constraints.join(', ')}`;
    });

    throw new Error(
      `❌ Environment validation failed:\n${missingVars.join('\n')}\n\nPlease check your .env file.`,
    );
  }

  return validatedConfig;
}
