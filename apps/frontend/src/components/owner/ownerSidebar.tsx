'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  stripLocaleFromPath,
  extractLocaleFromPath,
  withLocale,
  hardNavigateToLocalePath,
  type Locale,
} from '@/i18n/routing';
import {
  LayoutDashboard,
  CalendarDays,
  Dumbbell,
  Users,
  Settings,
  LogOut,
  UserCheck,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslation } from '@/contexts/LanguageContext';
import { getPublicSupabase } from '@/lib/supabase-public';
import { clearOwnerAuthCookie } from '@/lib/owner/auth-session-cookie';

interface OwnerSidebarProps {
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

export default function OwnerSidebar({
  setIsMobileMenuOpen,
}: OwnerSidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentLocale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const pathNoLocale = stripLocaleFromPath(pathname);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    try {
      setIsLoggingOut(true);
      setIsMobileMenuOpen?.(false);
      clearOwnerAuthCookie();
      await getPublicSupabase().auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      hardNavigateToLocalePath('/login', currentLocale);
    }
  };

  const renderNavItem = (
    href: string,
    icon: React.ReactNode | null,
    label: string,
    isActive: boolean,
  ) => {
    const hrefWithLocale = withLocale(href, currentLocale);

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      setIsMobileMenuOpen?.(false);
      startTransition(() => {
        router.push(hrefWithLocale);
      });
    };

    return (
      <Link
        href={hrefWithLocale}
        prefetch
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
          isActive
            ? 'bg-[#ea4b4b] text-white'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        } ${isPending && !isActive ? 'opacity-70' : ''}`}
        onClick={handleClick}
      >
        {icon && <span>{icon}</span>}
        <span className="font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 h-screen overflow-y-auto">
      <Link
        href={withLocale('/owner-dashboard', currentLocale)}
        className="flex pt-4 sm:pt-10 py-2 px-4 sm:px-6 items-center gap-2 cursor-pointer"
      >
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
        <nav className="space-y-2">
          {renderNavItem(
            '/owner-dashboard',
            <LayoutDashboard className="w-5 h-5" />,
            t('owner.dashboard.dashboard') || 'Dashboard',
            pathNoLocale === '/owner-dashboard',
          )}
          {renderNavItem(
            '/calendar',
            <CalendarDays className="w-5 h-5" />,
            t('owner.dashboard.calendar') || 'Schedule',
            pathNoLocale.startsWith('/calendar'),
          )}
          {renderNavItem(
            '/trainings',
            <Dumbbell className="w-5 h-5" />,
            t('owner.dashboard.trainings') || 'Trainings',
            pathNoLocale.startsWith('/trainings'),
          )}
          {renderNavItem(
            '/staff',
            <Users className="w-5 h-5" />,
            t('owner.dashboard.staff.title') || 'Staff',
            pathNoLocale.startsWith('/staff'),
          )}
          {renderNavItem(
            '/clients',
            <UserCheck className="w-5 h-5" />,
            t('owner.dashboard.clients') || 'Clients',
            pathNoLocale.startsWith('/clients'),
          )}

          <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
            {renderNavItem(
              '/salon-info',
              <Settings className="w-5 h-5" />,
              t('owner.dashboard.settings') || 'Settings',
              pathNoLocale.startsWith('/salon-info'),
            )}
          </div>
        </nav>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">
              {isLoggingOut
                ? t('owner.dashboard.loggingOut') || 'Logging out...'
                : t('owner.dashboard.logOut') || 'Log Out'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
