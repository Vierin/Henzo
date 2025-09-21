'use client';

import PublicHeader from '@/components/PublicHeader';

export default function PublicGroupLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen bg-[#fff7f6]">
			<PublicHeader />
			<main>{children}</main>
		</div>
	);
}
