'use client';

import { ReactNode } from 'react';
import OwnerHeader from './OwnerHeader';
import OwnerSidebar from './OwnerSidebar';

interface OwnerLayoutProps {
	children: ReactNode;
}

export default function OwnerLayout({ children }: OwnerLayoutProps) {
	return (
		<div className="min-h-screen bg-[#fff7f6]">
			<OwnerHeader />
			<div className="flex">
				<OwnerSidebar />
				<main className="flex-1 p-8">{children}</main>
			</div>
		</div>
	);
}
