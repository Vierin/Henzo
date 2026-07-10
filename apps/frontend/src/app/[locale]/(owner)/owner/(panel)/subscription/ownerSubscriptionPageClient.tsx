'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  createStripeCheckoutSession,
  fetchCurrentSubscription,
  fetchProPrices,
  syncStripeCheckoutSession,
} from '@/lib/owner/api';
import type { Subscription } from '@/lib/owner/types';

export default function OwnerSubscriptionPageClient() {
  const searchParams = useSearchParams();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [prices, setPrices] = useState<{
    monthlyVnd?: number;
    annualVnd?: number;
  }>({});
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        fetchCurrentSubscription(),
        fetchProPrices(),
      ]);
      setSub(s);
      setPrices(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) return;
    void syncStripeCheckoutSession(sessionId)
      .then(() => load())
      .catch((e) => setError(e instanceof Error ? e.message : 'Sync failed'));
  }, [searchParams, load]);

  const checkout = async (interval: 'monthly' | 'annual') => {
    setCheckoutLoading(true);
    setError(null);
    try {
      const url = await createStripeCheckoutSession(interval);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
      setCheckoutLoading(false);
    }
  };

  if (loading) return <p className="text-sm text-zinc-500">Loading…</p>;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-[#3F3F3F]">Subscription</h1>
      <p className="mt-1 text-sm text-zinc-500">Manage your Henzo plan</p>

      {sub ? (
        <div className="mt-6 rounded-2xl border border-zinc-100 bg-white p-5">
          <p className="text-sm text-zinc-500">Current plan</p>
          <p className="text-lg font-semibold capitalize">
            {sub.type} · {sub.status}
          </p>
          {sub.currentPeriodEnd ? (
            <p className="mt-1 text-sm text-zinc-500">
              Renews {new Date(sub.currentPeriodEnd).toLocaleDateString()}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-6 text-sm text-zinc-500">No active subscription.</p>
      )}

      <div className="mt-8 space-y-3">
        <button
          type="button"
          disabled={checkoutLoading}
          onClick={() => void checkout('monthly')}
          className="flex w-full items-center justify-between rounded-2xl border border-zinc-100 bg-[#FDF6F0] p-4 text-left hover:border-[#3F3287]/30"
        >
          <span className="font-medium">Monthly</span>
          <span className="text-sm text-zinc-600">
            {prices.monthlyVnd
              ? `${prices.monthlyVnd.toLocaleString()} VND/mo`
              : '—'}
          </span>
        </button>
        <button
          type="button"
          disabled={checkoutLoading}
          onClick={() => void checkout('annual')}
          className="flex w-full items-center justify-between rounded-2xl border border-zinc-100 bg-[#EDE9F6] p-4 text-left hover:border-[#3F3287]/30"
        >
          <span className="font-medium">Annual</span>
          <span className="text-sm text-zinc-600">
            {prices.annualVnd
              ? `${prices.annualVnd.toLocaleString()} VND/yr`
              : '—'}
          </span>
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
