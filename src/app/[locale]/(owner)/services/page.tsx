import React from 'react';
import { Metadata } from 'next';
import ServicesClient from './ServicesClient';

// Private page - should not be indexed
export const metadata: Metadata = {
	title: 'Services Management - Henzo',
	description: 'Manage your salon services and pricing',
	robots: {
		index: false,
		follow: false,
		noarchive: true,
		nosnippet: true,
	},
};

export default function ServicesPage() {
	return <ServicesClient />;
}
