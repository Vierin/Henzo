'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useOwnerLayout } from '@/contexts/OwnerLayoutContext';
import { apiClient } from '@/lib/api-client';
import { Check, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import { SUBSCRIPTION_PLANS } from '@/config/subscriptionPlans';

interface Subscription {
	id: string;
	salonId: string;
	type: 'BASIC';
	status: 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'EXPIRED';
	startDate: string;
	endDate?: string;
	nextPaymentDate?: string;
	trialEndDate?: string;
	amount: number;
}

interface Plan {
	id: 'BASIC';
	name: string;
	description?: string;
	price: number;
	features: string[];
	isRecommended?: boolean;
}

export default function SubscriptionClient() {
	const t = useTranslation();
	const { salonId } = useOwnerLayout();
	const [currentSubscription, setCurrentSubscription] =
		useState<Subscription | null>(null);
	const [loading, setLoading] = useState(true);
	const [switching, setSwitching] = useState<string | null>(null);

	useEffect(() => {
		if (salonId) {
			fetchSubscription();
		}
	}, [salonId]);

	const fetchSubscription = async () => {
		try {
			setLoading(true);
			const subscription = await apiClient.get<Subscription>(
				`/subscriptions/current`
			);
			setCurrentSubscription(subscription);
		} catch (error: any) {
			console.error('Error fetching subscription:', error);
			// If no subscription found or endpoint doesn't exist, default to FREEMIUM
			// This is expected for now as subscription API may not be implemented yet
			setCurrentSubscription(null);
		} finally {
			setLoading(false);
		}
	};

	const handleSwitchPlan = async (planId: 'BASIC') => {
		try {
			setSwitching(planId);
			await apiClient.post('/subscriptions/switch', { planType: planId });
			toast.success(t('owner.subscription.switchSuccess'));
			await fetchSubscription();
		} catch (error: any) {
			// If API endpoint doesn't exist yet, show a message
			if (error?.status === 404 || error?.code === 404) {
				toast.error(
					t('owner.subscription.switchError') +
						' (API endpoint not implemented yet)'
				);
			} else {
				toast.error(error?.message || t('owner.subscription.switchError'));
			}
		} finally {
			setSwitching(null);
		}
	};

	const plans: Plan[] = [
		{
			...SUBSCRIPTION_PLANS.BASIC,
			features: [
				t('owner.subscription.basic.masters'),
				t('owner.subscription.basic.services'),
				t('owner.subscription.basic.marketing'),
				t('owner.subscription.basic.analytics'),
				t('owner.subscription.basic.crm'),
				t('owner.subscription.basic.prioritySupport'),
			],
		},
	];

	const currentPlanType = currentSubscription?.type || 'BASIC';

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="w-8 h-8 border-4 border-[#ff5b5b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
					<p className="text-gray-600">{t('owner.subscription.loading')}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen p-0 sm:p-6 lg:p-8">
			<div className="max-w-6xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
						{t('owner.subscription.title')}
					</h1>
					<p className="text-gray-600 text-sm sm:text-base">
						{t('owner.subscription.subtitle')}
					</p>
				</div>
 

				{/* Trial Info */}
				{currentSubscription?.trialEndDate && (
					<div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-blue-900">
									{t('owner.subscription.trialActive') || 'Trial Period Active'}
								</p>
								<p className="text-xs text-blue-700 mt-1">
									{(() => {
										const trialEnd = new Date(currentSubscription.trialEndDate);
										const now = new Date();
										const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
										if (daysLeft > 0) {
											const daysText = t('owner.subscription.trialDaysLeft') || '{{days}} days left in trial';
											return daysText.replace('{{days}}', daysLeft.toString());
										}
										return t('owner.subscription.trialEnded') || 'Trial period has ended';
									})()}
								</p>
							</div>
							{currentSubscription.trialEndDate && (
								<div className="text-right">
									<p className="text-xs text-blue-600">
										{new Date(currentSubscription.trialEndDate).toLocaleDateString()}
									</p>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Plans Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{plans.map((plan) => {
						const isCurrent = plan.id === currentPlanType;
						const isRecommended = plan.isRecommended && !isCurrent;

						return (
							<div
								key={plan.id}
								className={`relative bg-white rounded-2xl p-6 sm:p-8 shadow-sm border-2 transition-all ${
									isRecommended
										? 'border-[#ff5b5b] shadow-lg'
										: isCurrent
											? 'border-[#ff5b5b]'
											: 'border-gray-200'
								}`}
							>
								{/* Recommended Badge */}
								{isRecommended && (
									<div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
										<span className="bg-[#ff5b5b] text-white px-4 py-1 rounded-full text-xs font-bold uppercase">
											{t('owner.subscription.recommended')}
										</span>
									</div>
								)}

								{/* Current Badge */}
								{isCurrent && (
									<div className="absolute top-4 right-4">
										<span className="bg-[#fff7f6] text-[#ff5b5b] px-3 py-1 rounded-full text-xs font-medium">
											{t('owner.subscription.current')}
										</span>
									</div>
								)}

								{/* Plan Header */}
								<div className="mb-6">
									<div className="flex items-center gap-2 mb-2">
										{plan.id === 'BASIC' && (
											<Crown className="w-5 h-5 text-[#ff5b5b]" />
										)}
										<h2 className="text-2xl font-bold text-gray-900">
											{plan.name}
										</h2>
									</div>
									{plan.description && (
										<p className="text-sm text-gray-500 mb-4">
											{plan.description}
										</p>
									)}
									<div className="flex items-baseline gap-1">
										<span className="text-3xl sm:text-4xl font-bold text-gray-900">
											{plan.price === 0
												? '0'
												: plan.price.toLocaleString('ru-RU')}
										</span>
										{plan.price > 0 && (
											<span className="text-gray-500 text-lg">
												₫/{t('owner.subscription.perMonth')}
											</span>
										)}
										{plan.price === 0 && (
											<span className="text-gray-500 text-lg">
												₫/{t('owner.subscription.perMonth')}
											</span>
										)}
									</div>
								</div>

								{/* Features */}
								<ul className="space-y-3 mb-6">
									{plan.features.map((feature, index) => (
										<li key={index} className="flex items-start gap-3">
											<Check className="w-5 h-5 text-[#ff5b5b] flex-shrink-0 mt-0.5" />
											<span className="text-gray-700 text-sm">{feature}</span>
										</li>
									))}
								</ul>

								{/* Action Button */}
								{isCurrent ? (
									<button
										disabled
										className="w-full py-3 px-4 rounded-lg bg-[#fff7f6] text-[#ff5b5b] font-medium cursor-not-allowed"
									>
										{t('owner.subscription.activePlan')}
									</button>
								) : (
									<button
										onClick={() =>
											handleSwitchPlan(plan.id as 'BASIC')
										}
										disabled={switching === plan.id}
										className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
											isRecommended
												? 'bg-[#ff5b5b] text-white hover:bg-[#ea4b4b]'
												: 'bg-[#fff7f6] text-[#ff5b5b] hover:bg-[#ffe0de] border border-[#ff5b5b]'
										} disabled:opacity-50 disabled:cursor-not-allowed`}
									>
										{switching === plan.id ? (
											<span className="flex items-center justify-center gap-2">
												<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
												{t('owner.subscription.switching')}
											</span>
										) : (
											t('owner.subscription.switchTo').replace(
												/\{\{plan\}\}/g,
												plan.name
											)
										)}
									</button>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
