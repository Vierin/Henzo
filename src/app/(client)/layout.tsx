'use client';

import AuthGuard from '@/components/AuthGuard';
import ClientLayout from '@/components/ClientLayout';

export default function ClientGroupLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<AuthGuard requiredRole="CLIENT">
			<ClientLayout>{children}</ClientLayout>
		</AuthGuard>
	);
}
