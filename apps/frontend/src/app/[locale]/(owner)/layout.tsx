'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import OwnerLayout from '@/components/OwnerLayout';
import { OwnerLayoutProvider } from '@/contexts/OwnerLayoutContext';

export default function OwnerGroupLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ProtectedRoute allowedRoles={['OWNER']}>
			<OwnerLayoutProvider>
				<OwnerLayout>{children}</OwnerLayout>
			</OwnerLayoutProvider>
		</ProtectedRoute>
	);
}
