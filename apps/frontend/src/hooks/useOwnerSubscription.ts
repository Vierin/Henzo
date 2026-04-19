import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useOwnerLayout } from '@/contexts/OwnerLayoutContext';

export interface OwnerSubscriptionPayload {
	id: string;
	salonId: string;
	type: 'TRIAL' | 'STARTER';
	status: 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'EXPIRED';
	startDate: string;
	endDate?: string | null;
	nextPaymentDate?: string | null;
	trialEndDate?: string | null;
	amount: number;
	stripeCustomerId?: string | null;
	cancelAtPeriodEnd?: boolean;
	cancelAt?: string | null;
	configurationExpansionAllowed: boolean;
	annualPromotionPercent: number | null;
}

export function useOwnerSubscription() {
	const { salonId } = useOwnerLayout();

	return useQuery({
		queryKey: ['owner-subscription', salonId],
		queryFn: () =>
			apiClient.get<OwnerSubscriptionPayload>('/subscriptions/current'),
		enabled: !!salonId,
		staleTime: 60_000,
	});
}
