import React from 'react';
import { Metadata } from 'next';
import ClientSettingsClient from './ClientSettingsClient';

// Private page - should not be indexed
export const metadata: Metadata = {
	title: 'Account Settings - Henzo',
	description: 'Manage your account settings and preferences',
	robots: {
		index: false,
		follow: false,
		noarchive: true,
		nosnippet: true,
	},
};

export default function ClientSettings() {
	return <ClientSettingsClient />;
}
