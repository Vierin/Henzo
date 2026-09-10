'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays, LogOut, Search, UserRound } from 'lucide-react';
import {
  extractLocaleFromPath,
  hardNavigateToLocalePath,
  stripLocaleFromPath,
  withLocale,
  type Locale,
} from '@/i18n/routing';
import { clearClientAuthCookie } from '@/lib/client-panel/auth-session-cookie';
import { clientTheme } from '@/lib/client-panel/client-theme';
import { getPublicSupabase } from '@/lib/supabase-public';

interface ClientSidebarProps {
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

export default function ClientSidebar({
  setIsMobileMenuOpen,
}: ClientSidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentLocale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const pathNoLocale = stripLocaleFromPath(pathname);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    try {
      setIsLoggingOut(true);
      setIsMobileMenuOpen?.(false);
      clearClientAuthCookie();
      await getPublicSupabase().auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      hardNavigateToLocalePath('/login', currentLocale);
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
                backgroundColor: clientTheme.accent,
                color: '#FFFFFF',
                fontWeight: 600,
              }
            : {
                color: clientTheme.text,
                fontWeight: 500,
              }
        }
        onMouseEnter={(e) => {
          if (isActive) return;
          e.currentTarget.style.backgroundColor = clientTheme.bgSoft;
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
        backgroundColor: clientTheme.card,
        borderColor: clientTheme.borderSoft,
      }}
    >
      <Link
        href={withLocale('/activity', currentLocale)}
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
        {renderNavItem(
          '/studios',
          <Search className="h-5 w-5" />,
          'Browse',
          pathNoLocale.startsWith('/studios') ||
            pathNoLocale.startsWith('/studio/') ||
            pathNoLocale.startsWith('/category/'),
        )}
        {renderNavItem(
          '/activity',
          <CalendarDays className="h-5 w-5" />,
          'Activity',
          pathNoLocale.startsWith('/activity'),
        )}
        {renderNavItem(
          '/profile',
          <UserRound className="h-5 w-5" />,
          'Profile',
          pathNoLocale.startsWith('/profile'),
        )}
      </nav>

      <div
        className="mt-auto border-t pt-3"
        style={{ borderColor: clientTheme.borderSoft }}
      >
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          style={{ color: clientTheme.text }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#FEE2E2';
            e.currentTarget.style.color = '#DC2626';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = clientTheme.text;
          }}
        >
          <LogOut className="h-5 w-5" />
          <span>{isLoggingOut ? 'Logging out...' : 'Log Out'}</span>
        </button>
      </div>
    </aside>
  );
}
