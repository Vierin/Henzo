'use client';

import { ReactNode, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { clientTheme } from '@/lib/client-panel/client-theme';
import ClientHeader from './clientHeader';
import ClientSidebar from './clientSidebar';

export default function ClientLayoutShell({
  children,
}: {
  children: ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div
      className="client-panel min-h-screen w-full overflow-x-hidden font-wix-madefor-display"
      style={{ backgroundColor: clientTheme.bg, color: clientTheme.text }}
    >
      <div className="flex">
        <div className="fixed left-0 top-0 z-90 hidden h-full md:block">
          <ClientSidebar />
        </div>

        <div
          className={`fixed inset-y-0 left-0 z-[300] transform transition-transform duration-300 ease-in-out md:hidden ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <ClientSidebar
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          />
        </div>

        <div className="w-full flex-1">
          <div className="md:sticky md:top-0 md:z-40 md:pl-64">
            <ClientHeader />
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="fixed right-3 top-3 z-[999] rounded-xl border bg-white p-2 shadow-sm md:hidden"
            style={{ borderColor: clientTheme.borderSoft }}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" style={{ color: clientTheme.text }} />
            ) : (
              <Menu className="h-5 w-5" style={{ color: clientTheme.text }} />
            )}
          </button>

          {isMobileMenuOpen ? (
            <div
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          ) : null}

          <main
            className="flex min-h-screen w-full flex-col overflow-x-hidden py-3 pb-8 md:pl-64 md:py-6"
            style={{ backgroundColor: clientTheme.bg }}
          >
            <div className="mx-auto mb-5 w-full max-w-7xl flex-1 px-3 sm:mb-0 md:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
