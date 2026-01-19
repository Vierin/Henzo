'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useOwnerLayout } from '@/contexts/OwnerLayoutContext';
import { apiClient } from '@/lib/api-client';
import { Check, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { SUBSCRIPTION_PLANS } from '@/config/subscriptionPlans';
import LoadingSpinner from '@/components/LoadingSpinner';

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
			<div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
				<LoadingSpinner
					fullScreen={false}
					message={t('owner.subscription.loading')}
				/>
			</div>
		);
	}

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

	return (
		<div className="min-h-screen bg-[#F0F4F8] relative overflow-hidden">
			<main className="container mx-auto px-4 py-6 max-w-5xl relative z-0">
				{/* Header */}
				<header className="text-center mb-12">
					<h1 className="text-3xl md:text-4xl font-bold !mb-2 text-gray-900 tracking-tight">
						{t('owner.subscription.title')}
					</h1>
					<p className="text-gray-500 text-lg font-medium">
						{t('owner.subscription.subtitle')}
					</p>
				</header>

				{/* Trial Period Card */}
				{currentSubscription?.trialEndDate && (
					<section className="mb-10">
						<div
							className="relative w-full max-w-3xl mx-auto backdrop-blur-[12px] bg-white/65 border border-white/50 shadow-md rounded-2xl p-8 transition-all hover:shadow-lg"
						>
							 <span className="absolute top-3 right-3 md:top-4 md:right-4 flex items-center px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wide bg-[#ff5b5b]/10 text-[#ff5b5b]">
									{t('owner.subscription.current')}
								</span>


						 
								<div className='text-left'>
									<h2 className="text-2xl font-bold text-gray-800 max-w-[70%] sm:max-w-full mb-2">
										{t('owner.subscription.trialPeriod')} {t('owner.subscription.henzoPro')}
									</h2>

									<p className="text-gray-500 text-sm font-medium">Сейчас у вас есть полный доступ ко всем функциям платформы.</p>
									<div className='mt-2'>
										<p className="text-gray-700 text-sm font-medium">
											{t('owner.subscription.trialValidUntil')} {trialEndDateFormatted}
										</p> 
									</div>
								</div>
							  
						</div>
					</section>
				)}

				{/* Henzo Pro Card */}
				<section className="relative">
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-[#ff5b5b]/20 blur-[60px] rounded-full -z-10"></div>
					<div
						className="w-full max-w-4xl mx-auto backdrop-blur-[12px] bg-white/80 border-2 border-white/60 shadow-md rounded-3xl p-8 md:p-12 overflow-hidden"
						style={{ backdropFilter: 'blur(12px)' }}
					>
						<div className="flex flex-col md:flex-row gap-6 items-center justify-between mt-4">
							<div className="flex-1 text-left">
								<h3 className="text-4xl md:text-5xl !font-bold text-gray-900 tracking-tight !mb-2">
									{t('owner.subscription.henzoPro')}
								</h3>
								<div className="">
									<p className="text-2xl md:text-3xl font-bold text-[#ff5b5b] mb-6">
										{t('owner.subscription.threeMonthsFree')}
									</p>
									<p className="text-gray-500 text-md">
										{t('owner.subscription.thenPrice')}{' '}
										{SUBSCRIPTION_PLANS.BASIC.price.toLocaleString('vi-VN')} VND/
										{t('owner.subscription.perMonth')}
									</p>
								</div>
								<p className="text-gray-600 max-w-sm mx-auto md:mx-0 pt-2">
									{t('owner.subscription.maxOpportunities')}
								</p>
							</div>
							<div className="flex-1 w-full">
								<div className="py-4 md:py-6">
									<ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
										{plans[0]?.features.map((feature, index) => (
											<li key={index} className="flex items-start space-x-3">
												<span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#ff5b5b]/10 flex items-center justify-center mt-0.5">
													<Check className="w-4 h-4 text-[#ff5b5b] font-bold" />
												</span>
												<span className="text-gray-700 font-medium text-sm">
													{feature}
												</span>
											</li>
										))}
									</ul>
								</div>
							</div>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
