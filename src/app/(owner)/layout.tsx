'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import OwnerHeader from '@/components/OwnerHeader';

export default function OwnerGroupLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ProtectedRoute allowedRoles={['OWNER']}>
			<div className="min-h-screen bg-[#fff7f6]">
				<OwnerHeader />
				<main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
			</div>
		</ProtectedRoute>
	);
}
