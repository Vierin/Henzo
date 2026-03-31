import { Metadata } from 'next';
import { OwnerRouteGuard } from '@/components/RouteGuard';
import OwnerHelpClient from './OwnerHelpClient';

export const metadata: Metadata = {
	title: 'Quick guide - Henzo',
	description: 'Short tips for managing your salon in Henzo',
	robots: { index: false, follow: false },
};

export default function OwnerHelpPage() {
	return (
		<OwnerRouteGuard>
			<OwnerHelpClient />
		</OwnerRouteGuard>
	);
}
