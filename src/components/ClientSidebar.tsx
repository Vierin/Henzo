'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';

interface ClientSidebarProps {
	activeTab?: 'history' | 'reviews' | 'settings';
}

export default function ClientSidebar({
	activeTab = 'history',
}: ClientSidebarProps) {
	const { logout } = useAuthStore();

	const handleLogout = async () => {
		await logout();
	};

	return (
		<div className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
			<div className="p-6">
				{/* Brand */}
				<div className="mb-8">
					<h1 className="text-2xl font-bold text-gray-900">Henzo</h1>
				</div>

				{/* Navigation */}
				<nav className="space-y-2">
					<Link
						href="/client/history"
						className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
							activeTab === 'history'
								? 'bg-white text-[#ff5b5b] border-r-4 border-[#ff5b5b]'
								: 'text-gray-600 hover:bg-gray-50'
						}`}
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
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span className="font-medium">Visit History</span>
					</Link>

					<Link
						href="/client/reviews"
						className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
							activeTab === 'reviews'
								? 'bg-white text-[#ff5b5b] border-r-4 border-[#ff5b5b]'
								: 'text-gray-600 hover:bg-gray-50'
						}`}
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
								d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
							/>
						</svg>
						<span className="font-medium">Your Reviews</span>
					</Link>

					<Link
						href="/client/settings"
						className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
							activeTab === 'settings'
								? 'bg-white text-[#ff5b5b] border-r-4 border-[#ff5b5b]'
								: 'text-gray-600 hover:bg-gray-50'
						}`}
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
								d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
							/>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
						<span className="font-medium">Account Settings</span>
					</Link>
				</nav>

				{/* Logout Button */}
				<div className="mt-8 pt-6 border-t border-gray-200">
					<button
						onClick={handleLogout}
						className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors w-full"
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
						<span className="font-medium">Log Out</span>
					</button>
				</div>
			</div>
		</div>
	);
}
