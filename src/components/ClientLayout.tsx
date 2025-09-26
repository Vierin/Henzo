'use client';

import { ReactNode } from 'react';
import PublicHeader from './PublicHeader';
import ClientSidebar from './ClientSidebar';

interface ClientLayoutProps {
	children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
	return (
		<div className="min-h-screen bg-[#fff7f6]">
			<PublicHeader />
			<div className="flex">
				<ClientSidebar />
				<main className="flex-1 p-8">{children}</main>
			</div>
		</div>
	);
}
