'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin/use-admin-auth';

const nav = [
  { href: '/en/admin', label: 'Overview', exact: true },
  { href: '/en/admin/studios', label: 'Studios' },
  { href: '/en/admin/subscriptions', label: 'Subscriptions' },
  { href: '/en/admin/payments', label: 'Payments' },
  { href: '/en/admin/broadcast', label: 'Broadcast' },
  { href: '/en/admin/no-shows', label: 'No-shows' },
  { href: '/en/admin/notifications', label: 'Events' },
  { href: '/en/admin/feedback', label: 'Feedback' },
  { href: '/en/admin/settings', label: 'Settings' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useAdminAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="w-56 shrink-0 border-r border-border bg-white px-4 py-6">
          <div className="flex items-center gap-2">
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
          <nav className="mt-8 flex flex-col gap-1">
            {nav.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
            onClick={() => void signOut()}
            className="mt-8 w-full rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
          >
            Sign out
          </button>
        </aside>
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
