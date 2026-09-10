'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { ownerTheme } from '@/lib/owner/owner-theme';

export function SettingsSubpageShell({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 lg:max-w-3xl">
      <div className="flex items-center gap-2">
        <Link
          href={withLocale('/salon-info', locale)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white"
          aria-label="Back to settings"
        >
          <ChevronLeft className="h-5 w-5" style={{ color: ownerTheme.text }} />
        </Link>
        <h1
          className="min-w-0 flex-1 text-xl font-bold tracking-tight"
          style={{ color: ownerTheme.text }}
        >
          {title}
        </h1>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </div>
  );
}
