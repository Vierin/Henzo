'use client';

import AuthGuard from '@/components/AuthGuard';
import OwnerHeader from '@/components/OwnerHeader';

export default function OwnerGroupLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<AuthGuard requiredRole="OWNER">
			<div className="min-h-screen bg-[#fff7f6]">
				<OwnerHeader />
				<main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
			</div>
		</AuthGuard>
	);
}
