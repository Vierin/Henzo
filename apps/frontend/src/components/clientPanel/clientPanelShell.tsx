'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Heart, Home, Search, UserRound } from 'lucide-react';
import {
  extractLocaleFromPath,
  stripLocaleFromPath,
  withLocale,
  type Locale,
} from '@/i18n/routing';

const nav = [
  { href: '/', label: 'Home', icon: Home, match: (p: string) => p === '/' },
  {
    href: '/studios',
    label: 'Browse',
    icon: Search,
    match: (p: string) =>
      p.startsWith('/studios') ||
      p.startsWith('/studio/') ||
      p.startsWith('/category/'),
  },
  {
    href: '/activity',
    label: 'Activity',
    icon: CalendarDays,
    match: (p: string) => p.startsWith('/activity'),
  },
  {
    href: '/favorites',
    label: 'Favorites',
    icon: Heart,
    match: (p: string) => p.startsWith('/favorites'),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: UserRound,
    match: (p: string) => p.startsWith('/profile'),
  },
] as const;

export default function ClientPanelShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const pathNoLocale = stripLocaleFromPath(pathname);

  return (
    <div className="min-h-screen bg-[#F9F4F0] font-wix-madefor-display text-[#3F3F3F]">
      <header className="sticky top-0 z-30 border-b border-[#EDE8E3] bg-[#F9F4F0]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <h1 className="text-lg font-bold tracking-tight sm:text-xl">
            {title || 'Henzo'}
          </h1>
          <Link
            href={withLocale('/', locale)}
            className="text-sm font-medium text-[#E86D4F] hover:underline"
          >
            Explore
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-4 sm:px-6 sm:pt-6">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#EDE8E3] bg-white/95 backdrop-blur"
        aria-label="Client"
      >
        <ul className="mx-auto flex max-w-3xl items-stretch justify-around px-1 py-1.5">
          {nav.map((item) => {
            const active = item.match(pathNoLocale);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={withLocale(item.href, locale)}
                  className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[11px] font-semibold ${
                    active
                      ? 'text-[#E86D4F]'
                      : 'text-[#878787] hover:text-[#3F3F3F]'
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
