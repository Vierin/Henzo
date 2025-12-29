'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import Footer from '@/components/Footer';

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const { checkAuth, isInitialized } = useAuthStore();

	// Проверяем аутентификацию для админ панели
	useEffect(() => {
		if (!isInitialized) {
			checkAuth().catch((error) => {
				console.warn('Auth check failed:', error);
			});
		}
	}, [checkAuth, isInitialized]);

	const navigationItems = [
		{
			name: 'Dashboard',
			href: '/admin-panel',
			icon: (
				<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
					<path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
				</svg>
			),
		},
		{
			name: 'Salons',
			href: '/salons-data',
			icon: (
				<svg
					className="w-5 h-5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
					/>
				</svg>
			),
		},
		{
			name: 'Bookings',
			href: '/bookings',
			icon: (
				<svg
					className="w-5 h-5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
			),
		},
		{
			name: 'Platform Metrics',
			href: '/platform-metrics',
			icon: (
				<svg
					className="w-5 h-5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
					/>
				</svg>
			),
		},
		{
			name: 'Прибыль',
			href: '/profit',
			icon: (
				<svg
					className="w-5 h-5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			),
		},
	];

	return (
		<ProtectedRoute allowedRoles={['ADMIN']}>
			<div className="min-h-screen bg-[#fff7f6]">
				<div className="flex">
					{/* Fixed Sidebar */}
					<aside className="fixed left-0 top-0 w-64 h-screen bg-white shadow-sm border-r border-gray-200 z-10 flex flex-col">
						{/* Logo */}
						<div className="px-6 py-6 border-b border-gray-200">
							<h1 className="text-2xl font-bold text-gray-900">Henzo Admin</h1>
						</div>

						{/* Navigation */}
						<nav className="px-4 py-6 flex-1">
							<div className="space-y-2">
								{navigationItems.map((item) => {
									const isActive = pathname.includes(item.href);
									return (
										<Link
											key={item.name}
											href={item.href}
											className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
												isActive
													? 'bg-[#ea4b4b] text-white'
													: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
											}`}
										>
											<span className="flex-shrink-0">{item.icon}</span>
											<span className="font-medium">{item.name}</span>
										</Link>
									);
								})}
							</div>
						</nav>

						{/* Logout at bottom */}
						<div className="px-4 py-4 border-t border-gray-200">
							<button
								onClick={async () => {
									const { logout } = useAuthStore.getState();
									await logout();
									window.location.href = '/';
								}}
								className="flex items-center gap-3 w-full px-3 py-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
							>
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
									/>
								</svg>
								<span className="font-medium">Logout</span>
							</button>
						</div>
					</aside>

					{/* Main Content */}
					<main className="flex-1 p-4 md:p-8 ml-64 flex flex-col min-h-screen">
						<div className="flex-1">{children}</div>
						<div className="-mx-4 md:-mx-8 mt-auto">
							<Footer />
						</div>
					</main>
				</div>
			</div>
		</ProtectedRoute>
	);
}
