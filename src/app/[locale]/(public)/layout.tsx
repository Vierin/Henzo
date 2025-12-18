import PublicLayoutClient from './PublicLayoutClient';

export default function PublicGroupLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Layout needs to be client-side for pathname detection
	// But we've extracted the scroll logic to minimize client code
	return <PublicLayoutClient>{children}</PublicLayoutClient>;
}
