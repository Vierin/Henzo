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
				{/* Sidebar - handles both desktop and mobile */}
				<ClientSidebar />

				{/* Main Content */}
				<main className="flex-1 p-4 md:p-8 min-h-screen md:ml-0">
					{children}
				</main>
			</div>
		</div>
	);
}
