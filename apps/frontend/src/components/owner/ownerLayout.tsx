'use client';

import { ReactNode, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { stripLocaleFromPath } from '@/i18n/routing';
import OwnerHeader from './ownerHeader';
import OwnerSidebar from './ownerSidebar';

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
    return <div className="min-h-screen bg-[#F2F5F7] w-full">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#fff7f6] w-full overflow-x-hidden">
      <div className="flex">
        <div className="hidden md:block fixed left-0 top-0 h-full z-90">
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
          <div className="md:sticky md:top-0 md:z-40">
            <OwnerHeader />
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden fixed top-2 right-2 z-[999] bg-white shadow-lg rounded-lg p-2 border border-gray-200"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-gray-700" />
            ) : (
              <Menu className="w-5 h-5 text-gray-700" />
            )}
          </button>

          {isMobileMenuOpen && (
            <div
              className="md:hidden fixed inset-0 bg-black/60 z-40"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          <main className="py-2 md:py-8 pb-0 w-full overflow-x-hidden md:pl-64 flex flex-col min-h-screen bg-[#F2F5F7]">
            <div className="flex-1 mb-5 sm:mb-0 px-3 md:px-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
