'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
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
import { ownerTheme } from '@/lib/owner/owner-theme';

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
      hardNavigateToLocalePath('/', currentLocale);
    }
  };

  const renderNavItem = (
    href: string,
    icon: React.ReactNode,
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
        onClick={handleClick}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
          isPending && !isActive ? 'opacity-70' : ''
        }`}
        style={
          isActive
            ? {
                backgroundColor: ownerTheme.accent,
                color: '#FFFFFF',
                fontWeight: 600,
              }
            : {
                color: ownerTheme.text,
                fontWeight: 500,
              }
        }
        onMouseEnter={(e) => {
          if (isActive) return;
          e.currentTarget.style.backgroundColor = ownerTheme.bgSoft;
        }}
        onMouseLeave={(e) => {
          if (isActive) return;
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span className="shrink-0">{icon}</span>
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <aside
      className="flex h-screen w-64 flex-col overflow-y-auto border-r px-3 py-4 sm:px-4"
      style={{
        backgroundColor: ownerTheme.card,
        borderColor: ownerTheme.borderSoft,
      }}
    >
      <Link
        href={withLocale('/owner-dashboard', currentLocale)}
        className="mb-6 flex items-center px-2 pt-2 sm:pt-4"
        onClick={() => setIsMobileMenuOpen?.(false)}
      >
        <Image
          src="/logo.png"
          alt="Henzo"
          width={112}
          height={36}
          priority
          className="h-8 w-auto object-contain"
        />
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {/* Primary — same as mobile bottom tabs */}
        {renderNavItem(
          '/owner-dashboard',
          <LayoutDashboard className="h-5 w-5" />,
          t('owner.dashboard.dashboard') || 'Home',
          pathNoLocale === '/owner-dashboard',
        )}
        {renderNavItem(
          '/calendar',
          <CalendarDays className="h-5 w-5" />,
          t('owner.dashboard.calendar') || 'Schedule',
          pathNoLocale.startsWith('/calendar'),
        )}
        {renderNavItem(
          '/clients',
          <UserCheck className="h-5 w-5" />,
          t('owner.dashboard.clients') || 'Clients',
          pathNoLocale.startsWith('/clients'),
        )}

        <p
          className="mb-1 mt-6 px-3 text-[11px] font-semibold uppercase tracking-[0.06em]"
          style={{ color: ownerTheme.textSecondary }}
        >
          Manage
        </p>
        {renderNavItem(
          '/trainings',
          <Dumbbell className="h-5 w-5" />,
          t('owner.dashboard.trainings') || 'Trainings',
          pathNoLocale.startsWith('/trainings'),
        )}
        {renderNavItem(
          '/staff',
          <Users className="h-5 w-5" />,
          t('owner.dashboard.staff.title') || 'Staff',
          pathNoLocale.startsWith('/staff'),
        )}

        <div
          className="my-4 border-t"
          style={{ borderColor: ownerTheme.borderSoft }}
        />

        {renderNavItem(
          '/salon-info',
          <Settings className="h-5 w-5" />,
          t('owner.dashboard.settings') || 'Settings',
          pathNoLocale.startsWith('/salon-info'),
        )}
      </nav>

      <div
        className="mt-auto border-t pt-3"
        style={{ borderColor: ownerTheme.borderSoft }}
      >
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          style={{ color: ownerTheme.text }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#FEE2E2';
            e.currentTarget.style.color = '#DC2626';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = ownerTheme.text;
          }}
        >
          <LogOut className="h-5 w-5" />
          <span>
            {isLoggingOut
              ? t('owner.dashboard.loggingOut') || 'Logging out...'
              : t('owner.dashboard.logOut') || 'Log Out'}
          </span>
        </button>
      </div>
    </aside>
  );
}
