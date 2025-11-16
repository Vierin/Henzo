'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import ClientLayout from '@/components/ClientLayout';

export default function ClientGroupLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ProtectedRoute allowedRoles={['CLIENT']}>
			<ClientLayout>{children}</ClientLayout>
		</ProtectedRoute>
	);
}
