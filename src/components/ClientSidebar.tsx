'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
	Heart,
	Clock,
	Star,
	Settings,
	LogOut,
	User,
	Menu,
	X,
} from 'lucide-react';
import { useFavoriteSalons } from '@/hooks/useFavorites';
import { useUpcomingBookings, useUserReviews } from '@/hooks/useClient';

export default function ClientSidebar() {
	const pathname = usePathname();
	const router = useRouter();
	const { logout, user } = useAuthStore();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	// Get counts for badges
	const { data: favorites = [] } = useFavoriteSalons(!!user);
	const { data: upcomingBookings = [] } = useUpcomingBookings();
	const { data: userReviews = [] } = useUserReviews();

	const handleLogout = async () => {
		await logout();
		// Small delay to ensure cookies are cleared
		await new Promise((resolve) => setTimeout(resolve, 100));
		router.replace('/');
	};

	const toggleMobileMenu = () => {
		setIsMobileMenuOpen(!isMobileMenuOpen);
	};

	// Helper function to render navigation items
	const renderNavItem = (
		href: string,
		icon: React.ReactNode,
		label: string,
		badge?: number
	) => {
		const isActive = pathname === href;
		return (
			<Link
				href={href}
				className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
					isActive
						? 'bg-red-50 text-[#ff5b5b] border-r-2 border-[#ff5b5b]'
						: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
				}`}
				onClick={() => setIsMobileMenuOpen(false)}
			>
				<div className="flex items-center gap-3">
					{icon}
					<span className="font-medium">{label}</span>
				</div>
				{badge !== undefined && badge > 0 && (
					<span className="bg-[#ff5b5b] text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
						{badge}
					</span>
				)}
			</Link>
		);
	};

	// Helper function to render sidebar content
	const renderSidebarContent = () => (
		<div className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
			<div className="p-6">
				{/* User Profile Section */}
				{user && (
					<div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-6">
						<div className="w-10 h-10 bg-[#ff5b5b] rounded-full flex items-center justify-center">
							<User className="w-5 h-5 text-white" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="font-medium text-gray-900 truncate">
								{user.name || user.email?.split('@')[0]}
							</p>
						</div>
					</div>
				)}

				{/* Navigation */}
				<nav className="space-y-2">
					{renderNavItem(
						'/dashboard',
						<Clock className="w-5 h-5" />,
						'Visit History',
						upcomingBookings.length
					)}

					{renderNavItem(
						'/favorites',
						<Heart className="w-5 h-5" />,
						'Favorite Salons',
						favorites.length
					)}

					{renderNavItem(
						'/reviews',
						<Star className="w-5 h-5" />,
						'Your Reviews',
						userReviews.length
					)}

					{renderNavItem(
						'/settings',
						<Settings className="w-5 h-5" />,
						'Account Settings'
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

	return (
		<>
			{/* Mobile Menu Button */}
			<button
				onClick={toggleMobileMenu}
				className="md:hidden fixed top-2 right-2 z-50 bg-white shadow-lg rounded-lg p-2 border border-gray-200"
				aria-label="Toggle menu"
			>
				{isMobileMenuOpen ? (
					<X className="w-6 h-6 text-gray-700" />
				) : (
					<Menu className="w-6 h-6 text-gray-700" />
				)}
			</button>

			{/* Mobile Overlay */}
			{isMobileMenuOpen && (
				<div
					className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
					onClick={() => setIsMobileMenuOpen(false)}
				/>
			)}

			{/* Desktop Sidebar */}
			<div className="hidden md:block">{renderSidebarContent()}</div>

			{/* Mobile Sidebar */}
			<div
				className={`md:hidden fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
					isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
				}`}
			>
				{renderSidebarContent()}
			</div>
		</>
	);
}
