'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import {
	stripLocaleFromPath,
	extractLocaleFromPath,
	withLocale,
} from '@/i18n/routing';
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
import { useSalonId } from '@/hooks/useSalon';
import { bookingKeys } from '@/hooks/useBookings';
import { serviceKeys } from '@/hooks/useServices';
import { staffKeys } from '@/hooks/useStaff';
import { timeBlockKeys } from '@/hooks/useTimeBlocks';
import { apiClient } from '@/lib/api-client';

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
	const queryClient = useQueryClient();
	const { salonId } = useSalonId();

	// Extract locale and path without locale
	const currentLocale = extractLocaleFromPath(pathname) ?? 'en';
	const pathNoLocale = stripLocaleFromPath(pathname);

	// Prefetch data for different pages on hover
	const prefetchPageData = async (page: string) => {
		if (!salonId) return;

		try {
			switch (page) {
				case 'dashboard':
					// Prefetch bookings for dashboard
					await queryClient.prefetchQuery({
						queryKey: bookingKeys.list({}),
						queryFn: async () => {
							const response = await apiClient.get('/bookings/owner');
							return response || [];
						},
						staleTime: 2 * 60 * 1000,
					});
					break;
				case 'calendar':
					// Prefetch bookings and time blocks for calendar
					await Promise.all([
						queryClient.prefetchQuery({
							queryKey: bookingKeys.list({}),
							queryFn: async () => {
								const response = await apiClient.get('/bookings/owner');
								return response || [];
							},
							staleTime: 2 * 60 * 1000,
						}),
						queryClient.prefetchQuery({
							queryKey: timeBlockKeys.list({}),
							queryFn: async () => {
								const response = await apiClient.get('/time-blocks');
								return response || [];
							},
							staleTime: 2 * 60 * 1000,
						}),
					]);
					break;
				case 'services':
					// Prefetch services
					await queryClient.prefetchQuery({
						queryKey: serviceKeys.list({ salonId }),
						queryFn: async () => {
							const response = await apiClient.get(
								`/services?salonId=${salonId}`
							);
							return response || [];
						},
						staleTime: 5 * 60 * 1000,
					});
					break;
				case 'staff':
					// Prefetch staff
					await queryClient.prefetchQuery({
						queryKey: staffKeys.bySalon(salonId),
						queryFn: async () => {
							const response = await apiClient.get(`/staff?salonId=${salonId}`);
							return response || [];
						},
						staleTime: 5 * 60 * 1000,
					});
					break;
			}
		} catch (error) {
			// Silently fail prefetching - it's just an optimization
			console.debug('Prefetch failed for', page, error);
		}
	};

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
		isActive: boolean,
		prefetchKey?: string
	) => {
		// Add locale to href
		const hrefWithLocale = withLocale(
			href,
			currentLocale as 'en' | 'ru' | 'vi'
		);
		return (
			<Link
				href={hrefWithLocale}
				className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
					isActive
						? 'bg-[#ea4b4b] text-white'
						: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
				}`}
				onClick={() => setIsMobileMenuOpen?.(false)}
				onMouseEnter={() => {
					if (prefetchKey && !isActive) {
						prefetchPageData(prefetchKey);
					}
				}}
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
						pathNoLocale === '/owner-dashboard',
						'dashboard'
					)}

					{renderNavItem(
						'/calendar',
						<CalendarDays className="w-5 h-5" />,
						'Calendar',
						pathNoLocale === '/calendar',
						'calendar'
					)}

					{renderNavItem(
						'/services',
						<Scissors className="w-5 h-5" />,
						'Services',
						pathNoLocale.startsWith('/services'),
						'services'
					)}

					{renderNavItem(
						'/staff',
						<Users className="w-5 h-5" />,
						'Staff',
						pathNoLocale.startsWith('/staff'),
						'staff'
					)}

					{renderNavItem(
						'/marketing',
						<TrendingUp className="w-5 h-5" />,
						'Marketing',
						pathNoLocale.startsWith('/marketing')
					)}

					{renderNavItem(
						'/salon-info',
						<Settings className="w-5 h-5" />,
						'Settings',
						pathNoLocale.startsWith('/salon-info')
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
