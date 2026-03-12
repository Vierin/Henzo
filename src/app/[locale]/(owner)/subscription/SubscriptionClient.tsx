'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { useOwnerLayout } from '@/contexts/OwnerLayoutContext';
import { apiClient } from '@/lib/api-client';
import { Check, Clock, CreditCard, FileText, X } from 'lucide-react';
import {
	type SubscriptionInterval,
	PRICE_MONTHLY_VND,
	PRICE_ANNUAL_VND,
	PRICE_12_MONTHS_VND,
	SAVE_ANNUAL_PERCENT,
	SAVE_ANNUAL_VND,
} from '@/config/subscriptionPlans';
import { formatVND } from '@/utils/currency';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

interface Subscription {
	id: string;
	salonId: string;
	type: 'TRIAL' | 'STARTER';
	status: 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'EXPIRED';
	startDate: string;
	endDate?: string;
	nextPaymentDate?: string;
	trialEndDate?: string;
	amount: number;
	stripeCustomerId?: string | null;
	cancelAtPeriodEnd?: boolean;
	cancelAt?: string | null;
}

interface Invoice {
	id: string;
	number: string | null;
	date: string;
	amount: number;
	currency: string;
	status: string;
	pdfUrl: string | null;
	hostedInvoiceUrl: string | null;
}

const FEATURE_KEYS = [
	'owner.subscription.basic.masters',
	'owner.subscription.basic.prioritySupport',
	'owner.subscription.basic.marketing',
	'owner.subscription.basic.analytics',
	'owner.subscription.basic.crm',
	'owner.subscription.basic.services',
] as const;

export default function SubscriptionClient() {
	const t = useTranslation();
	const searchParams = useSearchParams();
	const { salonId } = useOwnerLayout();
	const [currentSubscription, setCurrentSubscription] =
		useState<Subscription | null>(null);
	const [loading, setLoading] = useState(true);
	const [checkoutLoading, setCheckoutLoading] =
		useState<SubscriptionInterval | null>(null);
	const [portalLoading, setPortalLoading] = useState(false);
	const [cancelLoading, setCancelLoading] = useState(false);
	const [billingInterval, setBillingInterval] =
		useState<SubscriptionInterval>('monthly');
	const [showDebugResponse, setShowDebugResponse] = useState(false);
	const [invoices, setInvoices] = useState<Invoice[]>([]);
	const toastShownRef = useRef<{ success?: boolean; canceled?: boolean }>({});

	useEffect(() => {
		if (salonId) fetchSubscription();
	}, [salonId]);

	useEffect(() => {
		if (!currentSubscription?.stripeCustomerId) {
			setInvoices([]);
			return;
		}
		apiClient
			.get<{ invoices: Invoice[] }>('/subscriptions/invoices')
			.then((r) => setInvoices(r.invoices ?? []))
			.catch(() => setInvoices([]));
	}, [currentSubscription?.stripeCustomerId]);

	// After Stripe redirect: refetch, show toast once, poll until paid (webhook can be delayed)
	useEffect(() => {
		const success = searchParams.get('success');
		const canceled = searchParams.get('canceled');
		if (success === '1' && !toastShownRef.current.success) {
			toastShownRef.current.success = true;
			setShowDebugResponse(true);
			const sessionId = searchParams.get('session_id') ?? undefined;
			window.history.replaceState({}, '', window.location.pathname);
			(async () => {
				if (sessionId) {
					try {
						await apiClient.post<{ ok: boolean }>(
							'/subscriptions/confirm-checkout',
							{
								session_id: sessionId,
							}
						);
					} catch (e) {
						console.warn(
							'confirm-checkout failed (webhook may have already applied):',
							e
						);
					}
				}
				let sub = await fetchSubscription(true);
				setTimeout(() => {
					const msg = t('owner.subscription.switchSuccess');
					toast.success(
						typeof msg === 'string' && !msg.startsWith('owner.')
							? msg
							: 'Тарифный план успешно обновлен'
					);
				}, 400);
				for (let i = 0; i < 8; i++) {
					if (sub && (sub.amount ?? 0) > 0) break;
					await new Promise((r) => setTimeout(r, 2000));
					sub = await fetchSubscription(true, true);
				}
			})();
		} else if (canceled === '1' && !toastShownRef.current.canceled) {
			toastShownRef.current.canceled = true;
			window.history.replaceState({}, '', window.location.pathname);
			setTimeout(() => {
				const msg = t('owner.subscription.switchError');
				toast(
					typeof msg === 'string' && !msg.startsWith('owner.')
						? msg
						: 'Не удалось переключить тарифный план'
				);
			}, 400);
		}
	}, [searchParams, t]);

	const fetchSubscription = async (
		noCache = false,
		silent = false
	): Promise<Subscription | null> => {
		try {
			if (!silent) setLoading(true);
			const subscription = await apiClient.get<Subscription>(
				noCache
					? `/subscriptions/current?_=${Date.now()}`
					: '/subscriptions/current',
				noCache ? { cache: 'no-store' } : undefined
			);
			setCurrentSubscription(subscription);
			return subscription;
		} catch (error: any) {
			console.error('Error fetching subscription:', error);
			setCurrentSubscription(null);
			return null;
		} finally {
			if (!silent) setLoading(false);
		}
	};

	const handleSelectPlan = async (interval: SubscriptionInterval) => {
		try {
			setCheckoutLoading(interval);
			const { url } = await apiClient.post<{ url: string }>(
				'/subscriptions/create-checkout-session',
				{ interval }
			);
			if (url) window.location.href = url;
			else throw new Error('No checkout URL');
		} catch (error: any) {
			console.error('Checkout error:', error);
			const msg = error?.message || t('owner.subscription.checkoutError');
			toast.error(msg);
		} finally {
			setCheckoutLoading(null);
		}
	};

	const handleManageBilling = async () => {
		try {
			setPortalLoading(true);
			const { url } = await apiClient.post<{ url: string }>(
				'/subscriptions/create-portal-session'
			);
			if (url) window.location.href = url;
			else throw new Error('No portal URL');
		} catch (error: any) {
			console.error('Portal error:', error);
			toast.error(error?.message || t('owner.subscription.checkoutError'));
		} finally {
			setPortalLoading(false);
		}
	};

	const handleCancelSubscription = async () => {
		if (!window.confirm(t('owner.subscription.cancelConfirm'))) return;
		try {
			setCancelLoading(true);
			await apiClient.post('/subscriptions/cancel');
			toast.success(t('owner.subscription.cancelSuccess'));
			await fetchSubscription();
		} catch (error: any) {
			console.error('Cancel subscription error:', error);
			toast.error(error?.message || t('owner.subscription.cancelError'));
		} finally {
			setCancelLoading(false);
		}
	};

	const trialEndDate = currentSubscription?.trialEndDate
		? new Date(currentSubscription.trialEndDate)
		: null;
	const trialEndDateFormatted = trialEndDate
		? trialEndDate.toLocaleDateString('ru-RU', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
			})
		: null;

	const isPaid = (currentSubscription?.amount ?? 0) > 0;
	const paidEndDate = currentSubscription?.endDate
		? new Date(currentSubscription.endDate)
		: null;
	const paidEndDateFormatted = paidEndDate
		? paidEndDate.toLocaleDateString('ru-RU', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
			})
		: null;
	const nextPaymentDate = currentSubscription?.nextPaymentDate
		? new Date(currentSubscription.nextPaymentDate)
		: null;
	const nextPaymentDateFormatted = nextPaymentDate
		? nextPaymentDate.toLocaleDateString('ru-RU', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
			})
		: null;

	if (loading) {
		return (
			<div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
				<LoadingSpinner
					fullScreen={false}
					message={t('owner.subscription.loading')}
				/>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#F0F4F8] relative overflow-hidden">
			<main className="container mx-auto px-4 py-6 max-w-5xl relative z-0">
				<header className="text-center mb-6">
					<h1 className="text-3xl md:text-4xl font-bold !mb-2 text-gray-900 tracking-tight">
						{t('owner.subscription.title')}
					</h1>
					<p className="text-gray-500 text-lg font-medium">
						{t('owner.subscription.subtitle')}
					</p>
				</header>

				{/* Trial banner — only when still on trial (amount === 0) */}
				{currentSubscription?.trialEndDate && !isPaid && (
					<section className="mb-8">
						<div className="w-full max-w-4xl mx-auto bg-[#fef2f2] border border-[#fecaca] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							<div className="flex items-start sm:items-center gap-4">
								<div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#fecaca] flex items-center justify-center">
									<Clock className="w-7 h-7 text-[#ff5b5b]" />
								</div>
								<div>
									<h2 className="text-xl font-bold text-gray-800">
										{t('owner.subscription.trialHeadline')}
									</h2>
									<span className="text-gray-800 text-lg font-medium">
										{t('owner.subscription.trialExpires')}{' '}
										<b>{trialEndDateFormatted}</b>
									</span>
									<p className="text-gray-600 text-sm mt-0.5">
										{t('owner.subscription.trialDescription')}
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => handleSelectPlan('monthly')}
								disabled={!!checkoutLoading}
								className="flex-shrink-0 px-6 py-3 rounded-xl font-semibold text-white bg-[#ff5b5b] hover:bg-[#e54f4f] disabled:opacity-60 transition-colors"
							>
								{t('owner.subscription.goToFullTariff')}
							</button>
						</div>
					</section>
				)}

				{/* Paid subscription: full layout as on screenshot */}
				{isPaid && (
					<div className="max-w-4xl mx-auto space-y-4">
						{/* Top card: plan name, ACTIVE, renewal, Manage Billing */}
						<div className="bg-white border border-gray-200 rounded-2xl px-4 py-6 shadow-sm flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
							<div className="flex items-start gap-3">
								<Check className="w-6 h-6 text-[#ff5b5b] flex-shrink-0 mt-0.5" />
								<div>
									<h2 className="text-xl font-bold text-gray-900">
										{t('owner.subscription.planName')} –{' '}
										{(currentSubscription?.amount ?? 0) >= 50
											? t('owner.subscription.annual')
											: t('owner.subscription.monthly')}
									</h2>
									<div className="mt-2 space-y-0.5 text-sm text-gray-500">
										{currentSubscription?.status === 'CANCELLED' && paidEndDateFormatted && (
											<p className="text-amber-700 font-medium">
												{t('owner.subscription.subscriptionEndDate')}:{' '}
												<b className="text-gray-900 text-lg">
													{paidEndDateFormatted}
												</b>
											</p>
										)}
										{nextPaymentDateFormatted && currentSubscription?.status !== 'CANCELLED' && (
											<p>
												{t('owner.subscription.nextRenewalDate')}:{' '}
												<b className="text-gray-900 text-lg">
													{nextPaymentDateFormatted}
												</b>
											</p>
										)}
										<p>
											{(currentSubscription?.amount ?? 0) >= 50
												? t('owner.subscription.billedAnnuallyAt')
												: t('owner.subscription.billedMonthlyAt')}{' '}
											<b className="text-gray-900 text-lg">
												{formatVND(
													(currentSubscription?.amount ?? 0) >= 50
														? PRICE_ANNUAL_VND
														: PRICE_MONTHLY_VND
												)}
												/
												{(currentSubscription?.amount ?? 0) >= 50
													? t('owner.subscription.perYear')
													: t('owner.subscription.perMonth')}
											</b>
										</p>
									</div>
								</div>
							</div>
							<div className="flex items-center gap-3 flex-shrink-0">
								<span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
									currentSubscription?.status === 'CANCELLED'
										? 'bg-amber-100 text-amber-700'
										: 'bg-[#ff5b5b]/15 text-[#ff5b5b]'
								}`}>
									{currentSubscription?.status === 'CANCELLED'
										? t('owner.subscription.cancelledBadge')
										: t('owner.subscription.activeBadge')}
								</span>
							</div>
						</div>

						{/* Two columns: Payment Methods | Billing History */}
						<div className="grid grid-cols-1 md:flex gap-4 justify-between items-start">
							{/* Billing History */}
							<div className="bg-white md:w-3/4 border border-gray-200 rounded-2xl p-4 shadow-sm sm:min-h-[300px] flex flex-col">
								<h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
									<FileText className="w-5 h-5 text-[#ff5b5b]" />
									{t('owner.subscription.billingHistory')}
								</h3>
								<div className="overflow-x-auto">
									<table className="w-full text-sm">
										<thead>
											<tr className="text-left text-gray-500 border-b border-gray-200">
												<th className="pb-2 font-medium">
													{t('owner.subscription.invoice')}
												</th>
												<th className="pb-2 font-medium">
													{t('owner.subscription.date')}
												</th>
												<th className="pb-2 font-medium">
													{t('owner.subscription.amount')}
												</th>
												<th className="pb-2 font-medium">
													{t('owner.subscription.status')}
												</th>
											</tr>
										</thead>
										<tbody>
											{invoices.length === 0 ? (
												<tr>
													<td
														colSpan={4}
														className="py-6 text-center text-gray-500"
													>
														{t('owner.subscription.paymentHistoryEmpty')}
													</td>
												</tr>
											) : (
												invoices.map((inv) => {
													const invoiceUrl =
														inv.hostedInvoiceUrl ?? inv.pdfUrl ?? null;
													return (
														<tr
															key={inv.id}
															className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors"
														>
															<td className="py-2 font-medium text-gray-900">
																{invoiceUrl ? (
																	<a
																		href={invoiceUrl}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="text-[#ff5b5b] hover:underline focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-1 rounded"
																	>
																		{inv.number ?? inv.id.slice(-12)}
																	</a>
																) : (
																	(inv.number ?? inv.id.slice(-12))
																)}
															</td>
															<td className="py-2 text-gray-600">
																{new Date(inv.date).toLocaleDateString()}
															</td>
															<td className="py-2 text-gray-900">
																{inv.currency === 'VND'
																	? formatVND(inv.amount)
																	: `${inv.amount.toFixed(2)} ${inv.currency}`}
															</td>
															<td className="py-2">
																<span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
																	{inv.status === 'paid'
																		? t('owner.subscription.paid')
																		: inv.status}
																</span>
															</td>
														</tr>
													);
												})
											)}
										</tbody>
									</table>
								</div>
								<button
									type="button"
									onClick={handleManageBilling}
									disabled={portalLoading}
									className="flex mt-auto text-xs mx-auto font-semibold text-gray-500 hover:text-[#ff5b5b] uppercase tracking-wide disabled:opacity-60"
								>
									{t('owner.subscription.viewAllTransactions')}
								</button>
							</div>

							<div className="bg-white md:w-1/4 border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col">
								<p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
									{t('owner.subscription.accountSettings')}
								</p>
								<div className="flex flex-col gap-3 mt-4">
									<button
										type="button"
										onClick={handleManageBilling}
										disabled={portalLoading}
										className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-[#ff5b5b] hover:bg-[#e54f4f] disabled:opacity-60 transition-colors"
									>
										{t('owner.subscription.manageBilling')}
									</button>
									{currentSubscription?.status !== 'CANCELLED' && (
										<button
											type="button"
											onClick={handleCancelSubscription}
											disabled={cancelLoading}
											className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors disabled:opacity-60"
										>
											<X className="w-4 h-4" />
											{cancelLoading
												? t('owner.subscription.cancelling')
												: t('owner.subscription.cancelSubscription')}
										</button>
									)}
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Billing toggle + card — only when not paid */}
				{!isPaid && (
					<div className="max-w-lg mx-auto">
						{/* Segment toggle: Monthly | Annual */}
						<div className="flex justify-center mb-0">
							<div className="inline-flex p-2 rounded-xl bg-gray-100 border border-gray-200">
								<button
									type="button"
									onClick={() => setBillingInterval('monthly')}
									className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
										billingInterval === 'monthly'
											? 'bg-[#fff] text-[#ff5b5b] shadow-sm'
											: 'text-gray-800'
									}`}
								>
									{t('owner.subscription.monthly')}
								</button>
								<button
									type="button"
									onClick={() => setBillingInterval('annual')}
									className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors flex items-center gap-2 ${
										billingInterval === 'annual'
											? 'bg-[#fff] text-[#ff5b5b] shadow-sm'
											: 'text-gray-800'
									}`}
								>
									{t('owner.subscription.annual')}
									<span className="px-2 py-0.5 rounded-md text-xs font-bold bg-[#ff5b5b]/90 text-white">
										{t('owner.subscription.savePercent').replace(
											'{{percent}}',
											String(SAVE_ANNUAL_PERCENT)
										)}
									</span>
								</button>
							</div>
						</div>

						{/* Most Popular pill — overlaps top of card */}
						<div className="flex justify-center mt-6 -mb-4 relative z-10">
							<span className="px-4 py-1.5 rounded-full bg-[#ff5b5b] text-white text-xs font-bold uppercase">
								{t('owner.subscription.mostPopular')}
							</span>
						</div>

						{/* Starter plan card */}
						<div className="relative bg-white border border-[#ea4b4b]/80 shadow-md rounded-2xl px-8 pt-8 pb-8">
							<h3 className="text-3xl font-bold text-gray-900 text-center mb-1">
								{t('owner.subscription.planName')}
							</h3>
							<p className="text-gray-500 text-sm text-center mb-3">
								{t('owner.subscription.planTagline')}
							</p>
							<div className="text-4xl font-bold text-gray-900 text-center mb-3">
								{billingInterval === 'annual' && (
									<span className="block line-through text-gray-600 text-3xl">
										{formatVND(PRICE_12_MONTHS_VND)}
									</span>
								)}
								<span className="block">
									{formatVND(
										billingInterval === 'annual'
											? PRICE_ANNUAL_VND
											: PRICE_MONTHLY_VND
									)}
									<span className="text-lg font-normal text-gray-500">
										/{' '}
										{t(
											billingInterval === 'annual'
												? 'owner.subscription.perYear'
												: 'owner.subscription.perMonth'
										)}
									</span>
								</span>
							</div>

							<ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 mb-6">
								{FEATURE_KEYS.map((key) => (
									<li key={key} className="flex items-start gap-2">
										<Check className="w-5 h-5 flex-shrink-0 text-[#ff5b5b] mt-0.5" />
										<span className="text-gray-700 text-sm">{t(key)}</span>
									</li>
								))}
							</ul>
							<button
								type="button"
								onClick={() => handleSelectPlan(billingInterval)}
								disabled={!!checkoutLoading}
								className="w-full py-3.5 rounded-xl font-semibold text-white bg-[#ff5b5b] hover:bg-[#e54f4f] disabled:opacity-60 transition-colors"
							>
								{t('owner.subscription.startProPlan')}
							</button>
							<p className="text-gray-400 text-xs text-center mt-4">
								{t('owner.subscription.noLongTermContracts')}
							</p>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
