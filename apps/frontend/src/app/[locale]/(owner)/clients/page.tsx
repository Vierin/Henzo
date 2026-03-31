import React from 'react';
import { Metadata } from 'next';
import ClientsClient from './ClientsClient';

// Private page - should not be indexed
export const metadata: Metadata = {
	title: 'Clients - Henzo Business',
	description: 'Manage your clients and their visit history',
	robots: {
		index: false,
		follow: false,
		noarchive: true,
		nosnippet: true,
	},
};

export default function ClientsPage() {
	return <ClientsClient />;
}

