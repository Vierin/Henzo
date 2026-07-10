'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bell,
  CalendarDays,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Star,
  Users,
  Dumbbell,
  UserCog,
  CreditCard,
} from 'lucide-react';
import { extractLocaleFromPath } from '@/i18n/routing';
import { useOwnerAuth } from '@/lib/owner/use-owner-auth';
import { OwnerUpgradeCard } from './dashboard/ownerUpgradeCard';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  phase2?: boolean;
  exact?: boolean;
};

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const locale = extractLocaleFromPath(pathname) ?? 'en';
  const base = `/${locale}/owner`;
  const { signOut } = useOwnerAuth();

  const nav: NavItem[] = [
    { href: base, label: 'Overview', icon: LayoutDashboard, exact: true },
    { href: `${base}/calendar`, label: 'Schedule', icon: CalendarDays },
    { href: `${base}/clients`, label: 'Clients', icon: Users },
    { href: `${base}/services`, label: 'Services', icon: Dumbbell },
    {
      href: `${base}/notifications`,
      label: 'Messages',
      icon: MessageSquare,
      phase2: true,
    },
    { href: `${base}/staff`, label: 'Staff', icon: UserCog, phase2: true },
    {
      href: `${base}/analytics`,
      label: 'Reports',
      icon: BarChart3,
      phase2: true,
    },
    {
      href: `${base}/subscription`,
      label: 'Payments',
      icon: CreditCard,
      phase2: true,
    },
    {
      href: `${base}/reviews`,
      label: 'Reviews',
      icon: Star,
      phase2: true,
    },
    { href: `${base}/studio`, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#3F3F3F]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[220px] shrink-0 flex-col border-r border-zinc-100 bg-white px-4 py-6 lg:flex">
          <Link href={base} className="mb-8 flex items-center gap-2 px-2">
            <Image
              src="/logo.png"
              alt="Henzo"
              width={120}
              height={40}
              className="h-9 w-auto object-contain"
            />
          </Link>

          <nav className="flex flex-1 flex-col gap-0.5">
            {nav.map((item) => {
              const Icon = item.icon;
              const active =
                'exact' in item && item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#EDE9F6] text-[#3F3287]'
                      : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-full bg-[#FF5B5B] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <OwnerUpgradeCard locale={locale} />

          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-4 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            Log out
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-zinc-100 bg-white px-4 py-3 lg:hidden">
            <Link href={base}>
              <Image
                src="/logo.png"
                alt="Henzo"
                width={100}
                height={32}
                className="h-8 w-auto"
              />
            </Link>
            <Link
              href={`${base}/notifications`}
              className="relative rounded-full p-2 hover:bg-zinc-50"
            >
              <Bell className="h-5 w-5 text-zinc-600" />
            </Link>
          </header>

          <main className="min-w-0 flex-1 overflow-auto p-4 pb-24 md:p-6 lg:pb-8 lg:p-8">
            {children}
          </main>

          <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-zinc-100 bg-white px-2 py-2 lg:hidden">
            {nav.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1 text-[10px] font-medium ${
                    active ? 'text-[#3F3287]' : 'text-zinc-500'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
