import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';

@Injectable()
export class PromotionCouponService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  private isMissingCouponsTableError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2021'
    );
  }

  private throwCouponsTableMissing(): never {
    throw new HttpException(
      'Promotion coupons table is missing in the database. Run backend Prisma migrations first.',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  async getActiveAutoAnnualStripeCouponId(): Promise<string | null> {
    try {
      const row = await this.prisma.platformStripeCoupon.findFirst({
        where: { isActive: true, useForAutoAnnual: true },
        select: { stripeCouponId: true },
      });
      return row?.stripeCouponId ?? null;
    } catch (error) {
      if (this.isMissingCouponsTableError(error)) {
        return null;
      }
      throw error;
    }
  }

  /** Percent off for GET /subscriptions/current UI when auto-annual coupon is set. */
  async getAnnualPromotionPercentForOwnerUi(): Promise<number | null> {
    try {
      const row = await this.prisma.platformStripeCoupon.findFirst({
        where: { isActive: true, useForAutoAnnual: true },
        select: { percentOff: true },
      });
      if (row?.percentOff != null && row.percentOff > 0) {
        return row.percentOff;
      }
      return null;
    } catch (error) {
      if (this.isMissingCouponsTableError(error)) {
        return null;
      }
      throw error;
    }
  }

  async listForAdmin(): Promise<
    Array<{
      id: string;
      label: string;
      stripeCouponId: string;
      isActive: boolean;
      useForAutoAnnual: boolean;
      percentOff: number | null;
      timesRedeemed: number | null;
      valid: boolean;
      stripeError?: string;
    }>
  > {
    let rows;
    try {
      rows = await this.prisma.platformStripeCoupon.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      if (this.isMissingCouponsTableError(error)) {
        return [];
      }
      throw error;
    }
    const out: Array<{
      id: string;
      label: string;
      stripeCouponId: string;
      isActive: boolean;
      useForAutoAnnual: boolean;
      percentOff: number | null;
      timesRedeemed: number | null;
      valid: boolean;
      stripeError?: string;
    }> = [];
    for (const r of rows) {
      try {
        const c = await this.stripeService.retrieveCoupon(r.stripeCouponId);
        out.push({
          id: r.id,
          label: r.label,
          stripeCouponId: r.stripeCouponId,
          isActive: r.isActive,
          useForAutoAnnual: r.useForAutoAnnual,
          percentOff: c.percent_off ?? r.percentOff ?? null,
          timesRedeemed:
            typeof c.times_redeemed === 'number' ? c.times_redeemed : null,
          valid: true,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        out.push({
          id: r.id,
          label: r.label,
          stripeCouponId: r.stripeCouponId,
          isActive: r.isActive,
          useForAutoAnnual: r.useForAutoAnnual,
          percentOff: r.percentOff,
          timesRedeemed: null,
          valid: false,
          stripeError: msg,
        });
      }
    }
    return out;
  }

  async create(params: {
    label: string;
    stripeCouponId: string;
    useForAutoAnnual?: boolean;
  }) {
    const trimmedId = params.stripeCouponId.trim();
    if (!trimmedId) {
      throw new HttpException(
        'stripeCouponId is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    let coupon;
    try {
      coupon = await this.stripeService.retrieveCoupon(trimmedId);
    } catch {
      throw new HttpException(
        'Coupon not found in Stripe. Create it in Stripe Dashboard first or check the ID.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const percentOff =
      typeof coupon.percent_off === 'number' ? coupon.percent_off : null;

    const useAuto = !!params.useForAutoAnnual;
    try {
      if (useAuto) {
        await this.prisma.platformStripeCoupon.updateMany({
          where: { useForAutoAnnual: true },
          data: { useForAutoAnnual: false },
        });
      }

      return this.prisma.platformStripeCoupon.create({
        data: {
          label: params.label.trim() || trimmedId,
          stripeCouponId: trimmedId,
          percentOff,
          useForAutoAnnual: useAuto,
          isActive: true,
        },
      });
    } catch (error) {
      if (this.isMissingCouponsTableError(error)) {
        this.throwCouponsTableMissing();
      }
      throw error;
    }
  }

  async update(
    id: string,
    patch: {
      label?: string;
      isActive?: boolean;
      useForAutoAnnual?: boolean;
    },
  ) {
    let existing;
    try {
      existing = await this.prisma.platformStripeCoupon.findUnique({
        where: { id },
      });
    } catch (error) {
      if (this.isMissingCouponsTableError(error)) {
        this.throwCouponsTableMissing();
      }
      throw error;
    }
    if (!existing) {
      throw new HttpException('Coupon not found', HttpStatus.NOT_FOUND);
    }

    try {
      if (patch.useForAutoAnnual === true) {
        await this.prisma.platformStripeCoupon.updateMany({
          where: { useForAutoAnnual: true, id: { not: id } },
          data: { useForAutoAnnual: false },
        });
      }

      return this.prisma.platformStripeCoupon.update({
        where: { id },
        data: {
          ...(patch.label !== undefined ? { label: patch.label.trim() } : {}),
          ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
          ...(patch.useForAutoAnnual !== undefined
            ? { useForAutoAnnual: patch.useForAutoAnnual }
            : {}),
        },
      });
    } catch (error) {
      if (this.isMissingCouponsTableError(error)) {
        this.throwCouponsTableMissing();
      }
      throw error;
    }
  }

  async delete(id: string) {
    try {
      await this.prisma.platformStripeCoupon.delete({
        where: { id },
      });
    } catch (error) {
      if (this.isMissingCouponsTableError(error)) {
        this.throwCouponsTableMissing();
      }
      throw error;
    }
    return { ok: true };
  }

  /** Re-sync percent from Stripe (e.g. coupon edited in Stripe). */
  async refreshFromStripe(id: string) {
    let row;
    try {
      row = await this.prisma.platformStripeCoupon.findUnique({
        where: { id },
      });
    } catch (error) {
      if (this.isMissingCouponsTableError(error)) {
        this.throwCouponsTableMissing();
      }
      throw error;
    }
    if (!row) {
      throw new HttpException('Coupon not found', HttpStatus.NOT_FOUND);
    }
    const coupon = await this.stripeService.retrieveCoupon(row.stripeCouponId);
    const percentOff =
      typeof coupon.percent_off === 'number' ? coupon.percent_off : null;
    try {
      return this.prisma.platformStripeCoupon.update({
        where: { id },
        data: { percentOff },
      });
    } catch (error) {
      if (this.isMissingCouponsTableError(error)) {
        this.throwCouponsTableMissing();
      }
      throw error;
    }
  }
}
