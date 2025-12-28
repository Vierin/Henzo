import { Suspense } from 'react';
import { OwnerRouteGuard } from '@/components/RouteGuard';
import SubscriptionClient from './SubscriptionClient';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function SubscriptionPage() {
	return (
		<OwnerRouteGuard>
			<Suspense fallback={<LoadingSpinner />}>
				<SubscriptionClient />
			</Suspense>
		</OwnerRouteGuard>
	);
}

