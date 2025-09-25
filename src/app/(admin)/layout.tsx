'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useAuthInit } from '@/hooks/useAuthInit';

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { isAdmin, isInitialized } = useAuthStore();
	const router = useRouter();

	// Initialize auth only once
	useAuthInit();

	useEffect(() => {
		if (isInitialized && !isAdmin) {
			router.push('/');
		}
	}, [isInitialized, isAdmin, router]);

	if (!isInitialized) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-[#fff7f6]">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5b5b]"></div>
			</div>
		);
	}

	if (!isAdmin) {
		return null; // Will redirect
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Admin Header */}
			<header className="bg-white shadow-sm border-b">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center py-4">
						<div className="flex items-center">
							<h1 className="text-2xl font-bold text-gray-900">Henzo</h1>
						</div>
						<div className="flex items-center space-x-4">
							<span className="text-sm text-gray-500">Admin Panel</span>
						</div>
					</div>
				</div>
			</header>

			<div className="flex">
				{/* Sidebar */}
				<aside className="w-64 bg-white shadow-sm min-h-screen">
					<nav className="mt-8">
						<div className="px-4">
							<div className="space-y-2">
								<a
									href="/admin/dashboard"
									className="flex items-center px-4 py-2 text-sm font-medium text-gray-900 bg-orange-50 border-r-2 border-orange-500 rounded-l-lg"
								>
									<svg
										className="w-5 h-5 mr-3 text-orange-500"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
									</svg>
									Dashboard
								</a>
								<a
									href="/admin/salons"
									className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
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
											d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
										/>
									</svg>
									Salons
								</a>
								<a
									href="/admin/subscriptions"
									className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
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
											d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
										/>
									</svg>
									Subscriptions
								</a>
								<a
									href="/admin/sms"
									className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
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
											d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
										/>
									</svg>
									SMS
								</a>
								<a
									href="/admin/customers"
									className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
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
											d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
										/>
									</svg>
									Customers
								</a>
							</div>
						</div>
					</nav>

					<div className="absolute bottom-0 w-64 px-4 py-4">
						<a
							href="/admin/settings"
							className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
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
									d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
								/>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								/>
							</svg>
							Settings
						</a>
					</div>
				</aside>

				{/* Main Content */}
				<main className="flex-1 p-8">{children}</main>
			</div>
		</div>
	);
}
