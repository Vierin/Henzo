import { ReactNode } from 'react';
import PublicHeader from './PublicHeader';

interface PublicPageLayoutProps {
	children: ReactNode;
	showHeader?: boolean;
	className?: string;
}

export default function PublicPageLayout({
	children,
	showHeader = true,
	className = '',
}: PublicPageLayoutProps) {
	return (
		<div className={`min-h-screen ${className}`}>
			{showHeader && <PublicHeader />}
			<main>{children}</main>
		</div>
	);
}

