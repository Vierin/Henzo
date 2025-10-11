'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import OwnerLayout from '@/components/OwnerLayout';

export default function OwnerGroupLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ProtectedRoute allowedRoles={['OWNER']}>
			<OwnerLayout>{children}</OwnerLayout>
		</ProtectedRoute>
	);
}
