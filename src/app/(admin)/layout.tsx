'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

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
			name: 'Subscriptions',
			href: '/subscriptions',
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
						d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
					/>
				</svg>
			),
		},
		{
			name: 'SMS',
			href: '/sms',
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
						d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
					/>
				</svg>
			),
		},
		{
			name: 'Customers',
			href: '/customers',
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
						d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
					/>
				</svg>
			),
		},
	];

	return (
		<ProtectedRoute allowedRoles={['ADMIN']}>
			<div className="min-h-screen bg-gray-50">
				<div className="flex">
					{/* Sidebar */}
					<aside className="w-64 bg-white shadow-sm min-h-screen">
						{/* Logo */}
						<div className="px-6 py-6">
							<h1 className="text-2xl font-bold text-gray-900">Henzo</h1>
						</div>

						{/* Navigation */}
						<nav className="px-4">
							<div className="space-y-2">
								{navigationItems.map((item) => {
									const isActive = pathname === item.href;
									return (
										<Link
											key={item.name}
											href={item.href}
											className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
												isActive
													? 'bg-orange-50 text-orange-600 border-r-2 border-orange-500'
													: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
											}`}
										>
											<span
												className={`mr-3 ${isActive ? 'text-orange-500' : ''}`}
											>
												{item.icon}
											</span>
											{item.name}
										</Link>
									);
								})}
							</div>
						</nav>

						{/* Logout at bottom */}
						<div className="absolute bottom-0 w-64 px-4 py-4">
							<button
								onClick={async () => {
									const { signOut } = useAuthStore.getState();
									await signOut();
								}}
								className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
							>
								<svg
									className="w-5 h-5 mr-3"
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
								Logout
							</button>
						</div>
					</aside>

					{/* Main Content */}
					<main className="flex-1 p-8">{children}</main>
				</div>
			</div>
		</ProtectedRoute>
	);
}
