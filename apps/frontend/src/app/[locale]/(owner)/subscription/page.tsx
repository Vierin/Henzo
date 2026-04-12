import { Suspense } from 'react';
import { OwnerRouteGuard } from '@/components/RouteGuard';
import SubscriptionClient from './SubscriptionClient';
import SubscriptionPageSkeleton from './SubscriptionPageSkeleton';

export default function SubscriptionPage() {
	return (
		<OwnerRouteGuard>
			<Suspense fallback={<SubscriptionPageSkeleton />}>
				<SubscriptionClient />
			</Suspense>
		</OwnerRouteGuard>
	);
}

