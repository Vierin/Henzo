'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-unified';
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
import { useQuery } from '@tanstack/react-query';
import { useFavoriteSalons } from '@/hooks/useFavorites';
import { useUpcomingBookings } from '@/hooks/useClient';
import {
	extractLocaleFromPath,
	stripLocaleFromPath,
	withLocale,
} from '@/i18n/routing';
import { useTranslation } from '@/contexts/LanguageContext';

export default function ClientSidebar() {
	const pathname = usePathname();
	const router = useRouter();
	const { logout, user } = useAuth();
	const t = useTranslation();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const currentLocale = extractLocaleFromPath(pathname) ?? 'en';
	const pathWithoutLocale = stripLocaleFromPath(pathname);

	// Only load data if user is authenticated
	const isAuthenticated = !!user;

	// Get counts for badges - only load when authenticated
	// Load minimal data for sidebar badges, full data will be loaded in respective pages
	const { data: favorites = [] } = useFavoriteSalons(isAuthenticated);
	const { data: upcomingBookings = [] } = useUpcomingBookings(isAuthenticated);

	// Use cached data from React Query instead of making new request
	// This will use existing cache if available, preventing duplicate requests
	const { data: userReviews = [] } = useQuery({
		queryKey: ['user-reviews'],
		queryFn: async () => [], // Empty function since we only need cache
		staleTime: 5 * 60 * 1000, // 5 minutes
		enabled: false, // Never make request, only use cache
	});

	const handleLogout = async () => {
		try {
			// Close mobile menu if open
			setIsMobileMenuOpen(false);

			// Call logout
			await logout();

			// Redirect to home page with current locale
			const homePath = withLocale('/', currentLocale as 'en' | 'ru' | 'vi');
			router.push(homePath);
		} catch (error) {
			console.error('Logout error:', error);
			// Even if logout fails, redirect to home
			const homePath = withLocale('/', currentLocale as 'en' | 'ru' | 'vi');
			router.push(homePath);
		}
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
		// Добавляем локаль к href для правильной навигации
		const hrefWithLocale = withLocale(
			href,
			currentLocale as 'en' | 'ru' | 'vi'
		);
		// Сравниваем пути без локали для определения активной вкладки
		const hrefWithoutLocale = stripLocaleFromPath(href);
		const isActive = pathWithoutLocale === hrefWithoutLocale;
		return (
			<Link
				href={hrefWithLocale}
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
			<div className="md:p-6 p-4">
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
						t('client.dashboard.title'),
						upcomingBookings.length
					)}

					{renderNavItem(
						'/favorites',
						<Heart className="w-5 h-5" />,
						t('client.favorites.title'),
						favorites.length
					)}

					{renderNavItem(
						'/reviews',
						<Star className="w-5 h-5" />,
						t('client.reviews.title'),
						userReviews.length
					)}

					{renderNavItem(
						'/settings',
						<Settings className="w-5 h-5" />,
						t('clientSettings.title')
					)}
				</nav>

				{/* Logout Button */}
				<div className="mt-8 pt-6 border-t border-gray-200">
					<button
						onClick={handleLogout}
						className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors w-full"
					>
						<LogOut className="w-5 h-5" />
						<span className="font-medium">{t('clientSettings.logOut')}</span>
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
				aria-label={t('common.toggleMenu')}
			>
				{isMobileMenuOpen ? (
					<X className="w-5 h-5 text-gray-700" />
				) : (
					<Menu className="w-5 h-5 text-gray-700" />
				)}
			</button>

			{/* Mobile Overlay */}
			{isMobileMenuOpen && (
				<div
					className="md:hidden fixed inset-0 bg-black/60 bg-opacity-50 z-40"
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
