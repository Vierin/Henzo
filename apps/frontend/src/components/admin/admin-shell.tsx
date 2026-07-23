'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  extractLocaleFromPath,
  stripLocaleFromPath,
  withLocale,
} from '@/i18n/routing';

const nav = [
  { path: '/admin', label: 'Overview', exact: true },
  { path: '/admin/studios', label: 'Studios' },
  { path: '/admin/clients', label: 'Clients' },
  { path: '/admin/subscriptions', label: 'Subscriptions' },
  { path: '/admin/payments', label: 'Payments' },
  { path: '/admin/broadcast', label: 'Broadcast' },
  { path: '/admin/no-shows', label: 'No-shows' },
  { path: '/admin/notifications', label: 'Events' },
  { path: '/admin/feedback', label: 'Feedback' },
  { path: '/admin/settings', label: 'Settings' },
];

export function AdminShell({
  children,
  onSignOut,
}: {
  children: React.ReactNode;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const locale = extractLocaleFromPath(pathname) ?? 'en';
  const stripped = stripLocaleFromPath(pathname);

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <aside className="flex h-dvh w-56 shrink-0 flex-col border-r border-border bg-white px-4 py-6">
        <div className="flex shrink-0 items-center gap-2">
          <Image
            src="/logo.png"
            alt="Henzo"
            width={88}
            height={40}
            className="h-8 w-auto"
            priority
          />
          <span className="text-sm font-medium text-muted-foreground">
            Admin
          </span>
        </div>
        <nav className="mt-8 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {nav.map((item) => {
            const active = item.exact
              ? stripped === item.path
              : stripped === item.path || stripped.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.path}
                href={withLocale(item.path, locale)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-4 w-full shrink-0 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
        >
          Sign out
        </button>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
