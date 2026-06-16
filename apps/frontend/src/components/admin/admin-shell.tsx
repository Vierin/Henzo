'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin/use-admin-auth';

const nav = [
  { href: '/en/admin', label: 'Overview', exact: true },
  { href: '/en/admin/studios', label: 'Studios' },
  { href: '/en/admin/subscriptions', label: 'Subscriptions' },
  { href: '/en/admin/notifications', label: 'Events' },
  { href: '/en/admin/feedback', label: 'Feedback' },
  { href: '/en/admin/settings', label: 'Settings' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useAdminAuth();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="flex min-h-screen">
        <aside className="w-56 shrink-0 border-r border-zinc-200 bg-white px-4 py-6">
          <p className="text-lg font-semibold text-[#3F3287]">Henzo Admin</p>
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
                      ? 'bg-[#3F3287] text-white'
                      : 'text-zinc-600 hover:bg-zinc-100'
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
            className="mt-8 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            Sign out
          </button>
        </aside>
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
