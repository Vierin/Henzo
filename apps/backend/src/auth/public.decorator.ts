import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Skip global JWT guard (registration, webhooks, public catalog). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
