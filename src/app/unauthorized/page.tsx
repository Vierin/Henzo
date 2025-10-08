import { Metadata } from 'next';
import UnauthorizedClient from './UnauthorizedClient';

// Private page - should not be indexed
export const metadata: Metadata = {
	title: 'Access Denied - Henzo',
	description: 'You do not have permission to access this page',
	robots: {
		index: false,
		follow: false,
		noarchive: true,
		nosnippet: true,
	},
};

export default function UnauthorizedPage() {
	return <UnauthorizedClient />;
}
