import {
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request } from 'express';
import type Stripe from 'stripe';

import { Public } from '../auth/public.decorator';
import { StripeCheckoutService } from './stripe-checkout.service';
import { SubscriptionsService } from './subscriptions.service';
import { AdminEventLogService } from '../admin/admin-event-log.service';

@Public()
@Controller('webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly checkout: StripeCheckoutService,
    private readonly subscriptions: SubscriptionsService,
    private readonly adminEventLog: AdminEventLogService,
  ) {}

  @Post('stripe')
  @HttpCode(200)
  async handleStripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    if (!signature?.trim()) {
      throw new UnauthorizedException('Missing stripe-signature');
    }
    const rawBody = req.rawBody;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      this.logger.error('Stripe webhook missing rawBody buffer');
      throw new UnauthorizedException('Invalid webhook body');
    }

    let event: Stripe.Event;
    try {
      event = this.checkout.constructWebhookEvent(rawBody, signature);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Stripe webhook signature failed: ${msg}`);
      throw new UnauthorizedException('Invalid Stripe webhook signature');
    }

    this.logger.log(`Stripe webhook ${event.type} id=${event.id}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await this.subscriptions.handleCheckoutSessionCompleted(session);
          break;
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          await this.subscriptions.applyStripeSubscriptionByCustomerOrSubId(
            sub,
          );
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice & {
            subscription?: string | { id: string } | null;
          };
          const subRef = invoice.subscription;
          const subId =
            typeof subRef === 'string'
              ? subRef
              : subRef && typeof subRef === 'object'
                ? subRef.id
                : null;
          if (subId) {
            const stripe = this.checkout.getStripe();
            const sub = await stripe.subscriptions.retrieve(subId);
            await this.subscriptions.applyStripeSubscriptionByCustomerOrSubId(
              sub,
            );
          }
          break;
        }
        default:
          break;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Stripe webhook handler error ${event.type}: ${msg}`);
      await this.adminEventLog.log({
        type: 'stripe_webhook_error',
        severity: 'error',
        message: msg,
        metadata: { eventType: event.type, eventId: event.id },
      });
      // Still 200 so Stripe does not infinite-retry on business errors;
      // signature-valid events are acknowledged.
    }

    return { received: true };
  }
}
