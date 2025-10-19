'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
	LayoutDashboard,
	CalendarDays,
	Scissors,
	Users,
	TrendingUp,
	Settings,
	Menu,
	X,
	LogOut,
} from 'lucide-react';

interface OwnerSidebarProps {
	isMobileMenuOpen?: boolean;
	setIsMobileMenuOpen?: (open: boolean) => void;
}

export default function OwnerSidebar({
	isMobileMenuOpen = false,
	setIsMobileMenuOpen,
}: OwnerSidebarProps = {}) {
	const pathname = usePathname();
	const router = useRouter();
	const { logout } = useAuthStore();

	const handleLogout = async () => {
		try {
			// Close mobile menu if open
			setIsMobileMenuOpen?.(false);

			// Logout and wait for completion
			await logout();

			// Force immediate redirect to home page
			window.location.href = '/';
		} catch (error) {
			console.error('Logout error:', error);
			// Even if logout fails, redirect to home
			window.location.href = '/';
		}
	};

	// Helper function to render navigation items
	const renderNavItem = (
		href: string,
		icon: React.ReactNode,
		label: string,
		isActive: boolean
	) => {
		return (
			<Link
				href={href}
				className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
					isActive
						? 'bg-[#ea4b4b] text-white'
						: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
				}`}
				onClick={() => setIsMobileMenuOpen?.(false)}
			>
				{icon}
				<span className="font-medium">{label}</span>
			</Link>
		);
	};

	// Helper function to render sidebar content
	const renderSidebarContent = () => (
		<div className="w-64 bg-white shadow-sm border-r border-gray-200 h-screen pt-20 overflow-y-auto">
			<div className="p-4 sm:p-6">
				{/* Navigation */}
				<nav className="space-y-2">
					{renderNavItem(
						'/owner-dashboard',
						<LayoutDashboard className="w-5 h-5" />,
						'Dashboard',
						pathname === '/owner-dashboard'
					)}

					{renderNavItem(
						'/calendar',
						<CalendarDays className="w-5 h-5" />,
						'Calendar',
						pathname === '/calendar'
					)}

					{renderNavItem(
						'/services',
						<Scissors className="w-5 h-5" />,
						'Services',
						pathname.startsWith('/services')
					)}

					{renderNavItem(
						'/staff',
						<Users className="w-5 h-5" />,
						'Staff',
						pathname.startsWith('/staff')
					)}

					{renderNavItem(
						'/marketing',
						<TrendingUp className="w-5 h-5" />,
						'Marketing',
						pathname.startsWith('/marketing')
					)}

					{renderNavItem(
						'/salon-info',
						<Settings className="w-5 h-5" />,
						'Settings',
						pathname.startsWith('/salon-info')
					)}
				</nav>

				{/* Logout Button */}
				<div className="mt-8 pt-6 border-t border-gray-200">
					<button
						onClick={handleLogout}
						className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors w-full"
					>
						<LogOut className="w-5 h-5" />
						<span className="font-medium">Log Out</span>
					</button>
				</div>
			</div>
		</div>
	);

	return renderSidebarContent();
}
