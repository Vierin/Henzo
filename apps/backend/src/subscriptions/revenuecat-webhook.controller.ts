import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';

import { RevenueCatService } from './revenuecat.service';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('webhooks')
export class RevenueCatWebhookController {
  constructor(private readonly revenueCat: RevenueCatService) {}

  @Post('revenuecat')
  @HttpCode(200)
  async handleRevenueCat(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!this.revenueCat.isWebhookAuthorized(authorization)) {
      throw new UnauthorizedException(
        'Invalid RevenueCat webhook authorization',
      );
    }
    return this.revenueCat.handleWebhookEvent(body);
  }
}
