'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Footer from './Footer';

export default function ConditionalFooter() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  // Track page loading state
  useEffect(() => {
    // Set loading to false when pathname changes (page navigation)
    setIsLoading(true);

    // Wait for page to load
    const handleLoad = () => {
      setIsLoading(false);
    };

    // If page is already loaded
    if (document.readyState === 'complete') {
      setIsLoading(false);
    } else {
      window.addEventListener('load', handleLoad);
    }

    // Also set loading to false after a short delay to handle client-side navigation
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => {
      window.removeEventListener('load', handleLoad);
      clearTimeout(timer);
    };
  }, [pathname]);

  // Hide footer on map page
  if (pathname === '/map') {
    return null;
  }

  // Claim / invite / class deep-link landings — no marketing footer
  if (
    pathname.includes('/studio-claim/') ||
    pathname.includes('/trainer-invite/') ||
    /\/class(\/|$|\?)/.test(pathname)
  ) {
    return null;
  }

  // Auth pages use ClientAuthShell mini-footer
  if (
    /\/login(\/|$|\?)/.test(pathname) ||
    pathname.includes('/register') ||
    pathname.includes('/forgot-password') ||
    pathname.includes('/check-email')
  ) {
    return null;
  }

  // Hide footer on admin and owner panel pages (they have their own footers in layout)
  if (
    pathname.includes('/admin') ||
    pathname.includes('/admin-panel') ||
    pathname.includes('/salons-data') ||
    pathname.includes('/bookings') ||
    pathname.includes('/owner-dashboard') ||
    pathname.includes('/calendar') ||
    pathname.includes('/services') ||
    pathname.includes('/trainings') ||
    pathname.includes('/staff') ||
    pathname.includes('/clients') ||
    pathname.includes('/analytics') ||
    pathname.includes('/subscription') ||
    pathname.includes('/salon-info') ||
    pathname.includes('/profile-settings') ||
    pathname.includes('/business/complete-setup') ||
    pathname.includes('/activity') ||
    pathname.includes('/favorites') ||
    /\/profile(\/|$)/.test(pathname)
  ) {
    return null;
  }

  // Hide footer during page loading
  if (isLoading) {
    return null;
  }

  return <Footer />;
}
