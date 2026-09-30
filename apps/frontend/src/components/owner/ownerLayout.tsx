'use client';

import { ReactNode, useState } from 'react';
import { usePathname } from 'next/navigation';
import { stripLocaleFromPath } from '@/i18n/routing';
import { ownerTheme } from '@/lib/owner/owner-theme';
import OwnerHeader from './ownerHeader';
import OwnerSidebar from './ownerSidebar';
import { SubscriptionAccessPrompt } from './subscriptionAccessPrompt';

export default function OwnerLayoutShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const pathNoLocale = stripLocaleFromPath(pathname);
  const isSetup = pathNoLocale.startsWith('/business/complete-setup');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (isSetup) {
    return (
      <div
        className="owner-panel min-h-screen w-full font-wix-madefor-display"
        style={{ backgroundColor: ownerTheme.bg, color: ownerTheme.text }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className="owner-panel min-h-screen w-full overflow-x-hidden font-wix-madefor-display"
      style={{ backgroundColor: ownerTheme.bg, color: ownerTheme.text }}
    >
      <div className="flex">
        <div className="hidden md:block fixed left-0 top-0 z-90 h-full">
          <OwnerSidebar />
        </div>

        <div
          className={`md:hidden fixed inset-y-0 left-0 z-[300] transform transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <OwnerSidebar
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          />
        </div>

        <div className="flex-1 w-full">
          <div className="sticky top-0 z-[300] md:pl-64">
            <OwnerHeader
              isMobileMenuOpen={isMobileMenuOpen}
              onToggleMobileMenu={() => setIsMobileMenuOpen((open) => !open)}
            />
          </div>

          {isMobileMenuOpen && (
            <div
              className="md:hidden fixed inset-0 z-40 bg-black/40"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          <main
            className="flex min-h-screen w-full flex-col overflow-x-hidden py-3 pb-8 md:pl-64 md:py-6"
            style={{ backgroundColor: ownerTheme.bg }}
          >
            <div className="mx-auto mb-5 w-full max-w-7xl flex-1 px-3 sm:mb-0 md:px-6 lg:px-8">
              {children}
            </div>
            <SubscriptionAccessPrompt />
          </main>
        </div>
      </div>
    </div>
  );
}
