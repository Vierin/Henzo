'use client';

import { ReactNode } from 'react';
import PublicHeader from './PublicHeader';
import ClientSidebar from './ClientSidebar';

interface ClientLayoutProps {
	children: ReactNode;
	activeTab?: 'history' | 'reviews' | 'settings';
}

export default function ClientLayout({
	children,
	activeTab = 'history',
}: ClientLayoutProps) {
	return (
		<div className="min-h-screen bg-[#fff7f6]">
			<PublicHeader />
			<div className="flex">
				<ClientSidebar activeTab={activeTab} />
				<main className="flex-1 p-8">{children}</main>
			</div>
		</div>
	);
}
