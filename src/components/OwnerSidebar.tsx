'use client';

import Link from 'next/link';
import { useState, useEffect, useTransition } from 'react';
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
	UserCircle,
	Menu,
	X,
	LogOut,
	ChevronDown,
	ChevronUp,
	CreditCard,
} from 'lucide-react';
import { useSalonId } from '@/hooks/useSalons';
import { bookingKeys } from '@/hooks/useBookings';
import { serviceKeys } from '@/hooks/useServices';
import { staffKeys } from '@/hooks/useStaff';
import { timeBlockKeys } from '@/hooks/useTimeBlocks';
import { apiClient } from '@/lib/api-client';
import { useTranslation } from '@/contexts/LanguageContext';
import Image from 'next/image';

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
	const t = useTranslation();
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [isPending, startTransition] = useTransition();

	// Extract locale and path without locale
	const currentLocale = extractLocaleFromPath(pathname) ?? 'en';
	const pathNoLocale = stripLocaleFromPath(pathname);

	// Auto-open settings dropdown if on settings pages
	const isOnSettingsPage =
		pathNoLocale.startsWith('/salon-info') ||
		pathNoLocale.startsWith('/profile-settings');
	const [isSettingsOpen, setIsSettingsOpen] = useState(isOnSettingsPage);

	// Update dropdown state when pathname changes
	useEffect(() => {
		setIsSettingsOpen(isOnSettingsPage);
	}, [isOnSettingsPage]);

	// Prefetch route and data for different pages on hover
	const prefetchPageData = async (page: string, href: string) => {
		if (!salonId) return;

		try {
			// Prefetch Next.js route first (non-blocking)
			const hrefWithLocale = withLocale(
				href,
				currentLocale as 'en' | 'ru' | 'vi'
			);
			router.prefetch(hrefWithLocale);

			// Then prefetch data in parallel
			switch (page) {
				case 'dashboard':
					// Prefetch bookings for dashboard
					queryClient.prefetchQuery({
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
					Promise.all([
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
					queryClient.prefetchQuery({
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
					queryClient.prefetchQuery({
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
		if (isLoggingOut) return; // Prevent double logout

		try {
			setIsLoggingOut(true);
			// Close mobile menu if open
			setIsMobileMenuOpen?.(false);

			// Get localized home URL
			const homeUrl = withLocale('/', currentLocale as 'en' | 'ru' | 'vi');

			// Prefetch главной страницы для быстрой загрузки
			router.prefetch(homeUrl);

			// Оптимистичный редирект: сразу переходим на главную страницу
			// Это предотвращает белый экран и долгое ожидание
			window.location.href = homeUrl;

			// Выполняем logout в фоне (не ждем завершения)
			// Это не блокирует редирект и улучшает UX
			// Используем setTimeout для гарантированного выполнения даже после редиректа
			setTimeout(() => {
				logout().catch((error) => {
					console.debug('Logout error (background, non-critical):', error);
				});
			}, 0);
		} catch (error) {
			console.error('Logout error:', error);
			// Even if logout fails, redirect to home with locale
			const homeUrl = withLocale('/', currentLocale as 'en' | 'ru' | 'vi');
			window.location.href = homeUrl;
		}
	};

	// Helper function to render navigation items with optimistic navigation
	const renderNavItem = (
		href: string,
		icon: React.ReactNode | null,
		label: string,
		isActive: boolean,
		prefetchKey?: string
	) => {
		// Add locale to href
		const hrefWithLocale = withLocale(
			href,
			currentLocale as 'en' | 'ru' | 'vi'
		);

		const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
			e.preventDefault();
			setIsMobileMenuOpen?.(false);
			
			// Use startTransition for optimistic navigation
			startTransition(() => {
				router.push(hrefWithLocale);
			});
		};

		return (
			<Link
				href={hrefWithLocale}
				prefetch={true} // Prefetch route and data
				className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
					isActive
						? 'bg-[#ea4b4b] text-white'
						: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
				} ${isPending && !isActive ? 'opacity-70' : ''}`}
				onClick={handleClick}
				onMouseEnter={() => {
					// Prefetch route and data on hover for faster navigation
					if (prefetchKey && !isActive) {
						prefetchPageData(prefetchKey, href);
					}
				}}
			>
				{icon && <span>{icon}</span>}
				<span className="font-medium">{label}</span>
			</Link>
		);
	};

	// Helper function to render sidebar content
	const renderSidebarContent = () => (
		<div className="w-64 bg-white shadow-sm border-r border-gray-200 h-screen  overflow-y-auto">
			<Link href={withLocale('/', currentLocale as 'en' | 'ru' | 'vi')} className="flex pt-10 py-2 px-4 sm:px-6 items-center gap-2 cursor-pointer">
				<Image
					src="/logo.png"
					alt="Henzo Logo"
					width={120}
					height={100}
					priority
					sizes="100px"
				/>
			</Link>
			<div className="p-4 sm:p-6 sm:pt-10">
				{/* Navigation */}
				<nav className="space-y-2">
					{renderNavItem(
						'/owner-dashboard',
						<LayoutDashboard className="w-5 h-5" />,
						t('owner.dashboard.dashboard'),
						pathNoLocale === '/owner-dashboard',
						'dashboard'
					)}

					{renderNavItem(
						'/calendar',
						<CalendarDays className="w-5 h-5" />,
						t('owner.dashboard.calendar'),
						pathNoLocale === '/calendar',
						'calendar'
					)}

					{renderNavItem(
						'/services',
						<Scissors className="w-5 h-5" />,
						t('owner.services.title'),
						pathNoLocale.startsWith('/services'),
						'services'
					)}

					{renderNavItem(
						'/staff',
						<Users className="w-5 h-5" />,
						t('owner.staff.title'),
						pathNoLocale.startsWith('/staff'),
						'staff'
					)}

					{renderNavItem(
						'/subscription',
						<CreditCard className="w-5 h-5" />,
						t('owner.dashboard.subscription'),
						pathNoLocale.startsWith('/subscription')
					)}

					{/* {renderNavItem(
						'/marketing',
						<TrendingUp className="w-5 h-5" />,
						t('owner.dashboard.marketing'),
						pathNoLocale.startsWith('/marketing')
					)} */}

					{/* Settings Dropdown */}
					<div className="space-y-1">
						<button
							onClick={() => setIsSettingsOpen(!isSettingsOpen)}
							className={`flex items-center justify-between w-full px-3 py-2 rounded-lg transition-colors`}
						>
							<div className="flex items-center gap-3">
								<Settings className="w-5 h-5" />
								<span className="font-medium">
									{t('owner.dashboard.settings') || 'Settings'}
								</span>
							</div>
							{isSettingsOpen ? (
								<ChevronUp className="w-4 h-4" />
							) : (
								<ChevronDown className="w-4 h-4" />
							)}
						</button>

						{isSettingsOpen && (
							<div className="ml-8 space-y-1">
								{renderNavItem(
									'/salon-info',
									null,
									t('owner.dashboard.salonSettings'),
									pathNoLocale.startsWith('/salon-info')
								)}

								{renderNavItem(
									'/profile-settings',
									null,
									t('owner.dashboard.profileSettings'),
									pathNoLocale.startsWith('/profile-settings')
								)}
							</div>
						)}
					</div>
				</nav>

				{/* Logout Button */}
				<div className="mt-8 pt-6 border-t border-gray-200">
					<button
						onClick={handleLogout}
						disabled={isLoggingOut}
						className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoggingOut ? (
							<>
								<div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
								<span className="font-medium">
									{t('owner.dashboard.loggingOut') || 'Logging out...'}
								</span>
							</>
						) : (
							<>
								<LogOut className="w-5 h-5" />
								<span className="font-medium">
									{t('owner.dashboard.logOut')}
								</span>
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);

	return renderSidebarContent();
}
