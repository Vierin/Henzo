import React from 'react';
import { Metadata } from 'next';
import NewServiceClient from './NewServiceClient';

// Private page - should not be indexed
export const metadata: Metadata = {
	title: 'Add New Service - Henzo',
	description: 'Create a new service for your salon',
	robots: {
		index: false,
		follow: false,
		noarchive: true,
		nosnippet: true,
	},
};

export default function NewServicePage() {
	return <NewServiceClient />;
}
