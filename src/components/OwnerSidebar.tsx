'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import {
	LayoutDashboard,
	CalendarDays,
	Scissors,
	Users,
	TrendingUp,
	Settings,
} from 'lucide-react';

export default function OwnerSidebar() {
	const pathname = usePathname();
	const router = useRouter();
	const { logout } = useAuthStore();

	const handleLogout = async () => {
		await logout();
		// Small delay to ensure cookies are cleared
		await new Promise((resolve) => setTimeout(resolve, 100));
		router.replace('/');
	};

	return (
		<div className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
			<div className="p-6">
				{/* Navigation */}
				<nav className="space-y-2">
					<Link
						href="/owner-dashboard"
						className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
							pathname === '/owner-dashboard'
								? 'bg-[#ea4b4b] text-white'
								: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
						}`}
					>
						<LayoutDashboard className="w-5 h-5" />
						<span className="font-medium">Dashboard</span>
					</Link>

					<Link
						href="/calendar"
						className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
							pathname === '/calendar'
								? 'bg-[#ea4b4b] text-white'
								: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
						}`}
					>
						<CalendarDays className="w-5 h-5" />
						<span className="font-medium">Calendar</span>
					</Link>

					<Link
						href="/services"
						className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
							pathname.startsWith('/services')
								? 'bg-[#ea4b4b] text-white'
								: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
						}`}
					>
						<Scissors className="w-5 h-5" />
						<span className="font-medium">Services</span>
					</Link>

					<Link
						href="/staff"
						className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
							pathname.startsWith('/staff')
								? 'bg-[#ea4b4b] text-white'
								: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
						}`}
					>
						<Users className="w-5 h-5" />
						<span className="font-medium">Staff</span>
					</Link>

					<Link
						href="/marketing"
						className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
							pathname.startsWith('/marketing')
								? 'bg-[#ea4b4b] text-white'
								: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
						}`}
					>
						<TrendingUp className="w-5 h-5" />
						<span className="font-medium">Marketing</span>
					</Link>

					<Link
						href="/salon-info"
						className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
							pathname.startsWith('/salon-info')
								? 'bg-[#ea4b4b] text-white'
								: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
						}`}
					>
						<Settings className="w-5 h-5" />
						<span className="font-medium">Settings</span>
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
