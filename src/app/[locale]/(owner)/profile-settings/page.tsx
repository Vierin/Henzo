import React from 'react';
import { Metadata } from 'next';
import ProfileSettingsClient from './ProfileSettingsClient';
import { OwnerRouteGuard } from '@/components/RouteGuard';

export const metadata: Metadata = {
	title: 'Profile Settings - Henzo',
	description: 'Manage your account profile and security settings',
	robots: {
		index: false,
		follow: false,
	},
};

export default function ProfileSettingsPage() {
	return (
		<OwnerRouteGuard>
			<ProfileSettingsClient />
		</OwnerRouteGuard>
	);
}

